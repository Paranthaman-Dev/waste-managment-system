"""User router – profile and pickup request endpoints (placeholder).
Currently only provides a ``/ping`` endpoint for health checking.
Future work:
- GET /me – return current user profile.
- POST /pickups – create a new pickup request.
- GET /pickups – list user's pickup requests.
"""

from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/ping")
async def ping():
    return {"msg": "pong"}
