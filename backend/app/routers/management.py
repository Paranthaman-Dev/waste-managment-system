"""Management router – admin‑level endpoints (placeholder).
Future endpoints will include:
- CRUD for public bins.
- User management (list, edit roles, deactivate).
- Analytics dashboards.
"""

from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"msg": "management pong"}
