from fastapi import APIRouter, Query
from services.mock_client import MockHBaseClient

router = APIRouter()
hbase  = MockHBaseClient()

@router.get("/recent")
async def recent(limit: int = Query(default=50, le=200)):
    return hbase.get_recent_tweets(limit)

@router.get("/viral")
async def viral():
    return hbase.get_viral_tweets()

@router.get("/search")
async def search(hashtag: str, limit: int = 50):
    return hbase.search_by_hashtag(hashtag, limit)