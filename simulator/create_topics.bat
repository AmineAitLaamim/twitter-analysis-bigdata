@echo off
echo ==> Creating Kafka topics...

docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic raw-tweets --partitions 3 --replication-factor 1
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic processed-tweets --partitions 3 --replication-factor 1
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists --topic trending-alerts --partitions 1 --replication-factor 1

echo ==> Verifying topics...
docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list

echo ==> Done.