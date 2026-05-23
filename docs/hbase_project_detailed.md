# Real-Time Social Media Analytics Platform — Full Technical Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Full Architecture](#2-full-architecture)
3. [Component 1 — Tweet Simulator](#3-component-1--tweet-simulator)
4. [Component 2 — Apache Kafka](#4-component-2--apache-kafka)
5. [Component 3 — Apache HBase](#5-component-3--apache-hbase)
6. [Component 4 — Apache Spark](#6-component-4--apache-spark)
7. [Component 5 — FastAPI Backend](#7-component-5--fastapi-backend)
8. [Component 6 — React Dashboard](#8-component-6--react-dashboard)
9. [Full Data Flow — Step by Step](#9-full-data-flow--step-by-step)
10. [Team Responsibilities & Integration Points](#10-team-responsibilities--integration-points)
11. [Docker Setup](#11-docker-setup)
12. [Timeline](#12-timeline)

---

## 1. Project Overview

We are building a system that simulates a social media platform (like Twitter), ingests millions of posts in real time, analyzes them (trending topics, sentiment, user activity), and displays the results on a live web dashboard.

### Why each tool is chosen

| Tool | Why it's used here |
|---|---|
| **Kafka** | Handles high-speed data ingestion without overwhelming the database |
| **HBase** | Stores billions of rows with fast lookups — built for this scale |
| **Spark** | Processes and analyzes data in real time across multiple machines |
| **FastAPI** | Lightweight Python API that reads from HBase and serves the frontend |
| **React** | Interactive dashboard with live charts and maps |

---

## 2. Full Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCE                                 │
│                   Python Tweet Simulator                            │
│         Generates 1,000–10,000 fake tweets per second               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  (KafkaProducer sends to topic)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APACHE KAFKA                                   │
│                                                                     │
│   Topic: raw-tweets         ← all incoming tweets land here         │
│   Topic: processed-tweets   ← after Spark adds sentiment score      │
│   Topic: trending-alerts    ← viral tweet notifications             │
│                                                                     │
│   3 Partitions per topic → parallel processing                      │
└────────────┬────────────────────────────────┬───────────────────────┘
             │                                │
             │ (Consumer Group A)             │ (Consumer Group B)
             ▼                                ▼
┌────────────────────────┐      ┌─────────────────────────────────────┐
│   HBase Direct Writer  │      │         APACHE SPARK                │
│   (Team 1)             │      │                                     │
│                        │      │   Spark Streaming (every 10s):      │
│   Saves raw tweets     │      │   - Sentiment analysis              │
│   to tweets table      │      │   - Hashtag counting                │
│   as they arrive       │      │   - Viral detection                 │
└────────────────────────┘      │                                     │
                                │   Spark Batch (every 1h):           │
                                │   - Deep trend analysis             │
                                │   - Geo breakdown                   │
                                │   - User rankings                   │
                                └──────────────┬──────────────────────┘
                                               │ (writes aggregates)
                                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        APACHE HBASE                                 │
│                                                                     │
│   Table: tweets       ← every individual tweet                      │
│   Table: users        ← user profiles and stats                     │
│   Table: hashtags     ← per-hashtag usage over time                 │
│   Table: analytics    ← pre-aggregated metrics (Spark writes here)  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ (happybase client reads)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FASTAPI                                     │
│                                                                     │
│   REST API — reads from HBase, serves JSON to the frontend          │
│   Runs on port 8000                                                 │
│   Auto docs at /docs                                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ (HTTP / WebSocket)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      REACT DASHBOARD                                │
│                                                                     │
│   Page 1: Live tweet feed                                           │
│   Page 2: Trending hashtags (bar chart)                             │
│   Page 3: Sentiment over time (line + donut chart)                  │
│   Page 4: Geographic activity (world map)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component 1 — Tweet Simulator

### What it is

Since we cannot access the real Twitter API freely, we build a Python script that generates realistic fake tweets at high speed and pushes them into Kafka.

### What a tweet looks like

```json
{
  "tweet_id":  "a3f2c1d4-...",
  "user_id":   "user_48291",
  "text":      "Really enjoying #BigData today, the tools are amazing!",
  "hashtags":  ["#BigData", "#Tech"],
  "likes":     342,
  "retweets":  87,
  "timestamp": 1704067200000,
  "location":  "MA"
}
```

### Full simulator code

```python
import json
import random
import time
import uuid
from kafka import KafkaProducer

# Connect to Kafka
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Data pools for realistic generation
HASHTAGS = [
    '#BigData', '#AI', '#Python', '#HBase', '#Kafka',
    '#MachineLearning', '#Tech', '#NBA', '#Climate', '#Gaming',
    '#WorldCup', '#OpenAI', '#Morocco', '#DataScience', '#Cloud'
]

LOCATIONS = ['US', 'UK', 'FR', 'MA', 'JP', 'BR', 'DE', 'IN', 'CA', 'AU']

TWEET_TEMPLATES = [
    "Really enjoying {tag} today, the tools are amazing!",
    "Just learned about {tag} — mind blown.",
    "{tag} is completely broken right now, so frustrated.",
    "Can't stop reading about {tag}. Highly recommend.",
    "Hot take: {tag} is overrated.",
    "Working on a {tag} project and loving it.",
    "Anyone else following {tag} closely today?",
    "{tag} will change everything in the next 5 years.",
]

def generate_tweet():
    tag = random.choice(HASHTAGS)
    extra_tags = random.sample(HASHTAGS, k=random.randint(0, 2))
    all_tags = list(set([tag] + extra_tags))
    text = random.choice(TWEET_TEMPLATES).format(tag=tag)

    return {
        "tweet_id":  str(uuid.uuid4()),
        "user_id":   f"user_{random.randint(1, 100_000)}",
        "text":      text,
        "hashtags":  all_tags,
        "likes":     random.randint(0, 5000),
        "retweets":  random.randint(0, 1000),
        "timestamp": int(time.time() * 1000),  # milliseconds
        "location":  random.choice(LOCATIONS)
    }

# Send 1000 tweets/second
print("Tweet simulator started...")
while True:
    tweet = generate_tweet()
    producer.send('raw-tweets', tweet)
    time.sleep(0.001)  # 1ms delay = ~1000/sec
```

### What Team 1 needs to do with this

- Run this script continuously during demos
- Tune the `time.sleep` value to control throughput (lower = more tweets/sec)
- Can run multiple instances in parallel to simulate even higher load

---

## 4. Component 2 — Apache Kafka

### What Kafka actually is

Kafka is a **distributed commit log**. When a producer sends a message, Kafka writes it to disk in a topic. Consumers then read from that topic independently, each keeping track of their own position (called an **offset**).

This means:
- Multiple consumers can read the same data at different speeds
- If a consumer crashes, it resumes from where it stopped — no data lost
- Kafka retains data for a configurable period (we use 24 hours) so replays are possible

### Core concepts explained

#### Topics
A topic is a named stream of messages. Think of it as a category.

```
Topic: raw-tweets        ← every tweet the simulator produces lands here
Topic: processed-tweets  ← Spark reads raw-tweets, adds sentiment, publishes here
Topic: trending-alerts   ← Spark publishes a message when a tweet goes viral
```

#### Partitions
Each topic is split into partitions. Partitions enable parallelism.

```
Topic: raw-tweets (3 partitions)

Partition 0: [tweet_A] [tweet_B] [tweet_C] ...
Partition 1: [tweet_D] [tweet_E] [tweet_F] ...
Partition 2: [tweet_G] [tweet_H] [tweet_I] ...

3 consumers can each read one partition simultaneously → 3× throughput
```

The tweet simulator assigns tweets to partitions by hashing the `user_id` — so all tweets from the same user always go to the same partition (preserving order per user).

#### Consumer Groups
Two different components need to read the same tweets: the HBase Writer (Team 1) and Spark (Team 3). Kafka handles this with consumer groups.

```
raw-tweets topic
      │
      ├──► Consumer Group A (hbase-writer-group)
      │         └── Reads every tweet → writes to HBase tweets table
      │
      └──► Consumer Group B (spark-group)
                └── Reads every tweet → runs analytics
```

Each group gets a **full copy** of the data. They don't interfere with each other.

#### Offsets
Kafka remembers where each consumer group stopped reading. If Spark crashes at offset 5000 and restarts, it resumes at 5001 — no tweets are skipped or duplicated.

```
Partition 0:  [0][1][2][3][4][5000][5001][5002]...
                                     ↑
                              Spark resumes here after crash
```

### Kafka setup — topics to create

```bash
# Create topics with 3 partitions and replication factor 1 (local dev)
kafka-topics.sh --create --topic raw-tweets \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1

kafka-topics.sh --create --topic processed-tweets \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1

kafka-topics.sh --create --topic trending-alerts \
  --bootstrap-server localhost:9092 \
  --partitions 1 --replication-factor 1
```

### Kafka consumer → HBase writer (Team 1's second job)

```python
import json
import happybase
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'processed-tweets',           # reads AFTER Spark adds sentiment
    bootstrap_servers='localhost:9092',
    group_id='hbase-writer-group',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest'  # start from beginning if no offset saved
)

connection = happybase.Connection('localhost', port=9090)
table = connection.table('tweets')

for message in consumer:
    tweet = message.value

    # Row key design (explained in HBase section)
    salt = hash(tweet['user_id']) % 10
    reversed_ts = 9_999_999_999_999 - tweet['timestamp']
    row_key = f"{salt}_{tweet['user_id']}_{reversed_ts}"

    table.put(row_key.encode(), {
        b'content:text':       tweet['text'].encode(),
        b'content:hashtags':   ','.join(tweet['hashtags']).encode(),
        b'meta:likes':         str(tweet['likes']).encode(),
        b'meta:retweets':      str(tweet['retweets']).encode(),
        b'meta:location':      tweet['location'].encode(),
        b'analysis:sentiment': tweet['sentiment'].encode(),
        b'analysis:score':     str(tweet['sentiment_score']).encode(),
    })
```

---

## 5. Component 3 — Apache HBase

### What HBase actually is

HBase is a **column-family NoSQL database** that runs on top of HDFS (Hadoop's distributed file system). Unlike MySQL or PostgreSQL:

- No fixed schema per row — different rows can have different columns
- Rows are sorted by row key (lexicographic order) — row key design is critical
- Designed for billions of rows and millions of columns
- Fast reads by row key; slower for full-table scans
- No SQL by default (you use the Java/Python API, or Apache Phoenix for SQL)

### How HBase stores data

```
Table: tweets

RowKey                    | content:text              | meta:likes | analysis:sentiment
──────────────────────────────────────────────────────────────────────────────────────
3_user_48291_9999997823   | "BigData is amazing!"     | 342        | positive
3_user_48291_9999997800   | "HBase row keys are fun"  | 12         | neutral
7_user_72011_9999997750   | "Kafka is frustrating"    | 88         | negative
```

Each cell has a timestamp internally (HBase versioning), but we also encode time into the row key for efficient range scans.

### Why row key design matters so much

HBase stores rows in **sorted order by row key**. When you scan a table, you scan from a start key to an end key. If your row key is designed wrong, every query becomes a full table scan — extremely slow.

#### The hotspot problem

If you use `timestamp` as the start of your row key:

```
Row key: 1704067200000_user_001   ← all "latest" writes go here
Row key: 1704067200001_user_002   ←
Row key: 1704067200002_user_003   ←
```

All new tweets have similar timestamps, so they all land in the **same HBase region** (same server). That one server gets 100% of the write traffic — it becomes a bottleneck. This is called a **hotspot**.

#### The solution: salting + reversed timestamp

```
salt = hash(user_id) % 10   →  gives a number 0–9
reversed_ts = 9_999_999_999_999 - actual_timestamp

Row key: {salt}_{user_id}_{reversed_ts}

Examples:
  3_user_48291_9999997823456   ← salt 3, most recent tweet
  3_user_48291_9999997823400   ← same user, older tweet
  7_user_72011_9999997750000   ← different user, goes to different region
```

**Salt** distributes writes across 10 different regions (servers) — 10× better write throughput.

**Reversed timestamp** means that when you scan by user (prefix `3_user_48291_`), you get newest tweets first — no need to sort after the scan.

### Full HBase schema

#### Table: `tweets`

```
Row key: {salt}_{user_id}_{reversed_timestamp}

Column family: content
  content:text       → the tweet text
  content:hashtags   → comma-separated hashtag list
  content:media_url  → image/video URL if present

Column family: meta
  meta:likes         → like count at time of storage
  meta:retweets      → retweet count
  meta:replies       → reply count
  meta:location      → country code (US, MA, FR...)

Column family: analysis
  analysis:sentiment       → "positive" / "neutral" / "negative"
  analysis:sentiment_score → float, e.g. 0.72 or -0.45
  analysis:language        → detected language code
```

**HBase shell commands to create this table:**
```
create 'tweets',
  {NAME => 'content', COMPRESSION => 'SNAPPY', BLOOMFILTER => 'ROW'},
  {NAME => 'meta',    COMPRESSION => 'SNAPPY'},
  {NAME => 'analysis',COMPRESSION => 'SNAPPY', TTL => 7776000}
```
TTL = 7,776,000 seconds = 90 days → old tweets auto-deleted.

#### Table: `users`

```
Row key: {user_id}    (e.g. user_48291)

Column family: profile
  profile:username   → display name
  profile:bio        → user bio
  profile:location   → city/country
  profile:join_date  → account creation date

Column family: stats
  stats:total_tweets → total tweet count (incremented by Spark)
  stats:followers    → follower count
  stats:following    → following count

Column family: activity
  activity:last_active      → timestamp of last tweet
  activity:avg_daily_tweets → 7-day average (Spark batch updates this)
```

#### Table: `hashtags`

```
Row key: {hashtag}_{reversed_timestamp}
Examples:
  #BigData_9999997823456   ← most recent entry for #BigData
  #BigData_9999997800000   ← older entry

Column family: counts
  counts:total_uses      → total times used (all time)
  counts:uses_last_hour  → Spark updates this every 10 minutes
  counts:uses_last_day   → Spark batch updates this hourly

Column family: engagement
  engagement:total_likes    → sum of likes on tweets with this hashtag
  engagement:total_retweets → sum of retweets

Column family: meta
  meta:first_seen  → timestamp when hashtag was first seen
  meta:peak_hour   → hour of day with most usage
```

#### Table: `analytics` (the most important for the dashboard)

This table stores pre-computed results. Spark writes here every 10 seconds (streaming) and every hour (batch). FastAPI reads from here — no heavy computation at query time.

```
Row key pattern: {metric_type}_{time_bucket}

Examples of row keys:
  trending_latest           ← current top hashtags (updated every 10s)
  trending_2024010114       ← top hashtags at hour 14 of Jan 1 2024
  sentiment_latest          ← current sentiment breakdown
  sentiment_2024010114      ← sentiment at hour 14
  geo_latest                ← current tweet volume by country
  volume_latest             ← tweets per minute, last hour
  viral_latest              ← currently viral tweets

Column family: data
  (varies by row — see Spark section for what gets written)
```

### Reading from HBase with Python (happybase)

```python
import happybase

connection = happybase.Connection('localhost', port=9090)

# --- Get a single row ---
table = connection.table('tweets')
row = table.row(b'3_user_48291_9999997823456')
print(row[b'content:text'].decode())   # "BigData is amazing!"

# --- Scan recent tweets for a user ---
for key, data in table.scan(
    row_prefix=b'3_user_48291_',   # all tweets from this user
    limit=20
):
    print(key.decode(), data[b'content:text'].decode())

# --- Get pre-aggregated analytics ---
analytics = connection.table('analytics')
row = analytics.row(b'trending_latest')
for col, val in row.items():
    tag = col.decode().replace('data:', '')
    print(f"{tag}: {val.decode()}")
```

---

## 6. Component 4 — Apache Spark

### What Spark actually is

Spark is a **distributed in-memory computation engine**. You write processing logic in Python (PySpark), and Spark automatically splits the work across multiple CPU cores or machines.

The key difference from plain Python:

```
Plain Python:
  1 million tweets → processed one by one on 1 CPU → takes 3 minutes

Spark (4 cores):
  1 million tweets → split into 4 chunks → each chunk processed in parallel
                  → takes ~45 seconds
```

For this project, Spark runs in two modes.

---

### Mode 1 — Spark Streaming (real-time, every 10 seconds)

Spark Streaming reads from Kafka in micro-batches. Every 10 seconds it pulls all tweets that arrived since the last batch and processes them.

#### Full Spark Streaming code

```python
from pyspark import SparkContext
from pyspark.streaming import StreamingContext
from pyspark.streaming.kafka import KafkaUtils
from textblob import TextBlob
import json
import happybase
import time

sc  = SparkContext("local[4]", "SocialMediaAnalytics")  # 4 CPU threads
ssc = StreamingContext(sc, batchDuration=10)            # 10-second micro-batches

# Connect to Kafka topic
tweets_stream = KafkaUtils.createStream(
    ssc,
    zk_quorum='localhost:2181',
    group_id='spark-group',
    topics={'raw-tweets': 1}   # 1 thread per partition
)

# ── Step 1: Parse JSON ──────────────────────────────────────────────
parsed = tweets_stream.map(lambda msg: json.loads(msg[1]))


# ── Step 2: Sentiment Analysis ─────────────────────────────────────
def add_sentiment(tweet):
    blob = TextBlob(tweet['text'])
    score = blob.sentiment.polarity   # -1.0 to +1.0

    if score > 0.1:
        label = 'positive'
    elif score < -0.1:
        label = 'negative'
    else:
        label = 'neutral'

    tweet['sentiment']       = label
    tweet['sentiment_score'] = round(score, 3)
    return tweet

enriched = parsed.map(add_sentiment)


# ── Step 3: Write enriched tweets to Kafka processed-tweets ────────
from kafka import KafkaProducer
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode()
)

def publish_enriched(tweet):
    producer.send('processed-tweets', tweet)

enriched.foreachRDD(lambda rdd: rdd.foreach(publish_enriched))


# ── Step 4: Count hashtags in this 10-second batch ─────────────────
hashtag_counts = (
    enriched
    .flatMap(lambda t: t['hashtags'])              # extract all hashtags
    .map(lambda h: (h, 1))                         # (hashtag, 1)
    .reduceByKey(lambda a, b: a + b)               # sum per hashtag
)


# ── Step 5: Count sentiment breakdown ──────────────────────────────
sentiment_counts = (
    enriched
    .map(lambda t: (t['sentiment'], 1))
    .reduceByKey(lambda a, b: a + b)
)


# ── Step 6: Detect viral tweets ────────────────────────────────────
viral_tweets = enriched.filter(lambda t: t['likes'] > 1000)


# ── Step 7: Write all results to HBase analytics table ─────────────
def write_analytics_to_hbase(time, rdd_hashtags, rdd_sentiment, rdd_viral):
    conn = happybase.Connection('localhost', port=9090)
    analytics = conn.table('analytics')

    # Write trending hashtags
    row_data = {}
    for tag, count in rdd_hashtags.collect():
        col = f'data:{tag}'.encode()
        row_data[col] = str(count).encode()
    if row_data:
        analytics.put(b'trending_latest', row_data)

    # Write sentiment breakdown
    sentiment_data = {}
    for label, count in rdd_sentiment.collect():
        col = f'data:{label}'.encode()
        sentiment_data[col] = str(count).encode()
    if sentiment_data:
        analytics.put(b'sentiment_latest', sentiment_data)

    # Write viral tweets
    for tweet in rdd_viral.collect():
        row_key = f"viral_{tweet['tweet_id']}".encode()
        analytics.put(row_key, {
            b'data:text':     tweet['text'].encode(),
            b'data:likes':    str(tweet['likes']).encode(),
            b'data:user_id':  tweet['user_id'].encode(),
        })

    conn.close()

# Combine streams and write
hashtag_counts.foreachRDD(
    lambda rdd: write_analytics_to_hbase(None, rdd, sentiment_counts, viral_tweets)
)

ssc.start()
ssc.awaitTermination()
```

---

### Mode 2 — Spark Batch (scheduled every hour)

The batch job runs every hour as a separate Spark job. It reads a full hour of tweets from HBase and computes deeper statistics.

```python
from pyspark.sql import SparkSession
import happybase
from datetime import datetime, timedelta

spark = SparkSession.builder \
    .appName("HourlyBatchAnalytics") \
    .getOrCreate()

# ── Step 1: Read last hour of tweets from HBase ─────────────────────
conn = happybase.Connection('localhost', port=9090)
table = conn.table('tweets')

one_hour_ago = int((datetime.now() - timedelta(hours=1)).timestamp() * 1000)
cutoff_reversed = 9_999_999_999_999 - one_hour_ago

tweets_raw = []
for key, data in table.scan():
    # Extract reversed timestamp from row key
    parts = key.decode().split('_')
    reversed_ts = int(parts[2])
    if reversed_ts > cutoff_reversed:  # tweet is from last hour
        tweets_raw.append({
            'user_id':   parts[1],
            'text':      data.get(b'content:text', b'').decode(),
            'hashtags':  data.get(b'content:hashtags', b'').decode().split(','),
            'likes':     int(data.get(b'meta:likes', b'0')),
            'retweets':  int(data.get(b'meta:retweets', b'0')),
            'location':  data.get(b'meta:location', b'').decode(),
            'sentiment': data.get(b'analysis:sentiment', b'').decode(),
        })

conn.close()

# ── Step 2: Create Spark DataFrame ─────────────────────────────────
df = spark.createDataFrame(tweets_raw)
df.createOrReplaceTempView("tweets")

# ── Step 3: Top 10 hashtags this hour ──────────────────────────────
from pyspark.sql.functions import explode, col, count, desc

hashtags_df = df.select(explode(col("hashtags")).alias("hashtag"))
top_hashtags = (
    hashtags_df
    .groupBy("hashtag")
    .agg(count("*").alias("count"))
    .orderBy(desc("count"))
    .limit(10)
)

# ── Step 4: Sentiment by country ───────────────────────────────────
geo_sentiment = spark.sql("""
    SELECT location, sentiment, COUNT(*) as cnt
    FROM tweets
    GROUP BY location, sentiment
    ORDER BY location, cnt DESC
""")

# ── Step 5: Most active users ──────────────────────────────────────
top_users = spark.sql("""
    SELECT user_id, COUNT(*) as tweet_count,
           SUM(likes) as total_likes
    FROM tweets
    GROUP BY user_id
    ORDER BY tweet_count DESC
    LIMIT 20
""")

# ── Step 6: Write hourly results to HBase analytics table ──────────
time_bucket = datetime.now().strftime('%Y%m%d%H')  # e.g. 2024010114
conn = happybase.Connection('localhost', port=9090)
analytics = conn.table('analytics')

# Write top hashtags for this hour
row_key = f'trending_{time_bucket}'.encode()
row_data = {}
for row in top_hashtags.collect():
    col = f'data:{row["hashtag"]}'.encode()
    row_data[col] = str(row['count']).encode()
analytics.put(row_key, row_data)

# Write geo sentiment
for row in geo_sentiment.collect():
    row_key = f'geo_{row["location"]}_{time_bucket}'.encode()
    analytics.put(row_key, {
        f'data:{row["sentiment"]}'.encode(): str(row['cnt']).encode()
    })

conn.close()
spark.stop()
print(f"Batch job completed for hour {time_bucket}")
```

This batch job can be scheduled with a cron job or Apache Airflow to run every hour automatically.

---

## 7. Component 5 — FastAPI Backend

### What FastAPI does in this project

FastAPI reads pre-computed data from HBase and returns it as JSON. It does **no computation** — Spark already did all the work and stored results in the `analytics` table. FastAPI just fetches and formats them.

### Why FastAPI

- Pure Python — no Java needed
- Async by default — handles many concurrent requests efficiently
- Automatic Swagger docs at `/docs`
- Works perfectly with `happybase` (Python HBase client)

### Project structure

```
backend/
├── main.py
├── config.py
├── routers/
│   ├── tweets.py
│   ├── hashtags.py
│   ├── analytics.py
│   └── users.py
├── services/
│   └── hbase_client.py
└── models/
    └── schemas.py
```

### `config.py`

```python
HBASE_HOST = "localhost"
HBASE_PORT = 9090

KAFKA_BOOTSTRAP = "localhost:9092"

CORS_ORIGINS = [
    "http://localhost:3000",   # React dev server
    "http://localhost:5173",   # Vite dev server
]
```

### `services/hbase_client.py`

```python
import happybase
from config import HBASE_HOST, HBASE_PORT

class HBaseClient:

    def __init__(self):
        self.connection = happybase.Connection(HBASE_HOST, port=HBASE_PORT)

    # ── Tweets ────────────────────────────────────────────────────────

    def get_recent_tweets(self, limit=50):
        table = self.connection.table('tweets')
        result = []
        for key, data in table.scan(limit=limit):
            result.append({
                "tweet_id":  key.decode(),
                "text":      data.get(b'content:text', b'').decode(),
                "hashtags":  data.get(b'content:hashtags', b'').decode().split(','),
                "likes":     int(data.get(b'meta:likes', b'0')),
                "retweets":  int(data.get(b'meta:retweets', b'0')),
                "location":  data.get(b'meta:location', b'').decode(),
                "sentiment": data.get(b'analysis:sentiment', b'').decode(),
            })
        return result

    def get_viral_tweets(self, limit=10):
        table = self.connection.table('analytics')
        result = []
        for key, data in table.scan(row_prefix=b'viral_', limit=limit):
            result.append({
                "tweet_id": key.decode().replace('viral_', ''),
                "text":     data.get(b'data:text', b'').decode(),
                "likes":    int(data.get(b'data:likes', b'0')),
                "user_id":  data.get(b'data:user_id', b'').decode(),
            })
        return result

    def search_tweets_by_hashtag(self, hashtag, limit=50):
        table = self.connection.table('tweets')
        result = []
        for key, data in table.scan(limit=500):  # scan and filter
            tags = data.get(b'content:hashtags', b'').decode()
            if hashtag in tags:
                result.append({
                    "tweet_id": key.decode(),
                    "text":     data.get(b'content:text', b'').decode(),
                    "likes":    int(data.get(b'meta:likes', b'0')),
                })
            if len(result) >= limit:
                break
        return result

    # ── Hashtags ──────────────────────────────────────────────────────

    def get_trending_hashtags(self, limit=10):
        table = self.connection.table('analytics')
        row = table.row(b'trending_latest')
        hashtags = []
        for col, val in row.items():
            tag = col.decode().replace('data:', '')
            hashtags.append({"hashtag": tag, "count": int(val)})
        return sorted(hashtags, key=lambda x: x['count'], reverse=True)[:limit]

    def get_hashtag_history(self, hashtag, hours=24):
        table = self.connection.table('hashtags')
        result = []
        for key, data in table.scan(row_prefix=f'{hashtag}_'.encode(), limit=hours):
            result.append({
                "timestamp":  key.decode().split('_')[1],
                "count":      int(data.get(b'counts:uses_last_hour', b'0')),
                "likes":      int(data.get(b'engagement:total_likes', b'0')),
            })
        return result

    # ── Analytics ─────────────────────────────────────────────────────

    def get_sentiment_stats(self):
        table = self.connection.table('analytics')
        row = table.row(b'sentiment_latest')
        return {
            "positive": int(row.get(b'data:positive', b'0')),
            "neutral":  int(row.get(b'data:neutral',  b'0')),
            "negative": int(row.get(b'data:negative', b'0')),
        }

    def get_sentiment_timeline(self, hours=24):
        from datetime import datetime, timedelta
        table = self.connection.table('analytics')
        result = []
        for i in range(hours):
            dt = datetime.now() - timedelta(hours=i)
            bucket = dt.strftime('%Y%m%d%H')
            row = table.row(f'sentiment_{bucket}'.encode())
            if row:
                result.append({
                    "hour":     bucket,
                    "positive": int(row.get(b'data:positive', b'0')),
                    "neutral":  int(row.get(b'data:neutral',  b'0')),
                    "negative": int(row.get(b'data:negative', b'0')),
                })
        return list(reversed(result))

    def get_geo_distribution(self):
        table = self.connection.table('analytics')
        row = table.row(b'geo_latest')
        geo = {}
        for col, val in row.items():
            country = col.decode().replace('data:', '')
            geo[country] = int(val)
        return geo

    def get_tweet_volume(self):
        table = self.connection.table('analytics')
        row = table.row(b'volume_latest')
        result = []
        for col, val in sorted(row.items()):
            minute = col.decode().replace('data:', '')
            result.append({"minute": minute, "count": int(val)})
        return result

    # ── Users ─────────────────────────────────────────────────────────

    def get_top_users(self, limit=10):
        table = self.connection.table('users')
        users = []
        for key, data in table.scan(limit=200):
            users.append({
                "user_id":      key.decode(),
                "username":     data.get(b'profile:username', b'').decode(),
                "total_tweets": int(data.get(b'stats:total_tweets', b'0')),
                "followers":    int(data.get(b'stats:followers', b'0')),
            })
        return sorted(users, key=lambda x: x['total_tweets'], reverse=True)[:limit]

    def get_user(self, user_id):
        table = self.connection.table('users')
        row = table.row(user_id.encode())
        return {
            "user_id":      user_id,
            "username":     row.get(b'profile:username', b'').decode(),
            "bio":          row.get(b'profile:bio', b'').decode(),
            "location":     row.get(b'profile:location', b'').decode(),
            "total_tweets": int(row.get(b'stats:total_tweets', b'0')),
            "followers":    int(row.get(b'stats:followers', b'0')),
            "following":    int(row.get(b'stats:following', b'0')),
            "last_active":  row.get(b'activity:last_active', b'').decode(),
        }
```

### `main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tweets, hashtags, analytics, users
from config import CORS_ORIGINS

app = FastAPI(
    title="Social Media Analytics API",
    description="Real-time analytics powered by HBase + Spark",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tweets.router,    prefix="/api/tweets",    tags=["Tweets"])
app.include_router(hashtags.router,  prefix="/api/hashtags",  tags=["Hashtags"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

### `routers/tweets.py`

```python
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router  = APIRouter()
hbase   = HBaseClient()

@router.get("/recent")
async def get_recent_tweets(limit: int = Query(default=50, le=200)):
    """Latest tweets — for the live feed page."""
    return hbase.get_recent_tweets(limit=limit)

@router.get("/viral")
async def get_viral_tweets():
    """Tweets that spiked in engagement recently."""
    return hbase.get_viral_tweets()

@router.get("/search")
async def search_by_hashtag(hashtag: str, limit: int = 50):
    """Search tweets containing a specific hashtag."""
    return hbase.search_tweets_by_hashtag(hashtag, limit)
```

### `routers/hashtags.py`

```python
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/trending")
async def get_trending(limit: int = Query(default=10, le=50)):
    """Top N hashtags right now."""
    return hbase.get_trending_hashtags(limit=limit)

@router.get("/{hashtag}/history")
async def get_history(hashtag: str, hours: int = 24):
    """How a hashtag trended over the last N hours — for line charts."""
    return hbase.get_hashtag_history(hashtag, hours)
```

### `routers/analytics.py`

```python
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/sentiment")
async def get_sentiment():
    """Current positive/neutral/negative breakdown."""
    return hbase.get_sentiment_stats()

@router.get("/sentiment/timeline")
async def get_sentiment_timeline(hours: int = 24):
    """Sentiment breakdown per hour for the last N hours."""
    return hbase.get_sentiment_timeline(hours)

@router.get("/geo")
async def get_geo():
    """Tweet volume by country — for the world map."""
    return hbase.get_geo_distribution()

@router.get("/volume")
async def get_volume():
    """Tweets per minute for the last hour — for area chart."""
    return hbase.get_tweet_volume()
```

### `routers/users.py`

```python
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/top")
async def get_top_users(limit: int = Query(default=10, le=50)):
    """Most active users today."""
    return hbase.get_top_users(limit)

@router.get("/{user_id}")
async def get_user(user_id: str):
    """Single user profile and stats."""
    return hbase.get_user(user_id)
```

### Running the API

```bash
pip install fastapi uvicorn happybase

uvicorn main:app --reload --port 8000

# Now open:
# http://localhost:8000/docs      → Swagger UI (interactive)
# http://localhost:8000/redoc     → Clean documentation
# http://localhost:8000/api/hashtags/trending  → Live endpoint
```

### Example API responses

```json
// GET /api/hashtags/trending
[
  { "hashtag": "#BigData",  "count": 12400 },
  { "hashtag": "#AI",       "count": 10200 },
  { "hashtag": "#WorldCup", "count": 8100  }
]

// GET /api/analytics/sentiment
{
  "positive": 4521,
  "neutral":  3200,
  "negative": 2310
}

// GET /api/tweets/recent?limit=3
[
  {
    "tweet_id":  "3_user_48291_9999997823456",
    "text":      "Love #BigData!",
    "hashtags":  ["#BigData", "#Tech"],
    "likes":     142,
    "retweets":  38,
    "sentiment": "positive",
    "location":  "MA"
  }
]

// GET /api/analytics/geo
{
  "US": 45200,
  "UK": 12100,
  "FR": 8900,
  "MA": 4300,
  "JP": 7800
}
```

---

## 8. Component 6 — React Dashboard

### Pages and what each one shows

#### Page 1 — Live Feed

- Shows the latest 50 tweets, updating every 2 seconds
- Each tweet shows: text, hashtags as badges, sentiment emoji, like/retweet counts
- Calls `GET /api/tweets/recent` every 2 seconds with `setInterval`

#### Page 2 — Trending Hashtags

- Horizontal bar chart of the top 10 hashtags
- Updates every 30 seconds
- Calls `GET /api/hashtags/trending`

#### Page 3 — Sentiment Dashboard

- Donut chart: current positive / neutral / negative breakdown
- Line chart: how sentiment changed over the last 24 hours (one point per hour)
- Calls `GET /api/analytics/sentiment` and `GET /api/analytics/sentiment/timeline`

#### Page 4 — Geographic Map

- World map with country fill color proportional to tweet volume
- Darker = more activity
- Calls `GET /api/analytics/geo`

### Tech stack for the frontend

```
React (with Vite for fast dev setup)
Recharts              → bar chart, line chart, donut chart
Leaflet.js            → interactive world map
Axios                 → HTTP calls to FastAPI
Tailwind CSS          → utility-first styling
react-router-dom      → multi-page routing
```

### Example: Trending Hashtags component

```jsx
import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import axios from "axios"

export default function TrendingHashtags() {
  const [data, setData] = useState([])

  const fetchTrending = async () => {
    const res = await axios.get("http://localhost:8000/api/hashtags/trending")
    setData(res.data)
  }

  useEffect(() => {
    fetchTrending()
    const interval = setInterval(fetchTrending, 30_000)  // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">🔥 Trending Hashtags</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" />
          <YAxis type="category" dataKey="hashtag" width={120} />
          <Tooltip />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

## 9. Full Data Flow — Step by Step

Here is every step a single tweet takes, from creation to appearing on the dashboard:

```
STEP 1 — Tweet Generator
  Python creates a fake tweet object (JSON)
  Sends it to Kafka topic "raw-tweets" using KafkaProducer
  Takes: ~1 millisecond

STEP 2 — Kafka stores the tweet
  Kafka writes it to disk on the correct partition
  Assigns it an offset (e.g. offset 58291)
  Two consumer groups will read it: hbase-writer + spark
  Takes: ~2 milliseconds

STEP 3a — HBase Direct Writer (Team 1 consumer)
  Reads tweet from Kafka "raw-tweets"
  Builds the row key: salt_userId_reversedTimestamp
  Writes raw tweet to HBase "tweets" table
  Takes: ~5 milliseconds

STEP 3b — Spark Streaming (Team 3 consumer)
  Accumulates tweets for 10 seconds
  Runs sentiment analysis on each tweet (TextBlob)
  Counts hashtags across the batch
  Detects viral tweets (likes > 1000)
  Publishes enriched tweets to Kafka "processed-tweets"
  Writes aggregated stats to HBase "analytics" table:
    - trending_latest   ← updated
    - sentiment_latest  ← updated
    - viral_latest      ← updated if any viral tweet found
  Takes: ~10 seconds per batch

STEP 4 — FastAPI
  React dashboard calls GET /api/hashtags/trending every 30s
  FastAPI reads "analytics" table row "trending_latest" from HBase
  Returns JSON in ~50 milliseconds

STEP 5 — React Dashboard
  Receives JSON response
  Recharts re-renders the bar chart with new data
  User sees updated trending hashtags

Total latency from tweet creation to dashboard update: ~10–30 seconds
(limited by the Spark Streaming batch window of 10 seconds)
```

---

## 10. Team Responsibilities & Integration Points

### Team 1 — Data Ingestion

**Owns:**
- Tweet simulator script
- Kafka topic setup
- Kafka → HBase consumer (raw tweets writer)

**Depends on Team 2 for:**
- Final row key format for the `tweets` table
- Column family names

**Delivers to Team 3:**
- Tweets flowing in Kafka `raw-tweets` topic
- Confirmed write format in HBase

---

### Team 2 — HBase Schema

**Owns:**
- All table creation scripts (HBase shell)
- Row key design decisions
- Compression and TTL configuration
- Documentation of every column family and qualifier

**This team's work is the foundation — everyone else depends on it.**

**Must finalize early (Week 2):**
- `tweets` table row key format → Team 1 needs this to write
- `analytics` table row key format → Team 3 needs this to write, Team 4 needs this to read

---

### Team 3 — Spark Analytics

**Owns:**
- Spark Streaming job (real-time, every 10 seconds)
- Spark Batch job (hourly, scheduled)
- Sentiment analysis logic
- Writes to HBase `analytics` table

**Depends on Team 2 for:**
- `analytics` table schema (what row keys and columns to write to)

**Delivers to Team 4 (via FastAPI):**
- Pre-computed data in the `analytics` table

---

### Team 4 — Frontend & API

**Owns:**
- FastAPI backend (all routers, HBase client, schemas)
- React dashboard (all 4 pages)

**Depends on Team 2 for:**
- HBase table names and column family names to query

**Depends on Team 3 for:**
- `analytics` table being populated (they can use mock data in Week 6 if Spark isn't ready)

---

### Critical integration meeting (end of Week 2)

All 4 teams must agree on:

1. The exact row key format for `tweets`: `{salt}_{user_id}_{reversed_ts}`
2. The exact row key for `analytics` rows: `trending_latest`, `sentiment_latest`, etc.
3. The exact column names: `content:text`, `meta:likes`, `data:positive`, etc.

Write this in a shared `SCHEMA.md` file in the GitHub repo. Do not change it without notifying all teams.

---

## 11. Docker Setup

Run the full infrastructure locally with Docker Compose:

```yaml
# docker-compose.yml
version: "3.8"

services:

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on: [zookeeper]
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  hbase:
    image: dajobe/hbase
    ports:
      - "16000:16000"
      - "16010:16010"   # HBase Master web UI
      - "16020:16020"
      - "16030:16030"
      - "9090:9090"     # Thrift server (for happybase)
    environment:
      HBASE_CONF_hbase_rootdir: /hbase-data

  fastapi:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on: [hbase]
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on: [fastapi]
```

Start everything:
```bash
docker-compose up -d
```

Access:
- HBase Master UI:  http://localhost:16010
- Kafka:            localhost:9092
- FastAPI docs:     http://localhost:8000/docs
- React dashboard:  http://localhost:3000

---

## 12. Timeline

| Week | What gets done |
|---|---|
| **1** | Set up Docker environment, all services running, team kickoff meeting |
| **2** | ⚠️ Schema finalized (SCHEMA.md), Kafka topics created, tweet simulator working |
| **3** | Kafka → HBase writer live, raw tweets flowing into HBase correctly |
| **4** | Spark Streaming running, sentiment scores appearing in tweets table |
| **5** | Spark Batch job running hourly, analytics table populated, FastAPI endpoints returning real data |
| **6** | React dashboard connected to FastAPI, all 4 pages functional |
| **7** | Full integration test, load test (run simulator at 10,000/sec), fix bottlenecks |
| **8** | Demo preparation, final documentation, presentation |

> **Week 2 is the most critical.** The schema must be locked before any team can write code that touches HBase. One schema change in Week 5 breaks everyone.
