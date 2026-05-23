
# Project Architecture — File Tree
## Real-Time Social Media Analytics Platform

```
social-media-analytics/
│
├── docker-compose.yml                  ← Master file, starts everything (Member 8)
├── .env                                ← All environment variables (Member 8)
├── README.md                           ← Setup instructions (Member 8)
├── SCHEMA.md                           ← HBase table contracts (Member 1) ⚠️ critical
│
│
├── hbase/                              ── Member 1 ──────────────────────────────
│   ├── create_tables.sh                ← HBase shell script, creates all 4 tables
│   └── test_connection.py              ← Verifies happybase can connect + read/write
│
│
├── simulator/                          ── Member 2 (primary) ────────────────────
│   ├── Dockerfile
│   ├── requirements.txt                ← kafka-python, faker
│   └── tweet_generator.py              ← Generates fake tweets → Kafka raw-tweets
│
├── ingestion/                          ── Member 2 (secondary) ──────────────────
│   ├── Dockerfile
│   ├── requirements.txt                ← kafka-python, happybase
│   └── hbase_writer.py                 ← Consumes processed-tweets → HBase tweets table
│
│
├── spark/                              ── Member 3 + Member 4 ───────────────────
│   ├── Dockerfile                      ← Shared image for both streaming + batch
│   ├── requirements.txt                ← happybase, textblob, kafka-python
│   │
│   ├── sentiment.py                    ← Member 3: reusable sentiment analysis module
│   ├── streaming_job.py                ← Member 3: Spark Streaming (every 10 seconds)
│   │
│   ├── batch_job.py                    ← Member 4: Spark Batch (every 1 hour)
│   └── scheduler.py                    ← Member 4: Runs batch_job on schedule
│
│
├── backend/                            ── Member 5 + Member 6 ───────────────────
│   ├── Dockerfile                      ← Member 5
│   ├── requirements.txt                ← fastapi, uvicorn, happybase, pydantic
│   │
│   ├── main.py                         ← Member 5: FastAPI app entry point + CORS
│   ├── config.py                       ← Member 5: HBASE_HOST, KAFKA_HOST, CORS settings
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── tweets.py                   ← Member 5: /api/tweets/recent, /viral, /search
│   │   ├── hashtags.py                 ← Member 5: /api/hashtags/trending, /{tag}/history
│   │   ├── analytics.py                ← Member 6: /api/analytics/sentiment, /geo, /volume
│   │   └── users.py                    ← Member 6: /api/users/top, /{user_id}
│   │
│   ├── services/
│   │   └── hbase_client.py             ← Member 5 writes base, Member 6 extends it
│   │
│   └── models/
│       └── schemas.py                  ← Member 5: Pydantic response models
│
│
├── frontend/                           ── Member 7 + Member 8 ───────────────────
│   ├── Dockerfile                      ← Member 7
│   ├── package.json
│   ├── vite.config.js
│   ├── .env                            ← VITE_API_URL=http://localhost:8000
│   │
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                     ← Member 7: Router + Navbar
│       │
│       ├── hooks/
│       │   └── usePolling.js           ← Member 7: shared auto-refresh hook
│       │
│       └── pages/
│           ├── LiveFeed.jsx            ← Member 7: live tweets, updates every 2s
│           ├── Trending.jsx            ← Member 7: hashtag bar chart, every 30s
│           ├── Sentiment.jsx           ← Member 8: donut + 24h line chart
│           └── GeoMap.jsx              ← Member 8: Leaflet world map
│
│
└── tests/                              ── Member 6 + Member 8 ───────────────────
    ├── test_api.py                     ← Member 6: hits every FastAPI endpoint
    └── integration_test.py             ← Member 8: full pipeline end-to-end test
```

---

## Who owns what

| Path | Owner |
|---|---|
| `SCHEMA.md` | Member 1 — must be committed first |
| `hbase/` | Member 1 |
| `simulator/` | Member 2 |
| `ingestion/` | Member 2 |
| `spark/sentiment.py` | Member 3 |
| `spark/streaming_job.py` | Member 3 |
| `spark/batch_job.py` | Member 4 |
| `spark/scheduler.py` | Member 4 |
| `backend/main.py` | Member 5 |
| `backend/config.py` | Member 5 |
| `backend/routers/tweets.py` | Member 5 |
| `backend/routers/hashtags.py` | Member 5 |
| `backend/services/hbase_client.py` | Member 5 (base) + Member 6 (extends) |
| `backend/routers/analytics.py` | Member 6 |
| `backend/routers/users.py` | Member 6 |
| `frontend/src/App.jsx` | Member 7 |
| `frontend/src/hooks/usePolling.js` | Member 7 |
| `frontend/src/pages/LiveFeed.jsx` | Member 7 |
| `frontend/src/pages/Trending.jsx` | Member 7 |
| `frontend/src/pages/Sentiment.jsx` | Member 8 |
| `frontend/src/pages/GeoMap.jsx` | Member 8 |
| `docker-compose.yml` | Member 8 |
| `tests/integration_test.py` | Member 8 |
| `tests/test_api.py` | Member 6 |

---

## Git branch per member

```
main
└── dev
    ├── feature/hbase-schema           → Member 1  (merge this FIRST)
    ├── feature/kafka-simulator        → Member 2
    ├── feature/spark-streaming        → Member 3
    ├── feature/spark-batch            → Member 4
    ├── feature/api-tweets-hashtags    → Member 5
    ├── feature/api-analytics-users    → Member 6
    ├── feature/frontend-feed-trending → Member 7
    └── feature/frontend-sentiment-map → Member 8
```

## .env file (root)

```env
# HBase
HBASE_HOST=hbase
HBASE_PORT=9090

# Kafka
KAFKA_HOST=kafka
KAFKA_PORT=9092

# Zookeeper
ZOOKEEPER_HOST=zookeeper
ZOOKEEPER_PORT=2181

# Spark
SPARK_MASTER=spark://spark-master:7077

# FastAPI
API_PORT=8000
CORS_ORIGIN=http://localhost:3000

# Frontend
VITE_API_URL=http://localhost:8000

# Simulator
TWEET_RATE=200
```

## Start the whole project

```bash
# Clone the repo
git clone https://github.com/your-team/social-media-analytics
cd social-media-analytics

# Start everything
docker-compose up -d

# Check all containers are running
docker-compose ps

# Access points:
# React dashboard   → http://localhost:3000
# FastAPI docs      → http://localhost:8000/docs
# HBase Master UI   → http://localhost:16010
# Spark Master UI   → http://localhost:8080
# Kafka             → localhost:9092
```
