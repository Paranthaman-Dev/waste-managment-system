"""Collector router – collector‑specific endpoints (placeholder).
Future endpoints will include:
- GET /assignments – list pickups assigned to the collector.
- POST /pickups/{id}/status – update pickup status.
"""

from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"msg": "collector pong"}
