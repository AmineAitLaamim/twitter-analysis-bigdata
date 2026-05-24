from fastapi import APIRouter, Query
from services.mock_client import MockHBaseClient

router = APIRouter()
hbase  = MockHBaseClient()

@router.get("/trending")
async def trending(limit: int = Query(default=10, le=50)):
    return hbase.get_trending_hashtags(limit)

@router.get("/{hashtag}/history")
async def history(hashtag: str, hours: int = 24):
    return hbase.get_hashtag_history(hashtag, hours)