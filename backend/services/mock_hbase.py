from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


class MockHBaseClient:
    """Temporary in-memory HBase replacement while upstream pipeline work lands."""

    def __init__(self) -> None:
        self._sentiment = {
            "positive": 1248,
            "neutral": 934,
            "negative": 318,
        }
        self._geo_distribution = {
            "US": 740,
            "MA": 510,
            "FR": 386,
            "UK": 335,
            "DE": 271,
            "IN": 244,
            "JP": 198,
            "CA": 176,
            "BR": 149,
            "AU": 91,
        }
        self._users = [
            {
                "user_id": "user_1024",
                "username": "data_mina",
                "display_name": "Mina El Fassi",
                "total_tweets": 184,
                "total_likes": 42350,
                "followers": 15200,
                "last_active": "2026052400",
                "location": "MA",
                "top_hashtags": ["#BigData", "#AI", "#Morocco"],
            },
            {
                "user_id": "user_2048",
                "username": "kafka_daily",
                "display_name": "Kafka Daily",
                "total_tweets": 161,
                "total_likes": 39120,
                "followers": 28700,
                "last_active": "2026052323",
                "location": "US",
                "top_hashtags": ["#Kafka", "#Cloud", "#DataScience"],
            },
            {
                "user_id": "user_3187",
                "username": "spark_notes",
                "display_name": "Spark Notes",
                "total_tweets": 146,
                "total_likes": 33410,
                "followers": 9800,
                "last_active": "2026052322",
                "location": "FR",
                "top_hashtags": ["#Spark", "#Python", "#ML"],
            },
            {
                "user_id": "user_4096",
                "username": "hbase_ops",
                "display_name": "HBase Ops",
                "total_tweets": 139,
                "total_likes": 28750,
                "followers": 7600,
                "last_active": "2026052321",
                "location": "DE",
                "top_hashtags": ["#HBase", "#BigData", "#Tech"],
            },
            {
                "user_id": "user_5120",
                "username": "ai_nadia",
                "display_name": "Nadia AI",
                "total_tweets": 121,
                "total_likes": 25280,
                "followers": 22300,
                "last_active": "2026052320",
                "location": "UK",
                "top_hashtags": ["#AI", "#OpenAI", "#ML"],
            },
            {
                "user_id": "user_6144",
                "username": "cloud_youssef",
                "display_name": "Youssef Cloud",
                "total_tweets": 96,
                "total_likes": 17840,
                "followers": 6400,
                "last_active": "2026052319",
                "location": "CA",
                "top_hashtags": ["#Cloud", "#Tech", "#Python"],
            },
        ]

    def get_sentiment_stats(self) -> dict[str, int]:
        return dict(self._sentiment)

    def get_sentiment_timeline(self, hours: int = 24) -> list[dict[str, int | str]]:
        hours = max(1, min(hours, 168))
        now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
        timeline = []

        for offset in range(hours - 1, -1, -1):
            bucket_time = now - timedelta(hours=offset)
            growth = hours - offset
            timeline.append(
                {
                    "hour": bucket_time.strftime("%Y%m%d%H"),
                    "positive": 90 + growth * 4,
                    "neutral": 70 + growth * 3,
                    "negative": 18 + growth,
                }
            )

        return timeline

    def get_geo_distribution(self) -> dict[str, int]:
        return dict(self._geo_distribution)

    def get_top_users(self, limit: int = 10) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 50))
        users = sorted(self._users, key=lambda user: user["total_tweets"], reverse=True)
        return [dict(user) for user in users[:limit]]

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        for user in self._users:
            if user["user_id"] == user_id:
                return dict(user)
        return None
