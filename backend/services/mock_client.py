# services/mock_client.py


class MockHBaseClient:
    def get_recent_tweets(self, limit=50):
        return [
            {
                "tweet_id": f"3_user_{i}_9999999990000",
                "text": f"Really enjoying #BigData today! Tweet number {i}",
                "hashtags": ["#BigData", "#AI", "#Python"],
                "likes": i * 42,
                "retweets": i * 10,
                "location": "MA",
                "sentiment": "positive"
            }
            for i in range(1, min(limit + 1, 11))
        ]

    def get_viral_tweets(self, limit=10):
        return [
            {
                "tweet_id": f"viral_tweet_{i}",
                "text": f"#AI will change everything in 5 years. Tweet {i}",
                "likes": 1000 + i * 500,
                "user_id": f"user_{i * 1000}"
            }
            for i in range(1, min(limit + 1, 6))
        ]

    def get_trending_hashtags(self, limit=10):
        tags = [
            {"hashtag": "#BigData",     "count": 1520},
            {"hashtag": "#AI",          "count": 1380},
            {"hashtag": "#Python",      "count": 1100},
            {"hashtag": "#Kafka",       "count": 980},
            {"hashtag": "#Morocco",     "count": 870},
            {"hashtag": "#DataScience", "count": 760},
            {"hashtag": "#ML",          "count": 650},
            {"hashtag": "#Cloud",       "count": 540},
            {"hashtag": "#HBase",       "count": 430},
            {"hashtag": "#Tech",        "count": 320},
        ]
        return tags[:limit]

    def get_hashtag_history(self, hashtag, hours=24):
        return [
            {"timestamp": f"202605241{str(h).zfill(2)}", "count": 50 + h * 10}
            for h in range(min(hours, 24))
        ]

    def search_by_hashtag(self, hashtag, limit=50):
        return [
            {
                "tweet_id": f"search_result_{i}",
                "text": f"Working on a {hashtag} project and loving it!",
                "hashtags": [hashtag, "#BigData"],
                "likes": i * 30,
                "location": "US"
            }
            for i in range(1, min(limit + 1, 6))
        ]