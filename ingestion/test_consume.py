import json, os
from kafka import KafkaConsumer

KAFKA_HOST = os.environ.get('KAFKA_HOST', 'kafka')
KAFKA_PORT = os.environ.get('KAFKA_PORT', '29092')
KAFKA_BOOTSTRAP = f'{KAFKA_HOST}:{KAFKA_PORT}'

print(f'Connecting to {KAFKA_BOOTSTRAP}, topic: processed-tweets')

consumer = KafkaConsumer(
    'processed-tweets',
    bootstrap_servers=KAFKA_BOOTSTRAP,
    group_id='test-check-group-2',
    value_deserializer=lambda m: json.loads(m.decode()),
    auto_offset_reset='latest',
    consumer_timeout_ms=20000
)

count = 0
for msg in consumer:
    t = msg.value
    sent = t.get('sentiment', 'MISSING')
    score = t.get('sentiment_score', 'MISSING')
    print(f'Tweet: sentiment={sent}, score={score}, text={t.get("text", "")[:50]}')
    count += 1
    if count >= 5:
        break

print(f'Total received: {count}')
