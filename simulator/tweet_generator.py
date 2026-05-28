import json
import os
import random
import time
import uuid
from kafka import KafkaProducer

# Read from env vars injected by docker-compose
# Use port 29092 (INTERNAL listener) when running inside Docker
KAFKA_HOST = os.environ.get('KAFKA_HOST', 'kafka')
KAFKA_PORT = os.environ.get('KAFKA_PORT', '29092')
KAFKA_BOOTSTRAP = f'{KAFKA_HOST}:{KAFKA_PORT}'

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP,
    value_serializer=lambda v: json.dumps(v).encode()
)

HASHTAGS  = ['#BigData','#AI','#Python','#HBase','#Kafka',
             '#Tech','#NBA','#Climate','#Gaming','#WorldCup',
             '#OpenAI','#Morocco','#DataScience','#Cloud','#ML']

LOCATIONS = ['US','UK','FR','MA','JP','BR','DE','IN','CA','AU']

TEMPLATES = [
    "Really enjoying {tag} today!",
    "Just learned about {tag} — mind blown.",
    "{tag} is completely broken right now.",
    "Hot take: {tag} is overrated.",
    "Working on a {tag} project and loving it.",
    "{tag} will change everything in 5 years.",
]

def generate_tweet():
    tag   = random.choice(HASHTAGS)
    extra = random.sample(HASHTAGS, k=random.randint(0, 2))
    return {
        "tweet_id":  str(uuid.uuid4()),
        "user_id":   f"user_{random.randint(1, 100_000)}",
        "text":      random.choice(TEMPLATES).format(tag=tag),
        "hashtags":  list(set([tag] + extra)),
        "likes":     random.randint(0, 5000),
        "retweets":  random.randint(0, 1000),
        "timestamp": int(time.time() * 1000),
        "location":  random.choice(LOCATIONS)
    }

# Read tweet rate from env var (docker-compose passes TWEET_RATE=200)
RATE = int(os.environ.get('TWEET_RATE', 200))

print(f"Simulateur démarré — {RATE} tweets/seconde → {KAFKA_BOOTSTRAP}")

while True:
    tweet = generate_tweet()
    producer.send('raw-tweets', tweet)
    time.sleep(1 / RATE)