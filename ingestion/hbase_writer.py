import json
import os
import happybase
from kafka import KafkaConsumer

# Read connection details from env vars injected by docker-compose
# Use port 29092 (INTERNAL listener) when running inside Docker
KAFKA_HOST = os.environ.get('KAFKA_HOST', 'kafka')
KAFKA_PORT = os.environ.get('KAFKA_PORT', '29092')
HBASE_HOST = os.environ.get('HBASE_HOST', 'hbase')
HBASE_PORT = int(os.environ.get('HBASE_PORT', '9090'))
KAFKA_BOOTSTRAP = f'{KAFKA_HOST}:{KAFKA_PORT}'

print(f"HBase writer démarré — Kafka: {KAFKA_BOOTSTRAP}, HBase: {HBASE_HOST}:{HBASE_PORT}")

consumer = KafkaConsumer(
    'processed-tweets',
    bootstrap_servers=KAFKA_BOOTSTRAP,
    group_id='hbase-writer-group',
    value_deserializer=lambda m: json.loads(m.decode()),
    auto_offset_reset='earliest'
)

conn  = happybase.Connection(HBASE_HOST, port=HBASE_PORT)
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
