# Member 2 — Kafka + Tweet Simulator

## Rôle
Générer de faux tweets et les envoyer dans Kafka.
C'est le point de départ de tout le pipeline.

## Lancer Kafka
```bash
docker compose up -d zookeeper kafka
```

## Créer les topics
```bash
./create_topics.sh
```

## Lancer le simulateur
```bash
pip install -r requirements.txt
python tweet_generator.py
```

## Vérifier que ça marche
```bash
docker exec kafka kafka-console-consumer \
  --topic raw-tweets \
  --bootstrap-server localhost:9092 \
  --from-beginning --max-messages 5
```

## Fichiers
| Fichier | Description |
|---|---|
| `tweet_generator.py` | Génère 10 tweets/seconde vers `raw-tweets` |
| `create_topics.sh` | Crée les 3 topics Kafka |
| `requirements.txt` | Dépendances Python |

## Pour mes collègues
- **Member 3 (Spark)** : connecte-toi à `kafka:29092` topic `raw-tweets`
