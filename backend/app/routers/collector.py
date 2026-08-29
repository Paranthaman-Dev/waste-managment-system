"""Collector router – assignment and status handling.
Provides endpoints:
- GET /collector/pickups – list pickups assigned to the collector.
- GET /collector/pickups/available – list unassigned pickups.
- POST /collector/pickups/{id}/accept – assign the collector to a pickup.
- PUT /collector/pickups/{id}/status – update pickup status (en_route, collected, completed).
- GET /collector/bins – list public bins (optional waste_type filter).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, update

from ..core.dependencies import get_current_user, get_db
from ..models import PickupRequest, PublicBin, User

router = APIRouter(prefix="/collector", tags=["collector"])

def _ensure_collector(user: User):
    if user.role != "collector":
        raise HTTPException(status_code=403, detail="Collector role required")
    return user

@router.get("/pickups")
async def list_assigned(db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_collector(user)
    result = await db.exec(select(PickupRequest).where(PickupRequest.collector_id == user.id))
    return {"items": result.all()}

@router.get("/pickups/available")
async def list_available(db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_collector(user)
    result = await db.exec(select(PickupRequest).where(PickupRequest.collector_id == None))
    return result.all()

@router.post("/pickups/{pickup_id}/accept")
async def accept_pickup(pickup_id: int, db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_collector(user)
    stmt = (
        update(PickupRequest)
        .where(PickupRequest.id == pickup_id, PickupRequest.collector_id == None)
        .values(collector_id=user.id, status="accepted")
        .execution_options(synchronize_session=False)
    )
    result = await db.exec(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=400, detail="Pickup not available or already assigned")
    return {"msg": "Pickup accepted"}

@router.put("/pickups/{pickup_id}/status")
async def update_status(pickup_id: int, status: str, db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_collector(user)
    allowed = {"en_route", "collected", "completed"}
    if status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")
    stmt = (
        update(PickupRequest)
        .where(PickupRequest.id == pickup_id, PickupRequest.collector_id == user.id)
        .values(status=status)
        .execution_options(synchronize_session=False)
    )
    result = await db.exec(stmt)
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pickup not found or not assigned to you")
    return {"msg": f"Status updated to {status}"}

@router.get("/bins")
async def list_bins(waste_type: str | None = None, db = Depends(get_db), user: User = Depends(get_current_user)):
    _ensure_collector(user)
    query = select(PublicBin)
    if waste_type:
        query = query.where(PublicBin.accepted_waste_types.contains([waste_type]))
    result = await db.exec(query)
    return result.all()
