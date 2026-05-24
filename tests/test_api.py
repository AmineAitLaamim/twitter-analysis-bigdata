from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any

import requests


BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


def has_sentiment_shape(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and all(key in payload for key in ("positive", "neutral", "negative"))
        and all(isinstance(payload[key], int) for key in ("positive", "neutral", "negative"))
    )


def has_timeline_shape(payload: Any) -> bool:
    return (
        isinstance(payload, list)
        and all(
            isinstance(item, dict)
            and all(key in item for key in ("hour", "positive", "neutral", "negative"))
            and all(isinstance(item[key], int) for key in ("positive", "neutral", "negative"))
            for item in payload
        )
    )


def has_geo_shape(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and all(isinstance(country, str) and isinstance(count, int) for country, count in payload.items())
    )


def has_top_users_shape(payload: Any) -> bool:
    return (
        isinstance(payload, list)
        and all(
            isinstance(user, dict)
            and all(key in user for key in ("user_id", "total_tweets", "total_likes", "last_active"))
            and isinstance(user["total_tweets"], int)
            and isinstance(user["total_likes"], int)
            for user in payload
        )
    )


def has_user_shape(payload: Any) -> bool:
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("user_id"), str)
        and isinstance(payload.get("followers"), int)
        and isinstance(payload.get("top_hashtags"), list)
    )


def has_openapi_shape(payload: Any) -> bool:
    expected_paths = {
        "/health",
        "/api/analytics/sentiment",
        "/api/analytics/sentiment/timeline",
        "/api/analytics/geo",
        "/api/users/top",
        "/api/users/{user_id}",
    }
    return isinstance(payload, dict) and expected_paths.issubset(set(payload.get("paths", {})))


TESTS: list[tuple[str, Callable[[Any], bool]]] = [
    ("/health", lambda payload: isinstance(payload, dict) and payload.get("status") == "ok"),
    ("/api/analytics/sentiment", has_sentiment_shape),
    ("/api/analytics/sentiment/timeline?hours=6", has_timeline_shape),
    ("/api/analytics/geo", has_geo_shape),
    ("/api/users/top?limit=3", has_top_users_shape),
    ("/openapi.json", has_openapi_shape),
]


def run() -> int:
    failures = 0
    first_user_id = None

    for endpoint, check in TESTS:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            response.raise_for_status()
            payload = response.json()
            ok = check(payload)
            if endpoint.startswith("/api/users/top") and payload:
                first_user_id = payload[0]["user_id"]
        except Exception as exc:
            failures += 1
            print(f"FAIL {endpoint} - {exc}")
            continue

        if ok:
            print(f"OK   {endpoint}")
        else:
            failures += 1
            print(f"FAIL {endpoint} - wrong response shape")

    if first_user_id:
        endpoint = f"/api/users/{first_user_id}"
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            response.raise_for_status()
            payload = response.json()
            ok = has_user_shape(payload)
        except Exception as exc:
            failures += 1
            print(f"FAIL {endpoint} - {exc}")
        else:
            if ok:
                print(f"OK   {endpoint}")
            else:
                failures += 1
                print(f"FAIL {endpoint} - wrong response shape")
    else:
        print("SKIP /api/users/{user_id} - no users returned by /api/users/top")

    return failures


if __name__ == "__main__":
    raise SystemExit(run())
