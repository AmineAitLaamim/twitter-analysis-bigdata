from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, users, tweets, hashtags
from config import CORS_ORIGINS

app = FastAPI(title="Social Media Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router,     prefix="/api/users",     tags=["Users"])
app.include_router(tweets.router,   prefix="/api/tweets",   tags=["Tweets"])
app.include_router(hashtags.router, prefix="/api/hashtags", tags=["Hashtags"])

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}