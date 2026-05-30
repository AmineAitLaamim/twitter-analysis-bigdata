#!/bin/bash

echo "Création des topics Kafka..."

docker exec kafka kafka-topics --create \
  --topic raw-tweets \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

docker exec kafka kafka-topics --create \
  --topic processed-tweets \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

docker exec kafka kafka-topics --create \
  --topic trending-alerts \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1

echo "Topics créés :"
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092