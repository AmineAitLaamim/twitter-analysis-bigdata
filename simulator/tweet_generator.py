import json
import random
import time
import uuid
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
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

RATE = 10  # augmente à 200 pour la démo

print(f"Simulateur démarré — {RATE} tweets/seconde")

while True:
    tweet = generate_tweet()
    producer.send('raw-tweets', tweet)
    time.sleep(1 / RATE)