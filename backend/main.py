from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, users


app = FastAPI(title="Social Media Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
