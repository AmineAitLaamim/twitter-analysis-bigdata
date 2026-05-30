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
    from_json, col, udf, explode, count, struct, to_json, lit
)
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    LongType, ArrayType, FloatType
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


# ── Sentiment UDF ───────────────────────────────────────────────────
def _sentiment_label(text):
    """Extract sentiment label from text."""
    if text is None:
        return 'neutral'
    return analyze(text)['sentiment']


def _sentiment_score(text):
    """Extract sentiment score from text."""
    if text is None:
        return 0.0
    return float(analyze(text)['sentiment_score'])


sentiment_label_udf = udf(_sentiment_label, StringType())
sentiment_score_udf = udf(_sentiment_score, FloatType())


# ── HBase Writer ────────────────────────────────────────────────────
def write_to_hbase(batch_df, batch_id):
    """Process each micro-batch: write analytics to HBase and
    publish enriched tweets to Kafka processed-tweets topic.

    Called by foreachBatch every 10 seconds.
    """
    if batch_df.rdd.isEmpty():
        logger.info(f'Batch {batch_id}: empty, skipping')
        return

    row_count = batch_df.count()
    logger.info(f'Batch {batch_id}: processing {row_count} tweets')

    # ── 1. Publish enriched tweets to Kafka processed-tweets ────────
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

        enriched_rows = batch_df.collect()
        for row in enriched_rows:
            tweet = {
                'tweet_id':        row.tweet_id,
                'user_id':         row.user_id,
                'text':            row.text,
                'hashtags':        row.hashtags,
                'likes':           row.likes,
                'retweets':        row.retweets,
                'timestamp':       row.timestamp,
                'location':        row.location,
                'sentiment':       row.sentiment,
                'sentiment_score': row.sentiment_score,
            }
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
        hashtag_rows = (
            batch_df
            .select(explode(col('hashtags')).alias('hashtag'))
            .groupBy('hashtag')
            .agg(count('*').alias('cnt'))
            .collect()
        )

        if hashtag_rows:
            tag_data = {}
            for row in hashtag_rows:
                col_name = f'data:{row.hashtag}'.encode()
                tag_data[col_name] = str(row.cnt).encode()
            analytics_table.put(b'trending_latest', tag_data)
            logger.info(f'Batch {batch_id}: wrote {len(hashtag_rows)} hashtag counts to trending_latest')

        # ── 2b. Sentiment breakdown ─────────────────────────────────
        sentiment_rows = (
            batch_df
            .groupBy('sentiment')
            .agg(count('*').alias('cnt'))
            .collect()
        )

        if sentiment_rows:
            sent_data = {}
            for row in sentiment_rows:
                col_name = f'data:{row.sentiment}'.encode()
                sent_data[col_name] = str(row.cnt).encode()
            analytics_table.put(b'sentiment_latest', sent_data)
            logger.info(f'Batch {batch_id}: wrote sentiment breakdown to sentiment_latest')

        # ── 2c. Viral tweets (likes > threshold) ────────────────────
        viral_rows = batch_df.filter(col('likes') > VIRAL_THRESHOLD).collect()

        for row in viral_rows:
            row_key = f"viral_{row.tweet_id}".encode()
            analytics_table.put(row_key, {
                b'data:text':    row.text.encode() if row.text else b'',
                b'data:likes':   str(row.likes).encode(),
                b'data:user_id': row.user_id.encode() if row.user_id else b'',
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

    # ── Enrich with sentiment ───────────────────────────────────────
    enriched_df = (
        tweets_df
        .withColumn('sentiment',       sentiment_label_udf(col('text')))
        .withColumn('sentiment_score', sentiment_score_udf(col('text')))
    )

    # ── Start streaming with foreachBatch ───────────────────────────
    # Process every 10 seconds
    query = (
        enriched_df.writeStream
        .foreachBatch(write_to_hbase)
        .trigger(processingTime='10 seconds')
        .option('checkpointLocation', '/tmp/spark-streaming-checkpoint')
        .start()
    )

    logger.info('Streaming query started, awaiting termination...')
    query.awaitTermination()


if __name__ == '__main__':
    main()
