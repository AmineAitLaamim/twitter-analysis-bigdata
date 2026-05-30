# Setup and Run Guide

This project runs the Twitter analytics pipeline with Docker Compose:

```text
simulator -> Kafka raw-tweets -> ingestion -> HBase tweets -> FastAPI -> frontend
```

## Prerequisites

- Docker Desktop must be running.
- `make` must be available from the terminal.
- Run commands from the repository root:

```powershell
cd "C:\Users\pc\Desktop\cours\S6\Big Data et cloud computing\twitter-analysis-bigdata"
```

## Start Everything

Build and start the containers:

```powershell
make build
```

If the images are already built, this is enough:

```powershell
make up
```

Create the HBase tables after HBase is healthy:

```powershell
make hbase-tables
```

Open the app:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:8000
```

## Kafka Topics

The Kafka setup script is:

```text
simulator/create_topics.sh
```

It creates:

- `raw-tweets`
- `processed-tweets`
- `trending-alerts`

To verify topics:

```powershell
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --describe
```

Expected important topics:

```text
raw-tweets        PartitionCount: 3
processed-tweets  PartitionCount: 3
trending-alerts   PartitionCount: 1
```

If `trending-alerts` is missing:

```powershell
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic trending-alerts --partitions 1 --replication-factor 1
```

If `raw-tweets` or `processed-tweets` only has 1 partition:

```powershell
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --alter --topic raw-tweets --partitions 3
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --alter --topic processed-tweets --partitions 3
```

## Verify the Pipeline

Check running containers:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Check simulator, ingestion, and backend logs:

```powershell
docker logs simulator --tail 80
docker logs ingestion --tail 80
docker logs fastapi --tail 80
```

Verify recent tweets from the backend:

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/api/tweets/recent?limit=3" -UseBasicParsing
```

Run the same command twice a few seconds apart. If Live Feed is working, the newest tweet IDs should change.

## Common Fixes

If Live Feed is empty or returns errors, recreate HBase tables and restart the services that keep HBase connections open:

```powershell
make hbase-tables
docker compose restart fastapi ingestion
```

If simulator logs show Kafka metadata timeout errors, make sure internal Docker services use Kafka port `29092`, not `9092`.

If the frontend page does not load, check that the frontend container owns port `3000`:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs frontend --tail 80
```

## Stop Everything

```powershell
make down
```
