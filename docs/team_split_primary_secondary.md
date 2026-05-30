# Task Split — 8 Members, Primary + Secondary Responsibilities

---

## The Logic

The project has ~5 real jobs. With 8 people, everyone gets a primary task
and a secondary task so no one runs out of work mid-project.

---

## Assignment Table

| Member | Primary | Secondary |
|---|---|---|
| Member 1 | HBase Schema + Tables | Helps Member 5 & 6 with HBase queries |
| Member 2 | Tweet Simulator + Kafka setup | Kafka → HBase writer consumer |
| Member 3 | Spark Streaming job | Sentiment analysis module |
| Member 4 | Spark Batch job + scheduling | Updates `users` table from batch results |
| Member 5 | FastAPI — Tweets & Hashtags endpoints | Docker image for FastAPI |
| Member 6 | FastAPI — Analytics & Users endpoints | API testing + Swagger validation |
| Member 7 | React Dashboard (Pages 1 & 2) | Docker image for React |
| Member 8 | React Dashboard (Pages 3 & 4) | Master docker-compose.yml + integration test |

---

---

## Member 1 — HBase Schema (Primary) + Query Support (Secondary)

### Primary: HBase Schema & Tables

This is the most critical job in the project. Everyone else is blocked until
Member 1 delivers `SCHEMA.md`. Must be done by **end of Week 2**.

**Tasks:**
- Run HBase in Docker (`dajobe/hbase`, ports 9090 and 16010)
- Design and create all 4 tables: `tweets`, `users`, `hashtags`, `analytics`
- Define every row key format, column family, and column qualifier
- Write `SCHEMA.md` — the contract all other members follow
- Write `create_tables.sh` — recreates all tables from scratch in one command
- Write a Python connectivity test using `happybase`

**Row key decisions to make (and document):**

```
tweets    → {salt}_{user_id}_{reversed_timestamp}
users     → {user_id}
hashtags  → {hashtag}_{reversed_timestamp}
analytics → {metric_type}_{time_bucket}  e.g. trending_latest, sentiment_2024010114
```

**HBase shell — create all tables:**
```
create 'tweets',
  {NAME => 'content',  COMPRESSION => 'SNAPPY', BLOOMFILTER => 'ROW'},
  {NAME => 'meta',     COMPRESSION => 'SNAPPY'},
  {NAME => 'analysis', COMPRESSION => 'SNAPPY', TTL => 7776000}

create 'users',
  {NAME => 'profile',  COMPRESSION => 'SNAPPY'},
  {NAME => 'stats',    COMPRESSION => 'SNAPPY'},
  {NAME => 'activity', COMPRESSION => 'SNAPPY'}

create 'hashtags',
  {NAME => 'counts',     COMPRESSION => 'SNAPPY'},
  {NAME => 'engagement', COMPRESSION => 'SNAPPY'},
  {NAME => 'meta',       COMPRESSION => 'SNAPPY'}

create 'analytics',
  {NAME => 'data', COMPRESSION => 'SNAPPY', TTL => 172800}
```

### Secondary: Support Members 5 & 6

Once the schema is done (Week 2), Member 1's time frees up.
From Week 3 onward: sit with Members 5 and 6 and help them write HBase
queries correctly — they will hit issues with byte encoding, scan prefixes,
and row key parsing. Member 1 knows the schema best and can unblock them fast.

**Deliverables:**
- [ ] HBase running in Docker
- [ ] All 4 tables created with correct settings
- [ ] `SCHEMA.md` merged to main by end of Week 2
- [ ] `create_tables.sh` in repo
- [ ] Python connectivity test passing
- [ ] Available to help Members 5 & 6 from Week 3

---

---

## Member 2 — Kafka + Simulator (Primary) + HBase Writer (Secondary)

### Primary: Tweet Simulator + Kafka Setup

**Tasks:**
- Run Zookeeper + Kafka in Docker
- Create 3 topics: `raw-tweets`, `processed-tweets`, `trending-alerts`
- Build the tweet simulator — generates fake tweets at configurable speed
- Push generated tweets to `raw-tweets` Kafka topic

**Docker:**
```yaml
zookeeper:
  image: confluentinc/cp-zookeeper:7.4.0
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181

kafka:
  image: confluentinc/cp-kafka:7.4.0
  depends_on: [zookeeper]
  ports: ["9092:9092"]
  environment:
    KAFKA_BROKER_ID: 1
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

**Tweet simulator:**
```python
import json, random, time, uuid
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode()
)

HASHTAGS  = ['#BigData','#AI','#Python','#HBase','#Kafka',
             '#Tech','#NBA','#Climate','#Gaming','#WorldCup',
             '#OpenAI','#Morocco','#DataScience','#Cloud','#ML']
LOCATIONS = ['US','UK','FR','MA','JP','BR','DE','IN','CA','AU']
TEMPLATES = [
    "Really enjoying {tag} today!",
    "Just learned about {tag} — mind blown.",
    "{tag} is completely broken right now.",
    "Hot take: {tag} is overrated.",
    "Working on a {tag} project and loving it.",
    "{tag} will change everything in 5 years.",
]

def generate_tweet():
    tag   = random.choice(HASHTAGS)
    extra = random.sample(HASHTAGS, k=random.randint(0, 2))
    return {
        "tweet_id":  str(uuid.uuid4()),
        "user_id":   f"user_{random.randint(1, 100_000)}",
        "text":      random.choice(TEMPLATES).format(tag=tag),
        "hashtags":  list(set([tag] + extra)),
        "likes":     random.randint(0, 5000),
        "retweets":  random.randint(0, 1000),
        "timestamp": int(time.time() * 1000),
        "location":  random.choice(LOCATIONS)
    }

RATE = 200  # tweets per second — adjust for demo
while True:
    producer.send('raw-tweets', generate_tweet())
    time.sleep(1 / RATE)
```

### Secondary: Kafka → HBase Consumer

After the simulator is working (Week 2–3), build the consumer that reads
from `processed-tweets` (enriched by Spark) and writes to HBase `tweets` table.

```python
import json, happybase
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'processed-tweets',
    bootstrap_servers='localhost:9092',
    group_id='hbase-writer-group',
    value_deserializer=lambda m: json.loads(m.decode()),
    auto_offset_reset='earliest'
)

conn  = happybase.Connection('localhost', port=9090)
table = conn.table('tweets')

for message in consumer:
    t      = message.value
    salt   = hash(t['user_id']) % 10
    rev_ts = 9_999_999_999_999 - t['timestamp']
    key    = f"{salt}_{t['user_id']}_{rev_ts}".encode()
    table.put(key, {
        b'content:text':       t['text'].encode(),
        b'content:hashtags':   ','.join(t['hashtags']).encode(),
        b'meta:likes':         str(t['likes']).encode(),
        b'meta:retweets':      str(t['retweets']).encode(),
        b'meta:location':      t['location'].encode(),
        b'analysis:sentiment': t.get('sentiment', 'neutral').encode(),
        b'analysis:score':     str(t.get('sentiment_score', 0.0)).encode(),
    })
```

**Deliverables:**
- [ ] Kafka + Zookeeper running in Docker
- [ ] 3 topics created
- [ ] Simulator producing tweets to `raw-tweets`
- [ ] HBase consumer writing enriched tweets to `tweets` table
- [ ] Verified tweets appear in HBase after pipeline runs

---

---

## Member 3 — Spark Streaming (Primary) + Sentiment Module (Secondary)

### Primary: Spark Streaming Job

Reads from `raw-tweets` every 10 seconds, enriches tweets, counts hashtags,
detects viral tweets, writes to `analytics` table and publishes to `processed-tweets`.

Uses **Spark 3.5.0 Structured Streaming API** (not the deprecated DStream API).

**Docker (already in docker-compose.yml):**
```yaml
spark-master:
  image: apache/spark:3.5.0
  container_name: spark-master
  command: /opt/spark/bin/spark-class org.apache.spark.deploy.master.Master
  environment:
    - CORE_CONF_fs_defaultFS=hdfs://namenode:9000
  ports: ["8080:8080", "7077:7077", "4040:4040"]

spark-worker-1:
  image: apache/spark:3.5.0
  container_name: spark-worker-1
  command: /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker spark://spark-master:7077
  environment:
    - CORE_CONF_fs_defaultFS=hdfs://namenode:9000
    - SPARK_WORKER_HOSTNAME=spark-worker-1
  depends_on:
    spark-master: { condition: service_healthy }
  deploy:
    resources:
      limits: { memory: 2G, cpus: "1.5" }
```

**Streaming job — Structured Streaming (every 10 seconds):**
```python
# spark/streaming_job.py
import os, json, logging
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, udf, explode, count
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType,
    LongType, ArrayType, FloatType
)
import happybase
from kafka import KafkaProducer
from sentiment import analyze

KAFKA_HOST = os.environ.get('KAFKA_HOST', 'kafka')
KAFKA_PORT = os.environ.get('KAFKA_PORT', '9092')
HBASE_HOST = os.environ.get('HBASE_HOST', 'hbase')
HBASE_PORT = os.environ.get('HBASE_PORT', '9090')
SPARK_MASTER = os.environ.get('SPARK_MASTER', 'spark://spark-master:7077')
KAFKA_BOOTSTRAP = f'{KAFKA_HOST}:{KAFKA_PORT}'

# Tweet JSON schema (matches simulator output)
TWEET_SCHEMA = StructType([
    StructField('tweet_id',  StringType(), True),
    StructField('user_id',   StringType(), True),
    StructField('text',      StringType(), True),
    StructField('hashtags',  ArrayType(StringType()), True),
    StructField('likes',     IntegerType(), True),
    StructField('retweets',  IntegerType(), True),
    StructField('timestamp', LongType(), True),
    StructField('location',  StringType(), True),
])

# Sentiment UDFs
def _sentiment_label(text):
    if text is None: return 'neutral'
    return analyze(text)['sentiment']

def _sentiment_score(text):
    if text is None: return 0.0
    return float(analyze(text)['sentiment_score'])

sentiment_label_udf = udf(_sentiment_label, StringType())
sentiment_score_udf = udf(_sentiment_score, FloatType())

def write_to_hbase(batch_df, batch_id):
    """foreachBatch callback: publish to Kafka + write analytics to HBase."""
    if batch_df.rdd.isEmpty():
        return

    # 1. Publish enriched tweets to processed-tweets
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    for row in batch_df.collect():
        tweet = {
            'tweet_id': row.tweet_id, 'user_id': row.user_id,
            'text': row.text, 'hashtags': row.hashtags,
            'likes': row.likes, 'retweets': row.retweets,
            'timestamp': row.timestamp, 'location': row.location,
            'sentiment': row.sentiment, 'sentiment_score': row.sentiment_score,
        }
        producer.send('processed-tweets', tweet)
    producer.flush()
    producer.close()

    # 2. Write to HBase analytics table
    conn = happybase.Connection(HBASE_HOST, port=int(HBASE_PORT))
    analytics = conn.table('analytics')

    # 2a. Trending hashtags
    hashtag_rows = (
        batch_df.select(explode(col('hashtags')).alias('hashtag'))
        .groupBy('hashtag').agg(count('*').alias('cnt')).collect()
    )
    if hashtag_rows:
        tag_data = {f'data:{r.hashtag}'.encode(): str(r.cnt).encode()
                    for r in hashtag_rows}
        analytics.put(b'trending_latest', tag_data)

    # 2b. Sentiment breakdown
    sent_rows = batch_df.groupBy('sentiment').agg(count('*').alias('cnt')).collect()
    if sent_rows:
        sent_data = {f'data:{r.sentiment}'.encode(): str(r.cnt).encode()
                     for r in sent_rows}
        analytics.put(b'sentiment_latest', sent_data)

    # 2c. Viral tweets (likes > 1000)
    for r in batch_df.filter(col('likes') > 1000).collect():
        analytics.put(f"viral_{r.tweet_id}".encode(), {
            b'data:text': r.text.encode(), b'data:likes': str(r.likes).encode(),
            b'data:user_id': r.user_id.encode(),
        })
    conn.close()

def main():
    spark = (
        SparkSession.builder
        .appName('TwitterStreamingAnalytics')
        .master(SPARK_MASTER)
        .config('spark.jars.packages',
                'org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0')
        .getOrCreate()
    )

    # Read from Kafka
    raw_stream = (
        spark.readStream.format('kafka')
        .option('kafka.bootstrap.servers', KAFKA_BOOTSTRAP)
        .option('subscribe', 'raw-tweets')
        .option('startingOffsets', 'latest')
        .load()
    )

    # Parse JSON → enrich with sentiment
    tweets_df = (
        raw_stream.selectExpr('CAST(value AS STRING) as json_str')
        .select(from_json(col('json_str'), TWEET_SCHEMA).alias('tweet'))
        .select('tweet.*')
    )
    enriched_df = (
        tweets_df
        .withColumn('sentiment', sentiment_label_udf(col('text')))
        .withColumn('sentiment_score', sentiment_score_udf(col('text')))
    )

    # Stream with 10-second micro-batches
    query = (
        enriched_df.writeStream
        .foreachBatch(write_to_hbase)
        .trigger(processingTime='10 seconds')
        .option('checkpointLocation', '/tmp/spark-streaming-checkpoint')
        .start()
    )
    query.awaitTermination()

if __name__ == '__main__':
    main()
```

### Secondary: Sentiment Analysis Module

Extract the sentiment logic into a clean reusable module that Member 4 can
also import in the batch job. Includes batch processing support.

```python
# spark/sentiment.py
from textblob import TextBlob

def analyze(text: str) -> dict:
    """Analyze sentiment of a text string.
    Returns {'sentiment': str, 'sentiment_score': float}.
    Used by streaming_job.py (Member 3) and batch_job.py (Member 4).
    """
    try:
        score = TextBlob(str(text)).sentiment.polarity
        if score > 0.1:
            label = 'positive'
        elif score < -0.1:
            label = 'negative'
        else:
            label = 'neutral'
        return {'sentiment': label, 'sentiment_score': round(score, 3)}
    except Exception:
        return {'sentiment': 'neutral', 'sentiment_score': 0.0}

def analyze_batch(texts: list) -> list:
    """Analyze sentiment for a list of texts."""
    return [analyze(t) for t in texts]
```

**Deliverables:**
- [ ] Spark Master + Workers running in Docker (apache/spark:3.5.0)
- [ ] Streaming job processing tweets every 10 seconds
- [ ] `trending_latest` and `sentiment_latest` rows updating in HBase
- [ ] Enriched tweets published to `processed-tweets`
- [ ] `sentiment.py` module usable by Member 4
- [ ] Viral tweets appearing under `viral_*` rows

---

---

## Member 4 — Spark Batch (Primary) + Users Table (Secondary)

### Primary: Spark Batch Job (runs every hour)

Reads last hour of tweets from HBase, runs deeper analysis, writes
time-bucketed results to `analytics` table for historical charts.

```python
# spark/batch_job.py
import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, col, count, sum as _sum, desc
import happybase
from datetime import datetime, timedelta
from sentiment import analyze  # from Member 3's module

HBASE_HOST = os.environ.get('HBASE_HOST', 'hbase')
HBASE_PORT = os.environ.get('HBASE_PORT', '9090')
SPARK_MASTER = os.environ.get('SPARK_MASTER', 'spark://spark-master:7077')

spark  = SparkSession.builder.appName("BatchAnalytics").master(SPARK_MASTER).getOrCreate()
conn   = happybase.Connection(HBASE_HOST, port=int(HBASE_PORT))
table  = conn.table('tweets')
bucket = datetime.now().strftime('%Y%m%d%H')

# Read last hour
cutoff = 9_999_999_999_999 - int(
    (datetime.now() - timedelta(hours=1)).timestamp() * 1000
)
rows = []
for key, data in table.scan():
    rev_ts = int(key.decode().split('_')[2])
    if rev_ts > cutoff:
        rows.append({
            'user_id':   key.decode().split('_')[1],
            'hashtags':  data.get(b'content:hashtags', b'').decode().split(','),
            'likes':     int(data.get(b'meta:likes', b'0')),
            'retweets':  int(data.get(b'meta:retweets', b'0')),
            'location':  data.get(b'meta:location', b'').decode(),
            'sentiment': data.get(b'analysis:sentiment', b'neutral').decode(),
        })
conn.close()

df = spark.createDataFrame(rows)
df.createOrReplaceTempView("tweets")

# Top 10 hashtags
top_tags = (
    df.select(explode(col("hashtags")).alias("h"))
    .groupBy("h").agg(count("*").alias("n"))
    .orderBy(desc("n")).limit(10)
)

# Sentiment by country
geo = spark.sql("""
    SELECT location, sentiment, COUNT(*) as cnt
    FROM tweets GROUP BY location, sentiment
""")

# Most active users
top_users = spark.sql("""
    SELECT user_id, COUNT(*) as tweets, SUM(likes) as likes
    FROM tweets GROUP BY user_id ORDER BY tweets DESC LIMIT 20
""")

# Write to HBase
conn = happybase.Connection(HBASE_HOST, port=int(HBASE_PORT))
atbl = conn.table('analytics')

# Hourly trending
row_data = {f'data:{r["h"]}'.encode(): str(r["n"]).encode()
            for r in top_tags.collect()}
atbl.put(f'trending_{bucket}'.encode(), row_data)
atbl.put(b'trending_latest', row_data)

# Geo
geo_latest = {}
for r in geo.collect():
    atbl.put(f'geo_{r["location"]}_{bucket}'.encode(),
             {f'data:{r["sentiment"]}'.encode(): str(r["cnt"]).encode()})
    geo_latest[f'data:{r["location"]}'.encode()] = str(r["cnt"]).encode()
atbl.put(b'geo_latest', geo_latest)

conn.close()
spark.stop()
print(f"Batch done: {bucket}, {len(rows)} tweets")
```

**Schedule with cron:**
```bash
0 * * * * spark-submit --master spark://spark-master:7077 /opt/spark/work-dir/batch_job.py >> /var/log/batch.log 2>&1
```

### Secondary: Update Users Table

After the batch job runs, update the `users` table with tweet counts
and activity stats so the `/api/users/top` endpoint has real data.

```python
# Add to batch_job.py after top_users is computed
utbl = conn.table('users')
for r in top_users.collect():
    utbl.put(r['user_id'].encode(), {
        b'stats:total_tweets':    str(r['tweets']).encode(),
        b'stats:total_likes':     str(r['likes']).encode(),
        b'activity:last_active':  bucket.encode(),
    })
```

**Deliverables:**
- [ ] Batch job reading last hour of tweets from HBase
- [ ] `trending_{YYYYMMDDHH}` rows written every hour
- [ ] `geo_latest` row updated every hour
- [ ] `users` table updated with tweet counts
- [ ] Batch job scheduled via cron
- [ ] Logs showing successful hourly runs

---

---

## Member 5 — FastAPI Tweets & Hashtags (Primary) + FastAPI Docker (Secondary)

### Primary: FastAPI Project + Tweets & Hashtags Endpoints

Sets up the entire FastAPI project structure that Member 6 will extend.

**Project structure:**
```
backend/
├── main.py
├── config.py
├── requirements.txt
├── Dockerfile
├── routers/
│   ├── tweets.py      ← Member 5
│   └── hashtags.py    ← Member 5
├── services/
│   └── hbase_client.py ← Member 5 writes base, Member 6 extends
└── models/
    └── schemas.py
```

**`main.py`:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import tweets, hashtags, analytics, users
from config import CORS_ORIGINS

app = FastAPI(title="Social Media Analytics API", version="1.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(tweets.router,    prefix="/api/tweets",    tags=["Tweets"])
app.include_router(hashtags.router,  prefix="/api/hashtags",  tags=["Hashtags"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])

@app.get("/health")
def health(): return {"status": "ok"}
```

**`services/hbase_client.py` (base — Member 6 adds to this):**
```python
import happybase
from config import HBASE_HOST, HBASE_PORT

class HBaseClient:
    def __init__(self):
        self.conn = happybase.Connection(HBASE_HOST, port=HBASE_PORT)

    def get_recent_tweets(self, limit=50):
        table = self.conn.table('tweets')
        result = []
        for key, data in table.scan(limit=limit):
            result.append({
                "tweet_id":  key.decode(),
                "text":      data.get(b'content:text', b'').decode(),
                "hashtags":  data.get(b'content:hashtags', b'').decode().split(','),
                "likes":     int(data.get(b'meta:likes', b'0')),
                "retweets":  int(data.get(b'meta:retweets', b'0')),
                "location":  data.get(b'meta:location', b'').decode(),
                "sentiment": data.get(b'analysis:sentiment', b'neutral').decode(),
            })
        return result

    def get_viral_tweets(self, limit=10):
        table = self.conn.table('analytics')
        result = []
        for key, data in table.scan(row_prefix=b'viral_', limit=limit):
            result.append({
                "tweet_id": key.decode().replace('viral_', ''),
                "text":     data.get(b'data:text', b'').decode(),
                "likes":    int(data.get(b'data:likes', b'0')),
                "user_id":  data.get(b'data:user_id', b'').decode(),
            })
        return result

    def get_trending_hashtags(self, limit=10):
        table = self.conn.table('analytics')
        row   = table.row(b'trending_latest')
        tags  = [{"hashtag": c.decode().replace('data:', ''), "count": int(v)}
                 for c, v in row.items()]
        return sorted(tags, key=lambda x: x['count'], reverse=True)[:limit]

    def get_hashtag_history(self, hashtag, hours=24):
        table  = self.conn.table('hashtags')
        result = []
        for key, data in table.scan(row_prefix=f'{hashtag}_'.encode(), limit=hours):
            result.append({
                "timestamp": key.decode().split('_')[1],
                "count":     int(data.get(b'counts:uses_last_hour', b'0')),
            })
        return result
```

**Endpoints:**
```python
# routers/tweets.py
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/recent")
async def recent(limit: int = Query(default=50, le=200)):
    return hbase.get_recent_tweets(limit)

@router.get("/viral")
async def viral():
    return hbase.get_viral_tweets()

@router.get("/search")
async def search(hashtag: str, limit: int = 50):
    return hbase.search_by_hashtag(hashtag, limit)
```

```python
# routers/hashtags.py
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/trending")
async def trending(limit: int = Query(default=10, le=50)):
    return hbase.get_trending_hashtags(limit)

@router.get("/{hashtag}/history")
async def history(hashtag: str, hours: int = 24):
    return hbase.get_hashtag_history(hashtag, hours)
```

### Secondary: FastAPI Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Deliverables:**
- [ ] FastAPI project structure created and pushed to repo
- [ ] `GET /api/tweets/recent` returning real data
- [ ] `GET /api/tweets/viral` working
- [ ] `GET /api/hashtags/trending` working
- [ ] Swagger docs at `http://localhost:8000/docs`
- [ ] FastAPI Dockerfile working

---

---

## Member 6 — FastAPI Analytics & Users (Primary) + API Testing (Secondary)

### Primary: Analytics & Users Endpoints

Extends the `HBaseClient` from Member 5 with analytics and user methods,
then writes the routers for those endpoints.

**Add to `hbase_client.py`:**
```python
def get_sentiment_stats(self):
    row = self.conn.table('analytics').row(b'sentiment_latest')
    return {
        "positive": int(row.get(b'data:positive', b'0')),
        "neutral":  int(row.get(b'data:neutral',  b'0')),
        "negative": int(row.get(b'data:negative', b'0')),
    }

def get_sentiment_timeline(self, hours=24):
    from datetime import datetime, timedelta
    table, result = self.conn.table('analytics'), []
    for i in range(hours):
        bucket = (datetime.now() - timedelta(hours=i)).strftime('%Y%m%d%H')
        row    = table.row(f'sentiment_{bucket}'.encode())
        if row:
            result.append({
                "hour":     bucket,
                "positive": int(row.get(b'data:positive', b'0')),
                "neutral":  int(row.get(b'data:neutral',  b'0')),
                "negative": int(row.get(b'data:negative', b'0')),
            })
    return list(reversed(result))

def get_geo_distribution(self):
    row = self.conn.table('analytics').row(b'geo_latest')
    return {c.decode().replace('data:', ''): int(v) for c, v in row.items()}

def get_top_users(self, limit=10):
    table = self.conn.table('users')
    users = []
    for key, data in table.scan(limit=200):
        users.append({
            "user_id":      key.decode(),
            "total_tweets": int(data.get(b'stats:total_tweets', b'0')),
            "total_likes":  int(data.get(b'stats:total_likes',  b'0')),
            "last_active":  data.get(b'activity:last_active', b'').decode(),
        })
    return sorted(users, key=lambda x: x['total_tweets'], reverse=True)[:limit]

def get_user(self, user_id):
    row = self.conn.table('users').row(user_id.encode())
    return {
        "user_id":      user_id,
        "total_tweets": int(row.get(b'stats:total_tweets', b'0')),
        "followers":    int(row.get(b'stats:followers', b'0')),
        "last_active":  row.get(b'activity:last_active', b'').decode(),
    }
```

**Routers:**
```python
# routers/analytics.py
from fastapi import APIRouter
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/sentiment")
async def sentiment(): return hbase.get_sentiment_stats()

@router.get("/sentiment/timeline")
async def timeline(hours: int = 24): return hbase.get_sentiment_timeline(hours)

@router.get("/geo")
async def geo(): return hbase.get_geo_distribution()
```

```python
# routers/users.py
from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/top")
async def top(limit: int = Query(default=10, le=50)):
    return hbase.get_top_users(limit)

@router.get("/{user_id}")
async def user(user_id: str): return hbase.get_user(user_id)
```

### Secondary: API Testing + Swagger Validation

Write a test script that hits every endpoint and checks the response shape.

```python
# tests/test_api.py
import requests

BASE = "http://localhost:8000"

TESTS = [
    ("/health",                          lambda r: r["status"] == "ok"),
    ("/api/tweets/recent?limit=5",       lambda r: isinstance(r, list)),
    ("/api/tweets/viral",                lambda r: isinstance(r, list)),
    ("/api/hashtags/trending",           lambda r: isinstance(r, list) and "hashtag" in r[0]),
    ("/api/analytics/sentiment",         lambda r: "positive" in r),
    ("/api/analytics/geo",               lambda r: isinstance(r, dict)),
    ("/api/users/top",                   lambda r: isinstance(r, list)),
]

for endpoint, check in TESTS:
    try:
        r = requests.get(BASE + endpoint).json()
        status = "✅" if check(r) else "❌ wrong shape"
    except Exception as e:
        status = f"❌ {e}"
    print(f"{status}  {endpoint}")
```

**Deliverables:**
- [ ] `GET /api/analytics/sentiment` returning live counts
- [ ] `GET /api/analytics/sentiment/timeline` returning 24h history
- [ ] `GET /api/analytics/geo` returning country map
- [ ] `GET /api/users/top` returning active users
- [ ] All endpoints visible in Swagger
- [ ] Test script passing all checks

---

---

## Member 7 — React Pages 1 & 2 (Primary) + React Dockerfile (Secondary)

### Primary: Live Feed + Trending Hashtags Pages

Sets up the React project and builds the first two dashboard pages.

**Setup:**
```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install axios recharts react-router-dom tailwindcss
```

**Shared polling hook (used by Member 8 too):**
```js
// src/hooks/usePolling.js
import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

export function usePolling(endpoint, ms = 30000) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}${endpoint}`)
        setData(res.data)
        setLoading(false)
      } catch (e) { console.error(e) }
    }
    fetch()
    const id = setInterval(fetch, ms)
    return () => clearInterval(id)
  }, [endpoint, ms])

  return { data, loading }
}
```

**Page 1 — Live Feed (refreshes every 2s):**
```jsx
// src/pages/LiveFeed.jsx
import { usePolling } from "../hooks/usePolling"

const EMOJI = { positive: "😊", neutral: "😐", negative: "😞" }

export default function LiveFeed() {
  const { data: tweets, loading } = usePolling("/api/tweets/recent?limit=50", 2000)
  if (loading) return <p className="p-6 text-gray-500">Loading...</p>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔴 Live Feed</h1>
      <div className="space-y-3">
        {tweets?.map(t => (
          <div key={t.tweet_id} className="bg-white rounded-xl p-4 shadow">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400 font-mono">
                {t.tweet_id.split('_').slice(0,2).join('_')}
              </span>
              <span>{EMOJI[t.sentiment] || "😐"}</span>
            </div>
            <p className="mt-2">{t.text}</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {t.hashtags.map(h => (
                <span key={h} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                  {h}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              ❤️ {t.likes}  🔁 {t.retweets}  📍 {t.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Page 2 — Trending Hashtags (refreshes every 30s):**
```jsx
// src/pages/Trending.jsx
import { usePolling } from "../hooks/usePolling"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function Trending() {
  const { data, loading } = usePolling("/api/hashtags/trending", 30000)
  if (loading) return <p className="p-6 text-gray-500">Loading...</p>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🔥 Trending Hashtags</h1>
      <div className="bg-white rounded-xl shadow p-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" />
            <YAxis type="category" dataKey="hashtag" width={140} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

### Secondary: React Dockerfile + App Router

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
```

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import LiveFeed  from "./pages/LiveFeed"
import Trending  from "./pages/Trending"
import Sentiment from "./pages/Sentiment"
import GeoMap    from "./pages/GeoMap"

export default function App() {
  return (
    <BrowserRouter>
      <nav className="bg-gray-900 text-white px-6 py-4 flex gap-6 items-center">
        <span className="font-bold text-lg mr-4">📊 Analytics</span>
        <Link to="/"          className="hover:text-indigo-400">Live Feed</Link>
        <Link to="/trending"  className="hover:text-indigo-400">Trending</Link>
        <Link to="/sentiment" className="hover:text-indigo-400">Sentiment</Link>
        <Link to="/map"       className="hover:text-indigo-400">Map</Link>
      </nav>
      <div className="bg-gray-50 min-h-screen">
        <Routes>
          <Route path="/"          element={<LiveFeed  />} />
          <Route path="/trending"  element={<Trending  />} />
          <Route path="/sentiment" element={<Sentiment />} />
          <Route path="/map"       element={<GeoMap    />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
```

**Deliverables:**
- [ ] React project running on port 3000
- [ ] `usePolling` hook in `src/hooks/usePolling.js`
- [ ] Page 1: live tweets updating every 2 seconds
- [ ] Page 2: trending bar chart updating every 30 seconds
- [ ] App router with navbar linking all 4 pages
- [ ] React Dockerfile working

---

---

## Member 8 — React Pages 3 & 4 (Primary) + Docker Compose (Secondary)

### Primary: Sentiment Dashboard + Geographic Map Pages

**Page 3 — Sentiment (donut + 24h line chart):**
```jsx
// src/pages/Sentiment.jsx
import { usePolling } from "../hooks/usePolling"
import { PieChart, Pie, Cell, LineChart, Line,
         XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = { Positive: "#22c55e", Neutral: "#94a3b8", Negative: "#ef4444" }

export default function Sentiment() {
  const { data: current  } = usePolling("/api/analytics/sentiment",          30000)
  const { data: timeline } = usePolling("/api/analytics/sentiment/timeline", 60000)

  const pieData = current ? [
    { name: "Positive", value: current.positive },
    { name: "Neutral",  value: current.neutral  },
    { name: "Negative", value: current.negative },
  ] : []

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Current Sentiment</h2>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60}>
              {pieData.map(e => <Cell key={e.name} fill={COLORS[e.name]} />)}
            </Pie>
            <Tooltip /><Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Sentiment — Last 24h</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeline || []}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis /><Tooltip /><Legend />
            <Line type="monotone" dataKey="positive" stroke="#22c55e" dot={false} />
            <Line type="monotone" dataKey="neutral"  stroke="#94a3b8" dot={false} />
            <Line type="monotone" dataKey="negative" stroke="#ef4444" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

**Page 4 — Geographic Map:**
```bash
npm install leaflet react-leaflet
```

```jsx
// src/pages/GeoMap.jsx
import { usePolling } from "../hooks/usePolling"
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet"
import "leaflet/dist/leaflet.css"

const COORDS = {
  US:[37.09,-95.71], UK:[55.37,-3.43], FR:[46.22,2.21],
  MA:[31.79,-7.09],  JP:[36.20,138.25],BR:[-14.23,-51.92],
  DE:[51.16,10.45],  IN:[20.59,78.96], CA:[56.13,-106.34],
  AU:[-25.27,133.77]
}

export default function GeoMap() {
  const { data, loading } = usePolling("/api/analytics/geo", 30000)
  if (loading) return <p className="p-6 text-gray-500">Loading...</p>

  const max = data ? Math.max(...Object.values(data)) : 1

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🌍 Activity by Country</h1>
      <div className="rounded-xl overflow-hidden shadow" style={{ height: 500 }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {data && Object.entries(data).map(([country, count]) => {
            const coords = COORDS[country]
            if (!coords) return null
            return (
              <CircleMarker key={country} center={coords}
                radius={10 + (count / max) * 30}
                fillColor="#6366f1" fillOpacity={0.6} color="#4338ca" weight={1}>
                <Tooltip>{country}: {count.toLocaleString()} tweets</Tooltip>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
```

### Secondary: Master docker-compose.yml + Integration Test

**`docker-compose.yml`:**
```yaml
version: "3.8"

networks:
  analytics-net:
    driver: bridge

volumes:
  hbase_data:

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment: { ZOOKEEPER_CLIENT_PORT: 2181 }
    networks: [analytics-net]

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on: [zookeeper]
    ports: ["9092:9092"]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    networks: [analytics-net]

  hbase:
    image: dajobe/hbase
    ports: ["9090:9090", "16010:16010"]
    volumes: [hbase_data:/hbase-data]
    networks: [analytics-net]

  spark-master:
    image: bitnami/spark:3.4
    environment: [SPARK_MODE=master]
    ports: ["8080:8080", "7077:7077"]
    networks: [analytics-net]

  spark-worker:
    image: bitnami/spark:3.4
    depends_on: [spark-master]
    environment:
      - SPARK_MODE=worker
      - SPARK_MASTER_URL=spark://spark-master:7077
      - SPARK_WORKER_MEMORY=2G
    networks: [analytics-net]

  fastapi:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [hbase, kafka]
    environment:
      HBASE_HOST: hbase
      KAFKA_HOST: kafka
    networks: [analytics-net]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [fastapi]
    environment:
      VITE_API_URL: http://localhost:8000
    networks: [analytics-net]
```

**Integration test:**
```python
# tests/integration_test.py
import requests, happybase, time

def test_tables():
    conn   = happybase.Connection('localhost', port=9090)
    tables = [t.decode() for t in conn.tables()]
    for t in ['tweets', 'users', 'hashtags', 'analytics']:
        assert t in tables, f"Missing table: {t}"
    print("✅ HBase tables OK")

def test_api():
    time.sleep(15)  # let pipeline warm up
    endpoints = ["/health", "/api/tweets/recent", "/api/hashtags/trending",
                 "/api/analytics/sentiment", "/api/analytics/geo", "/api/users/top"]
    for ep in endpoints:
        r = requests.get(f"http://localhost:8000{ep}")
        icon = "✅" if r.status_code == 200 else "❌"
        print(f"{icon} {ep} → {r.status_code}")

if __name__ == "__main__":
    test_tables()
    test_api()
    print("\nDone.")
```

**Start everything:**
```bash
docker-compose up -d
```

**Deliverables:**
- [ ] Page 3: sentiment donut + 24h line chart
- [ ] Page 4: world map with proportional circles per country
- [ ] `docker-compose.yml` starting all 8 services
- [ ] `docker-compose up -d` works with no errors
- [ ] Integration test passing

---

---

## Summary

| Member | Primary Task | Secondary Task | Blocked Until |
|---|---|---|---|
| **1** | HBase schema + 4 tables | Help Members 5 & 6 with queries | Nobody |
| **2** | Kafka + tweet simulator | HBase writer consumer | Member 1 schema |
| **3** | Spark Streaming | Sentiment module | Member 1 schema |
| **4** | Spark Batch + scheduling | Update users table | Member 3 sentiment module |
| **5** | FastAPI tweets & hashtags | FastAPI Dockerfile | Member 1 schema |
| **6** | FastAPI analytics & users | API test script | Members 1, 3, 4 |
| **7** | React pages 1 & 2 | App router + React Dockerfile | Members 5 & 6 (can mock first) |
| **8** | React pages 3 & 4 | Master docker-compose.yml | Members 5 & 6 (can mock first) |

> Members 7 & 8 can start with mocked API responses in Week 3
> and switch to real endpoints in Week 6 when FastAPI is ready.
> This way frontend is never blocked.
