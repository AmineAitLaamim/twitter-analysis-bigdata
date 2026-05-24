# HBase Setup — Twitter Analysis Big Data Project

## Membre responsable : **[Kamal Bousebbat]**
- **Rôle :** Setup HBase, schéma des tables, test de connectivité

---

## Ce qui a été fait

### 1. Environnement HBase sur Docker
- Utilisation de l'image Docker `dajobe/hbase`
- Lancement du conteneur avec les ports nécessaires (9090 Thrift, 16010 Web UI)
- Résolution du problème de compression SNAPPY (non supportée nativement) → migration vers **GZ**

### 2. Création des tables HBase
4 tables créées avec column families, compression GZ, bloomfilters et TTL :

| Table      | Column Families                        | Particularités              |
|------------|----------------------------------------|-----------------------------|
| `tweets`   | content, meta, analysis                | BLOOMFILTER, TTL 90 jours   |
| `users`    | profile, stats, activity               | —                           |
| `hashtags` | counts, engagement, meta               | —                           |
| `analytics`| data                                   | TTL 2 jours                 |

### 3. Row Keys designées pour éviter les hotspots

| Table      | Row Key Pattern                          | Exemple                        |
|------------|------------------------------------------|--------------------------------|
| tweets     | `{salt}_{user_id}_{reversed_timestamp}`  | `3_user_42853_9999781234567`   |
| users      | `{user_id}`                              | `user_42853`                   |
| hashtags   | `{hashtag}_{reversed_timestamp}`         | `#BigData_9999781234567`       |
| analytics  | `{metric_type}_{time_bucket}`            | `trending_latest`              |

- **Salt** = hash(user_id) % 10 → distribue les écritures sur 10 régions
- **Reversed timestamp** = 9_999_999_999_999 - timestamp_ms → tri du plus récent au plus ancien

### 4. Scripts créés

| Fichier               | Description                                      |
|-----------------------|--------------------------------------------------|
| `create_tables.bat`   | Supprime et recrée les 4 tables automatiquement  |
| `create_tables.hbase` | Commandes HBase shell (appelé par le .bat)       |
| `test_connection.py`  | Teste la connexion et vérifie les 4 tables       |
| `SCHEMA.md`           | Documentation complète du schéma pour l'équipe   |

### 5. Test de connectivité Python
```
Connexion a HBase localhost:9090...
Tables trouvees : ['analytics', 'hashtags', 'tweets', 'users']
  OK  Table 'tweets' presente
  OK  Table 'users' presente
  OK  Table 'hashtags' presente
  OK  Table 'analytics' presente
  OK  Ecriture et lecture sur 'tweets' : reussi
Connectivite HBase : TOUT OK
```

---

## Comment reproduire le setup

### Prérequis
- Docker Desktop installé et démarré

### Étapes
```cmd
# 1. Lancer HBase
docker run -d ^
  --name hbase ^
  -p 9090:9090 ^
  -p 16010:16010 ^
  dajobe/hbase

# 2. Créer les tables
create_tables.bat

# 3. Tester la connexion
pip install happybase
python test_connection.py
```

### Vérification
- Interface Web HBase : http://localhost:16010
- `docker ps` → conteneur `hbase` en vert
- `python test_connection.py` → TOUT OK

---

## Structure des fichiers

```
hbase/
├── create_tables.bat     ← Script Windows pour créer les tables
├── create_tables.hbase   ← Commandes HBase shell
├── test_connection.py    ← Test de connectivité Python
└── SCHEMA.md             ← Documentation complète du schéma
```

---

## Technologies utilisées

| Technologie  | Version  | Rôle                        |
|--------------|----------|-----------------------------|
| HBase        | 2.1.x    | Base de données NoSQL        |
| Docker       | Desktop  | Conteneurisation HBase       |
| Python       | 3.x      | Test de connectivité         |
| happybase    | latest   | Client Python pour HBase     |
| GZ           | —        | Compression des column families |