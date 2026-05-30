import os

# HBase connection
HBASE_HOST = os.getenv("HBASE_HOST", "localhost")
HBASE_PORT = int(os.getenv("HBASE_PORT", "9090"))

# CORS — allows React frontend to call the API
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]