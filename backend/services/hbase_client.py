import happybase
from fastapi import HTTPException
from config import HBASE_HOST, HBASE_PORT
from datetime import datetime, timedelta


class HBaseClient:
    def __init__(self):
        try:
            self.conn = happybase.Connection(HBASE_HOST, port=HBASE_PORT)
        except Exception as e:
            print(f"⚠️  HBase connection failed: {e}")
            self.conn = None

    def _check_connection(self):
        if self.conn is None:
            raise HTTPException(
                status_code=503,
                detail="HBase is not available. Make sure Docker is running."
            )

    def get_recent_tweets(self, limit=50):
        self._check_connection()
        try:
            table = self.conn.table('tweets')
            result = []
            for key, data in table.scan(limit=limit):
                result.append({
                    "tweet_id":  key.decode(),
                    "text":      data.get(b'content:text', b'').decode(),
                    "hashtags":  data.get(b'content:hashtags', b'').decode().split(','),
                    "likes":     int(data.get(b'meta:likes', b'0')),
                    "retweets":  int(data.get(b'meta:retweets', b'0')),
                    "location":  data.get(b'meta:location', b'').decode(),
                    "sentiment": data.get(b'analysis:sentiment', b'neutral').decode(),
                })
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_viral_tweets(self, limit=10):
        self._check_connection()
        try:
            table = self.conn.table('analytics')
            result = []
            for key, data in table.scan(row_prefix=b'viral_', limit=limit):
                result.append({
                    "tweet_id": key.decode().replace('viral_', ''),
                    "text":     data.get(b'data:text', b'').decode(),
                    "likes":    int(data.get(b'data:likes', b'0')),
                    "user_id":  data.get(b'data:user_id', b'').decode(),
                })
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_trending_hashtags(self, limit=10):
        self._check_connection()
        try:
            table = self.conn.table('analytics')
            row   = table.row(b'trending_latest')
            tags  = [
                {"hashtag": c.decode().replace('data:', ''), "count": int(v)}
                for c, v in row.items()
            ]
            return sorted(tags, key=lambda x: x['count'], reverse=True)[:limit]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_hashtag_history(self, hashtag, hours=24):
        self._check_connection()
        try:
            table  = self.conn.table('hashtags')
            result = []
            for key, data in table.scan(row_prefix=f'{hashtag}_'.encode(), limit=hours):
                result.append({
                    "timestamp": key.decode().split('_')[1],
                    "count":     int(data.get(b'counts:uses_last_hour', b'0')),
                })
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def search_by_hashtag(self, hashtag, limit=50):
        self._check_connection()
        try:
            table  = self.conn.table('tweets')
            result = []
            for key, data in table.scan(limit=limit*10):
                hashtags = data.get(b'content:hashtags', b'').decode()
                if hashtag.lower() in hashtags.lower():
                    result.append({
                        "tweet_id": key.decode(),
                        "text":     data.get(b'content:text', b'').decode(),
                        "hashtags": hashtags.split(','),
                        "likes":    int(data.get(b'meta:likes', b'0')),
                        "location": data.get(b'meta:location', b'').decode(),
                    })
                if len(result) >= limit:
                    break
            return result
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_sentiment_stats(self):
        self._check_connection()
        try:
            row = self.conn.table('analytics').row(b'sentiment_latest')
            return {
                "positive": int(row.get(b'data:positive', b'0')),
                "neutral":  int(row.get(b'data:neutral',  b'0')),
                "negative": int(row.get(b'data:negative', b'0')),
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_sentiment_timeline(self, hours=24):
        self._check_connection()
        try:
            table = self.conn.table('analytics')
            result = []

            for i in range(hours):
                bucket = (datetime.now() - timedelta(hours=i)).strftime('%Y%m%d%H')
                row = table.row(f'sentiment_{bucket}'.encode())
                if row:
                    result.append({
                        "hour":     bucket,
                        "positive": int(row.get(b'data:positive', b'0')),
                        "neutral":  int(row.get(b'data:neutral',  b'0')),
                        "negative": int(row.get(b'data:negative', b'0')),
                    })

            return list(reversed(result))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_geo_distribution(self):
        self._check_connection()
        try:
            row = self.conn.table('analytics').row(b'geo_latest')
            return {
                column.decode().replace('data:', ''): int(value)
                for column, value in row.items()
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_top_users(self, limit=10):
        self._check_connection()
        try:
            table = self.conn.table('users')
            users = []

            for key, data in table.scan(limit=200):
                users.append({
                    "user_id":      key.decode(),
                    "total_tweets": int(data.get(b'stats:total_tweets', b'0')),
                    "total_likes":  int(data.get(b'stats:total_likes',  b'0')),
                    "followers":    int(data.get(b'stats:followers',    b'0')),
                    "last_active":  data.get(b'activity:last_active', b'').decode(),
                })

            return sorted(users, key=lambda x: x['total_tweets'], reverse=True)[:limit]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_user(self, user_id):
        self._check_connection()
        try:
            row = self.conn.table('users').row(user_id.encode())
            if not row:
                return None

            top_hashtags = row.get(b'activity:top_hashtags', b'').decode()
            return {
                "user_id":      user_id,
                "username":     row.get(b'profile:username', b'').decode(),
                "display_name": row.get(b'profile:display_name', b'').decode(),
                "location":     row.get(b'profile:location', b'').decode(),
                "total_tweets": int(row.get(b'stats:total_tweets', b'0')),
                "total_likes":  int(row.get(b'stats:total_likes',  b'0')),
                "followers":    int(row.get(b'stats:followers',    b'0')),
                "last_active":  row.get(b'activity:last_active', b'').decode(),
                "top_hashtags": [tag for tag in top_hashtags.split(',') if tag],
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
