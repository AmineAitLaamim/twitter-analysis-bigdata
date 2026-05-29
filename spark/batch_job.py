"""
Spark Batch Job — Member 4
==========================
Runs every hour (triggered by scheduler.py).
Reads the last hour of tweets from HBase 'tweets' table,
runs deeper analysis with Spark, and writes results to:
  1. HBase 'analytics' table  — trending hashtags + geo breakdown (hourly + latest)
  2. HBase 'users' table      — tweet counts + likes per user

Environment variables (set via docker-compose / .env):
  HBASE_HOST   (default: hbase)
  HBASE_PORT   (default: 9090)
  SPARK_MASTER (default: spark://spark-master:7077)
"""

import os
import logging
from datetime import datetime, timedelta

from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, col, count, sum as _sum, desc

import happybase

# ── Configuration ────────────────────────────────────────────────────
HBASE_HOST   = os.environ.get('HBASE_HOST',   'hbase')
HBASE_PORT   = int(os.environ.get('HBASE_PORT', '9090'))
SPARK_MASTER = os.environ.get('SPARK_MASTER', 'spark://spark-master:7077')

TOP_HASHTAGS_LIMIT = 10
TOP_USERS_LIMIT    = 20

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [batch_job] %(levelname)s — %(message)s'
)
logger = logging.getLogger('batch_job')


# ── Helper: parse row key ─────────────────────────────────────────────
def parse_row_key(raw_key: bytes):
    """
    Row key format (from SCHEMA.md): {salt}_{user_id}_{reversed_timestamp}
    Example: '3_user_42853_9999781234567'

    Returns (user_id, reversed_ts) or (None, None) on error.
    """
    try:
        parts = raw_key.decode().split('_')
        # parts[0] = salt
        # parts[1] = "user"
        # parts[2] = numeric ID
        # parts[3] = reversed_timestamp
        user_id  = f"{parts[1]}_{parts[2]}"   # → "user_42853"
        rev_ts   = int(parts[3])
        return user_id, rev_ts
    except Exception:
        return None, None


# ── Step 1: Read last hour of tweets from HBase ───────────────────────
def read_last_hour(conn: happybase.Connection) -> list:
    """
    Scan the 'tweets' table and return only rows from the last hour.

    Reversed timestamp means rows written MORE RECENTLY have a SMALLER
    reversed_ts value.  Rows written more than 1 hour ago have a
    reversed_ts LARGER than cutoff_rev_ts.

    cutoff_rev_ts = 9_999_999_999_999 - cutoff_epoch_ms
    We want rows where rev_ts <= cutoff_rev_ts  →  timestamp >= cutoff_epoch_ms
    """
    cutoff_epoch_ms = int(
        (datetime.now() - timedelta(hours=1)).timestamp() * 1000
    )
    cutoff_rev_ts = 9_999_999_999_999 - cutoff_epoch_ms

    logger.info(f'Scanning tweets table for last hour (cutoff rev_ts <= {cutoff_rev_ts})')

    table = conn.table('tweets')
    rows  = []

    for raw_key, data in table.scan():
        user_id, rev_ts = parse_row_key(raw_key)
        if user_id is None:
            continue
        # Keep only tweets from the last hour
        if rev_ts > cutoff_rev_ts:
            continue

        hashtags_raw = data.get(b'content:hashtags', b'').decode()
        hashtags     = [h for h in hashtags_raw.split(',') if h]

        rows.append({
            'user_id':   user_id,
            'hashtags':  hashtags,
            'likes':     int(data.get(b'meta:likes',    b'0')),
            'retweets':  int(data.get(b'meta:retweets', b'0')),
            'location':  data.get(b'meta:location',     b'').decode(),
            'sentiment': data.get(b'analysis:sentiment', b'neutral').decode(),
        })

    logger.info(f'Read {len(rows)} tweets from the last hour')
    return rows


# ── Step 2: Spark analysis ────────────────────────────────────────────
def run_analysis(spark: SparkSession, rows: list):
    """
    Run three Spark aggregations:
      - Top hashtags
      - Sentiment breakdown by country (geo)
      - Most active users (tweet count + total likes)

    Returns (top_tags_df, geo_df, top_users_df).
    """
    if not rows:
        logger.warning('No rows to analyze — returning empty DataFrames')
        from pyspark.sql.types import StructType
        empty = spark.createDataFrame([], StructType([]))
        return empty, empty, empty

    df = spark.createDataFrame(rows)
    df.createOrReplaceTempView('tweets')
    logger.info(f'Created Spark DataFrame with {df.count()} rows')

    # ── Top 10 hashtags ──────────────────────────────────────────────
    top_tags = (
        df
        .select(explode(col('hashtags')).alias('hashtag'))
        .groupBy('hashtag')
        .agg(count('*').alias('cnt'))
        .orderBy(desc('cnt'))
        .limit(TOP_HASHTAGS_LIMIT)
    )
    logger.info('Computed top hashtags')

    # ── Sentiment by country ─────────────────────────────────────────
    geo = spark.sql("""
        SELECT location, sentiment, COUNT(*) AS cnt
        FROM tweets
        WHERE location != ''
        GROUP BY location, sentiment
    """)
    logger.info('Computed geo/sentiment breakdown')

    # ── Most active users ────────────────────────────────────────────
    top_users = spark.sql(f"""
        SELECT
            user_id,
            COUNT(*)    AS tweet_count,
            SUM(likes)  AS total_likes
        FROM tweets
        GROUP BY user_id
        ORDER BY tweet_count DESC
        LIMIT {TOP_USERS_LIMIT}
    """)
    logger.info('Computed top users')

    return top_tags, geo, top_users


# ── Step 3: Write analytics to HBase ─────────────────────────────────
def write_analytics(conn: happybase.Connection, top_tags, geo, bucket: str):
    """
    Write to HBase 'analytics' table:
      - trending_{YYYYMMDDHH}  — hourly snapshot of top hashtags
      - trending_latest        — overwrite with latest top hashtags
      - geo_{location}_{bucket} — per-country sentiment for this hour
      - geo_latest             — aggregate tweet count per country
    """
    atbl = conn.table('analytics')

    # ── Trending hashtags ────────────────────────────────────────────
    tag_rows = top_tags.collect()

    if tag_rows:
        tag_data = {
            f'data:{r["hashtag"]}'.encode(): str(r['cnt']).encode()
            for r in tag_rows
        }
        # Hourly snapshot
        atbl.put(f'trending_{bucket}'.encode(), tag_data)
        # Latest (overwrite)
        atbl.put(b'trending_latest', tag_data)
        logger.info(f'Wrote {len(tag_rows)} hashtags → trending_{bucket} + trending_latest')
    else:
        logger.warning('No hashtag data to write')

    # ── Geo + sentiment breakdown ────────────────────────────────────
    geo_latest = {}
    geo_rows   = geo.collect()

    for r in geo_rows:
        location  = r['location']
        sentiment = r['sentiment']
        cnt       = r['cnt']

        # Per-location hourly row  e.g.  geo_US_2024010114
        row_key  = f'geo_{location}_{bucket}'.encode()
        col_name = f'data:{sentiment}'.encode()
        atbl.put(row_key, {col_name: str(cnt).encode()})

        # Accumulate total count per country for geo_latest
        key = f'data:{location}'.encode()
        geo_latest[key] = str(
            int(geo_latest.get(key, b'0')) + cnt
        ).encode()

    if geo_latest:
        atbl.put(b'geo_latest', geo_latest)
        logger.info(f'Wrote geo data for {len(geo_latest)} countries → geo_latest')
    else:
        logger.warning('No geo data to write')


# ── Step 4: Update users table ────────────────────────────────────────
def write_users(conn: happybase.Connection, top_users, bucket: str):
    """
    Update HBase 'users' table with aggregated stats from this batch.
    Column names follow SCHEMA.md exactly:
      stats:tweet_count   — total tweets this hour
      stats:total_likes   — total likes this hour
      activity:last_seen  — time bucket of last batch run
    """
    utbl      = conn.table('users')
    user_rows = top_users.collect()

    for r in user_rows:
        utbl.put(
            r['user_id'].encode(),
            {
                b'stats:tweet_count':  str(r['tweet_count']).encode(),
                b'stats:total_likes':  str(r['total_likes']).encode(),
                b'activity:last_seen': bucket.encode(),
            }
        )

    logger.info(f'Updated {len(user_rows)} users in users table')


# ── Main ──────────────────────────────────────────────────────────────
def main():
    bucket = datetime.now().strftime('%Y%m%d%H')   # e.g. "2024010114"
    logger.info(f'=== Batch job starting — bucket: {bucket} ===')
    logger.info(f'HBase: {HBASE_HOST}:{HBASE_PORT}')
    logger.info(f'Spark Master: {SPARK_MASTER}')

    # ── Connect to HBase ─────────────────────────────────────────────
    conn = happybase.Connection(HBASE_HOST, port=HBASE_PORT)
    logger.info('Connected to HBase')

    # ── Read tweets ──────────────────────────────────────────────────
    rows = read_last_hour(conn)

    if not rows:
        logger.warning('No tweets found in the last hour — exiting early')
        conn.close()
        return

    # ── Create Spark session ─────────────────────────────────────────
    spark = (
        SparkSession.builder
        .appName('BatchAnalytics')
        .master(SPARK_MASTER)
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel('WARN')
    logger.info('SparkSession created')

    # ── Run analysis ─────────────────────────────────────────────────
    top_tags, geo, top_users = run_analysis(spark, rows)

    # ── Write results ────────────────────────────────────────────────
    write_analytics(conn, top_tags, geo, bucket)
    write_users(conn, top_users, bucket)

    # ── Cleanup ──────────────────────────────────────────────────────
    conn.close()
    spark.stop()
    logger.info(f'=== Batch job done — bucket: {bucket}, tweets processed: {len(rows)} ===')


if __name__ == '__main__':
    main()