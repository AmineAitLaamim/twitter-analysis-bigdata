from fastapi import APIRouter, Query

from services.mock_hbase import MockHBaseClient


router = APIRouter()
hbase = MockHBaseClient()


@router.get("/sentiment")
async def sentiment() -> dict[str, int]:
    return hbase.get_sentiment_stats()


@router.get("/sentiment/timeline")
async def sentiment_timeline(
    hours: int = Query(default=24, ge=1, le=168),
) -> list[dict[str, int | str]]:
    return hbase.get_sentiment_timeline(hours)


@router.get("/geo")
async def geo() -> dict[str, int]:
    return hbase.get_geo_distribution()
