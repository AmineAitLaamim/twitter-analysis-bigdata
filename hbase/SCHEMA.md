# HBase Schema — Contrat de l'equipe

---

## Démarrage rapide

### Prérequis
Docker Desktop doit être installé.
Télécharge sur https://docker.com si ce n'est pas fait.
Vérifie avec :
```cmd
docker --version
```

### Lancer HBase
```cmd
docker run -d ^
  --name hbase ^
  -p 9090:9090 ^
  -p 16010:16010 ^
  dajobe/hbase
```

### Vérifier que ça tourne
```cmd
docker ps
docker logs hbase
```

### Vérifier l'interface web
Ouvre http://localhost:16010 dans le navigateur.
Tu dois voir la HBase Master UI avec l'état du cluster.

### Créer les tables
```cmd
create_tables.bat
```

### Tester la connexion
```cmd
python test_connection.py
```

### Checklist avant de continuer
- [ ] Docker Desktop installé et démarré
- [ ] Container HBase tourne (`docker ps`)
- [ ] Port 9090 accessible
- [ ] Interface web ouverte : http://localhost:16010
- [ ] Tables créées (`create_tables.bat`)
- [ ] Test de connexion OK (`python test_connection.py`)

---

## Dépendances Python

```cmd
pip install happybase
```

---

## Notes importantes

- L'image utilisée est `dajobe/hbase` (pas de Dockerfile custom nécessaire)
- Compression **SNAPPY non disponible** sur cette image → on utilise **GZ** à la place
- Le WARNING `Unable to load native-hadoop library` est **normal**, ignorez-le
- Les données sont **perdues** si le conteneur est supprimé (pas de volume persistant)
- Pour entrer dans le shell HBase manuellement :
```cmd
docker exec -it hbase hbase shell
```

---

## Connexion

| Paramètre | Valeur                    |
|-----------|---------------------------|
| Host      | localhost                 |
| Port      | 9090 (Thrift)             |
| Web UI    | http://localhost:16010    |

---

## Table : tweets

**Row Key :** `{salt}_{user_id}_{reversed_timestamp}`
- salt = hash(user_id) % 10  (evite les hotspots)
- reversed_ts = 9_999_999_999_999 - timestamp_ms

Exemple reel : `3_user_42853_9999781234567`

| Column Family | Qualifier | Type   | Description                |
|---------------|-----------|--------|----------------------------|
| content       | text      | string | Texte du tweet             |
| content       | hashtags  | string | Liste separee par ','      |
| meta          | likes     | int    | Nombre de likes            |
| meta          | retweets  | int    | Nombre de retweets         |
| meta          | location  | string | Code pays (US, FR...)      |
| analysis      | sentiment | string | positive/neutral/negative  |
| analysis      | score     | float  | Score de -1.0 a 1.0        |

---

## Table : users

**Row Key :** `{user_id}`
Exemple reel : `user_42853`

| Column Family | Qualifier      | Description             |
|---------------|----------------|-------------------------|
| profile       | username       | Nom affiché             |
| stats         | tweet_count    | Nb total de tweets      |
| stats         | follower_count | Nb de followers         |
| activity      | last_seen      | Dernier timestamp ms    |

---

## Table : hashtags

**Row Key :** `{hashtag}_{reversed_timestamp}`
Exemple reel : `#BigData_9999781234567`

| Column Family | Qualifier  | Description               |
|---------------|------------|---------------------------|
| counts        | total      | Nb total d'occurrences    |
| engagement    | likes_sum  | Total likes sur ce tag    |
| meta          | first_seen | Premier timestamp         |

---

## Table : analytics

**Row Key :** `{metric_type}_{time_bucket}`

Row keys predefinies utilisees par Spark :
- `trending_latest`
- `sentiment_latest`
- `sentiment_20240101_14`  (historique par heure)

| Column Family | Qualifier | Description               |
|---------------|-----------|---------------------------|
| data          | #BigData  | Count hashtag trending    |
| data          | positive  | Count tweets positifs     |
| data          | neutral   | Count tweets neutres      |
| data          | negative  | Count tweets negatifs     |

---

## Exemples de lecture Python (pour Members 5 & 6)

### Connexion
```python
import happybase
conn = happybase.Connection('localhost', port=9090)
```

### Lire trending hashtags
```python
table = conn.table('analytics')
row   = table.row(b'trending_latest')
data  = {k.decode().replace('data:',''):int(v) for k,v in row.items()}
```

### Scanner tweets d'un user
```python
table = conn.table('tweets')
for salt in range(10):
    prefix = f'{salt}_user_42853_'.encode()
    for key, data in table.scan(row_prefix=prefix):
        print(data[b'content:text'].decode())
```
