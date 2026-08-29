"""Recycler router – recycler‑specific endpoints (placeholder).
Future endpoints will include:
- POST /batches – create a waste batch request.
- GET /batches – list recycler's batches.
- POST /batches/{id}/status – update batch status.
"""

from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"msg": "recycler pong"}
