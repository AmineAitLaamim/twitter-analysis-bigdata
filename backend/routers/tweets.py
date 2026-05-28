from fastapi import APIRouter, Query
from services.hbase_client import HBaseClient

router = APIRouter()
hbase  = HBaseClient()

@router.get("/recent")
async def recent(limit: int = Query(default=50, le=200)):
    return hbase.get_recent_tweets(limit)

@router.get("/viral")
async def viral():
    return hbase.get_viral_tweets()

@router.get("/search")
async def search(hashtag: str, limit: int = 50):
    return hbase.search_by_hashtag(hashtag, limit)
