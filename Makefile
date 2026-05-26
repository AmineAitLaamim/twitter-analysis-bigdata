.PHONY: help hbase-start hbase-tables hbase-test hbase-setup up down build

# Default target
help:
	@echo "Twitter Analysis Big Data Project - Makefile"
	@echo ""
	@echo "Available commands:"
	@echo "--------------------------------------------------------"
	@echo "  make up            - Start all services via docker-compose"
	@echo "  make down          - Stop all services via docker-compose"
	@echo "  make build         - Build and start all services via docker-compose"
	@echo ""
	@echo "  make setup         - Start services and initialize HBase tables"
	@echo ""
	@echo "HBase Specific commands (from README.md):"
	@echo "--------------------------------------------------------"
	@echo "  make hbase-start   - Start standalone HBase container"
	@echo "  make hbase-tables  - Create HBase tables in the running container"
	@echo "  make hbase-test    - Run Python connectivity test"
	@echo "  make hbase-setup   - Run all standalone HBase setup steps sequentially"

# Main project commands
up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose up -d --build

setup: up
	@echo "Waiting for HBase to start (15 seconds)..."
	@sleep 15
	@make hbase-tables
	@echo "Setup complete! HBase tables created."

# HBase specific commands
hbase-start:
	docker run -d --name hbase -p 9090:9090 -p 16010:16010 dajobe/hbase

hbase-tables:
	@echo "Copying script to HBase container..."
	docker compose cp hbase/create_tables.hbase hbase:/tmp/create_tables.hbase || docker cp hbase/create_tables.hbase hbase:/tmp/create_tables.hbase || docker compose cp hbase/create_tables.hbase hbase-1:/tmp/create_tables.hbase
	@echo "Executing script in HBase..."
	docker compose exec -T hbase hbase shell /tmp/create_tables.hbase || docker exec -i hbase hbase shell /tmp/create_tables.hbase

hbase-test:
	pip install -r spark/requirements.txt
	cd hbase && python test_connection.py

hbase-setup: hbase-start hbase-tables hbase-test
	@echo "HBase setup completed successfully!"
