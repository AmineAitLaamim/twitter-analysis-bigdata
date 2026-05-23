from typing import Any

from fastapi import APIRouter, HTTPException, Query

from services.mock_hbase import MockHBaseClient


router = APIRouter()
hbase = MockHBaseClient()


@router.get("/top")
async def top_users(
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict[str, Any]]:
    return hbase.get_top_users(limit)


@router.get("/{user_id}")
async def user_detail(user_id: str) -> dict[str, Any]:
    user = hbase.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
