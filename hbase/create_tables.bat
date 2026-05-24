@echo off
echo ==> Copie du script dans le conteneur...
docker cp create_tables.hbase hbase:/tmp/create_tables.hbase

echo ==> Execution dans HBase...
docker exec -i hbase hbase shell /tmp/create_tables.hbase

echo ==> Termine.