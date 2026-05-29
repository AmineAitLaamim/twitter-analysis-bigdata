# Member 4 — Spark Batch Job
## Membre responsable : **Othmane BOULAARAB**

## Overview

This module handles the **hourly batch analysis** of tweets for the Real-Time Social Media Analytics Platform.  
It reads the last hour of tweets from HBase, runs three Spark aggregations, and writes the results back to HBase so the API and dashboard can consume them.

---

## Files

| File | Description |
|---|---|
| `spark/batch_job.py` | Main Spark batch job — reads, analyzes, and writes to HBase |
| `spark/scheduler.py` | Runs `batch_job.py` every hour using a Python loop |

---

## What `batch_job.py` does

The job runs in 4 sequential steps every hour:

### Step 1 — Read last hour of tweets from HBase
- Connects to the `tweets` table via happybase
- Scans all rows and filters only those written in the last 60 minutes
- Uses the **reversed timestamp** in the row key to determine recency:
  ```
  row key format: {salt}_{user_id}_{reversed_timestamp}
  example:        3_user_42853_9999781234567
  ```
- Extracts: `user_id`, `hashtags`, `likes`, `retweets`, `location`, `sentiment`

### Step 2 — Spark analysis (3 aggregations)
Creates a Spark DataFrame from the HBase rows and runs:

- **Top 10 hashtags** — counts how many times each hashtag appeared this hour
- **Sentiment by country** — groups tweets by `location` + `sentiment` and counts them
- **Top 20 most active users** — ranks users by tweet count and total likes

### Step 3 — Write to HBase `analytics` table
Writes 4 types of rows:

| Row key written | Content |
|---|---|
| `trending_{YYYYMMDDHH}` | Hourly snapshot of top hashtag counts |
| `trending_latest` | Same data, overwritten each run (used by the API) |
| `geo_{location}_{YYYYMMDDHH}` | Per-country sentiment counts for this hour |
| `geo_latest` | Total tweet count per country, overwritten each run |

### Step 4 — Update HBase `users` table
Updates the top 20 most active users with their stats for this hour:

| Column | Value |
|---|---|
| `stats:tweet_count` | Number of tweets this hour |
| `stats:total_likes` | Total likes this hour |
| `activity:last_seen` | Time bucket (e.g. `2024010114`) |

---

## What `scheduler.py` does

Runs as a **long-lived process** inside the Docker container.  
Uses a simple Python `while True` loop with `time.sleep()` — no external library needed.

```
Start
  └── run batch_job immediately (first run on startup)
  └── sleep 60 minutes
  └── run batch_job
  └── sleep 60 minutes
  └── ... (repeat forever)
```

Key behaviors:
- Fires once **immediately on startup** so there is data available without waiting an hour
- Runs `batch_job.py` via `spark-submit` so Spark gets proper cluster resources
- Logs every run to `/var/log/batch.log` and to the console
- Has a **10-minute timeout** per run to prevent hangs
- Interval is configurable via `BATCH_INTERVAL_MINUTES` env var (useful for testing)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HBASE_HOST` | `hbase` | HBase Thrift server hostname |
| `HBASE_PORT` | `9090` | HBase Thrift server port |
| `SPARK_MASTER` | `spark://spark-master:7077` | Spark cluster master URL |
| `BATCH_INTERVAL_MINUTES` | `60` | How often the batch job runs |

---

## Dependencies

```
happybase==1.2.0
textblob==0.18.0
kafka-python==2.0.2
```

Install:
```bash
pip install -r spark/requirements.txt
```

> On Ubuntu/Debian, use a virtual environment first:
> ```bash
> python3 -m venv venv
> source venv/bin/activate
> pip install -r spark/requirements.txt
> ```

---

## HBase Tables Used

| Table | Operation | Details |
|---|---|---|
| `tweets` | READ | Scans last hour of tweets |
| `analytics` | WRITE | Trending hashtags + geo breakdown |
| `users` | WRITE | Top user stats |

All column names follow `SCHEMA.md` exactly.

---

## How to Run Manually

```bash
# Run the batch job once
spark-submit --master spark://spark-master:7077 spark/batch_job.py

# Run the scheduler (fires every hour automatically)
python spark/scheduler.py

# Run every 5 minutes for testing
BATCH_INTERVAL_MINUTES=5 python spark/scheduler.py
```

---

## Dependencies on Other Members

| Member | What is needed |
|---|---|
| Member 1 | HBase tables must exist (`tweets`, `analytics`, `users`) |
| Member 3 | `tweets` table must be populated with sentiment-enriched data |

---

## Branch

```
spark-batch
```
