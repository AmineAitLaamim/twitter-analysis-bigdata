"""
Spark Structured Streaming Job — Member 3
==========================================
Reads raw tweets from Kafka 'raw-tweets' topic every 10 seconds,
enriches them with sentiment analysis, and:
  1. Publishes enriched tweets to 'processed-tweets' Kafka topic
  2. Writes trending hashtag counts to HBase analytics table
  3. Writes sentiment breakdown to HBase analytics table
  4. Writes viral tweets (likes > 1000) to HBase analytics table

Uses Spark 3.5.0 Structured Streaming API (not legacy DStream).

Sentiment analysis runs on the driver (not workers) to avoid
requiring textblob to be installed on every Spark worker node.

Environment variables (set via docker-compose / .env):
  KAFKA_HOST  (default: kafka)
  KAFKA_PORT  (default: 9092)
  HBASE_HOST  (default: hbase)
  HBASE_PORT  (default: 9090)
"""

import os
import json
import logging

from pyspark.sql import SparkSession
from pyspark.sql.functions import (
    from_json, col, explode, count
)
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    LongType, ArrayType
)

import happybase
from kafka import KafkaProducer
from sentiment import analyze

# ── Configuration ───────────────────────────────────────────────────
KAFKA_HOST = os.environ.get('KAFKA_HOST', 'kafka')
KAFKA_PORT = os.environ.get('KAFKA_PORT', '9092')
HBASE_HOST = os.environ.get('HBASE_HOST', 'hbase')
HBASE_PORT = os.environ.get('HBASE_PORT', '9090')
SPARK_MASTER = os.environ.get('SPARK_MASTER', 'spark://spark-master:7077')

KAFKA_BOOTSTRAP = f'{KAFKA_HOST}:{KAFKA_PORT}'
VIRAL_THRESHOLD = 1000  # likes above this = viral

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('streaming_job')

# ── Tweet JSON Schema ───────────────────────────────────────────────
# Must match the simulator output from Member 2
TWEET_SCHEMA = StructType([
    StructField('tweet_id',  StringType(),        True),
    StructField('user_id',   StringType(),        True),
    StructField('text',      StringType(),        True),
    StructField('hashtags',  ArrayType(StringType()), True),
    StructField('likes',     IntegerType(),       True),
    StructField('retweets',  IntegerType(),       True),
    StructField('timestamp', LongType(),          True),
    StructField('location',  StringType(),        True),
])


# ── HBase Writer ────────────────────────────────────────────────────
def write_to_hbase(batch_df, batch_id):
    """Process each micro-batch: write analytics to HBase and
    publish enriched tweets to Kafka processed-tweets topic.

    Sentiment analysis runs here on the driver so we don't need
    textblob installed on every Spark worker node.

    Called by foreachBatch every 10 seconds.
    """
    if batch_df.rdd.isEmpty():
        logger.info(f'Batch {batch_id}: empty, skipping')
        return

    # Collect raw rows to driver first
    raw_rows = batch_df.collect()
    row_count = len(raw_rows)
    logger.info(f'Batch {batch_id}: processing {row_count} tweets')

    # ── Enrich with sentiment on the driver ────────────────────────
    enriched_rows = []
    for row in raw_rows:
        text = row.text
        sent = analyze(text) if text else {'sentiment': 'neutral', 'sentiment_score': 0.0}
        enriched_rows.append({
            'tweet_id':        row.tweet_id,
            'user_id':         row.user_id,
            'text':            row.text,
            'hashtags':        row.hashtags,
            'likes':           row.likes,
            'retweets':        row.retweets,
            'timestamp':       row.timestamp,
            'location':        row.location,
            'sentiment':       sent['sentiment'],
            'sentiment_score': sent['sentiment_score'],
        })

    # ── 1. Publish enriched tweets to Kafka processed-tweets ────────
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

        for tweet in enriched_rows:
            producer.send('processed-tweets', tweet)

        producer.flush()
        producer.close()
        logger.info(f'Batch {batch_id}: published {len(enriched_rows)} tweets to processed-tweets')
    except Exception as e:
        logger.error(f'Batch {batch_id}: failed to publish to Kafka: {e}')

    # ── 2. Write analytics to HBase ─────────────────────────────────
    try:
        conn = happybase.Connection(HBASE_HOST, port=int(HBASE_PORT))
        analytics_table = conn.table('analytics')

        # ── 2a. Trending hashtags ───────────────────────────────────
        # Compute hashtag counts from enriched data on the driver
        hashtag_counts = {}
        for tweet in enriched_rows:
            for tag in (tweet['hashtags'] or []):
                if tag:
                    hashtag_counts[tag] = hashtag_counts.get(tag, 0) + 1

        if hashtag_counts:
            tag_data = {}
            for tag, cnt in hashtag_counts.items():
                col_name = f'data:{tag}'.encode()
                tag_data[col_name] = str(cnt).encode()
            analytics_table.put(b'trending_latest', tag_data)
            logger.info(f'Batch {batch_id}: wrote {len(hashtag_counts)} hashtag counts to trending_latest')

        # ── 2b. Sentiment breakdown ─────────────────────────────────
        sentiment_counts = {}
        for tweet in enriched_rows:
            s = tweet['sentiment']
            sentiment_counts[s] = sentiment_counts.get(s, 0) + 1

        if sentiment_counts:
            sent_data = {}
            for label, cnt in sentiment_counts.items():
                col_name = f'data:{label}'.encode()
                sent_data[col_name] = str(cnt).encode()
            analytics_table.put(b'sentiment_latest', sent_data)
            logger.info(f'Batch {batch_id}: wrote sentiment breakdown to sentiment_latest: {sentiment_counts}')

        # ── 2c. Viral tweets (likes > threshold) ────────────────────
        viral_rows = [t for t in enriched_rows if t['likes'] > VIRAL_THRESHOLD]

        for tweet in viral_rows:
            row_key = f"viral_{tweet['tweet_id']}".encode()
            analytics_table.put(row_key, {
                b'data:text':    tweet['text'].encode() if tweet['text'] else b'',
                b'data:likes':   str(tweet['likes']).encode(),
                b'data:user_id': tweet['user_id'].encode() if tweet['user_id'] else b'',
            })

        if viral_rows:
            logger.info(f'Batch {batch_id}: wrote {len(viral_rows)} viral tweets')

        conn.close()

    except Exception as e:
        logger.error(f'Batch {batch_id}: failed to write to HBase: {e}')


# ── Main ────────────────────────────────────────────────────────────
def main():
    """Entry point: create Spark session, set up streaming, and run."""

    logger.info('Starting Spark Streaming job...')
    logger.info(f'Kafka: {KAFKA_BOOTSTRAP}')
    logger.info(f'HBase: {HBASE_HOST}:{HBASE_PORT}')
    logger.info(f'Spark Master: {SPARK_MASTER}')

    # ── Create SparkSession ─────────────────────────────────────────
    spark = (
        SparkSession.builder
        .appName('TwitterStreamingAnalytics')
        .master(SPARK_MASTER)
        .config('spark.jars.packages',
                'org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0')
        .config('spark.sql.streaming.forceDeleteTempCheckpointLocation', 'true')
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel('WARN')
    logger.info('SparkSession created')

    # ── Read from Kafka raw-tweets ──────────────────────────────────
    raw_stream = (
        spark.readStream
        .format('kafka')
        .option('kafka.bootstrap.servers', KAFKA_BOOTSTRAP)
        .option('subscribe', 'raw-tweets')
        .option('startingOffsets', 'latest')
        .option('failOnDataLoss', 'false')
        .load()
    )

    # ── Parse JSON ──────────────────────────────────────────────────
    # Kafka gives us key (binary) + value (binary)
    # We parse value as JSON string → struct
    tweets_df = (
        raw_stream
        .selectExpr('CAST(value AS STRING) as json_str')
        .select(from_json(col('json_str'), TWEET_SCHEMA).alias('tweet'))
        .select('tweet.*')
    )

    # ── Start streaming with foreachBatch ───────────────────────────
    # Sentiment enrichment happens inside write_to_hbase on the driver
    # so workers don't need textblob installed.
    query = (
        tweets_df.writeStream
        .foreachBatch(write_to_hbase)
        .trigger(processingTime='10 seconds')
        .option('checkpointLocation', '/tmp/spark-streaming-checkpoint')
        .start()
    )

    logger.info('Streaming query started, awaiting termination...')
    query.awaitTermination()


if __name__ == '__main__':
    main()