"""User router – profile and pickup request handling.
Provides endpoints:
- GET /user/me – return current user profile.
- GET /user/bins – list public bins, optional ?waste_type filter.
- GET /user/pickups – list user's pickup requests.
- POST /user/pickups – create a new pickup request.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from ..core.dependencies import get_current_user, get_db
from ..models import User, PickupRequest, PublicBin
from ..schemas import UserRead

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_user)):
    return UserRead.from_orm(current_user)

@router.get("/bins")
async def list_bins(waste_type: str | None = None, db = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(PublicBin)
    if waste_type:
        query = query.where(PublicBin.accepted_waste_types.contains([waste_type]))
    result = await db.exec(query)
    return result.all()

@router.get("/pickups")
async def list_pickups(db = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.exec(select(PickupRequest).where(PickupRequest.user_id == user.id))
    return {"items": result.all()}

@router.post("/pickups")
async def create_pickup(pickup: dict, db = Depends(get_db), user: User = Depends(get_current_user)):
    required = {"waste_type", "quantity_kg", "location"}
    if not required.issubset(pickup):
        raise HTTPException(status_code=400, detail="Missing required fields")
    new = PickupRequest(
        user_id=user.id,
        waste_type=pickup["waste_type"],
        quantity_kg=pickup["quantity_kg"],
        location=pickup["location"],
        status="pending",
    )
    db.add(new)
    await db.commit()
    await db.refresh(new)
    return new
