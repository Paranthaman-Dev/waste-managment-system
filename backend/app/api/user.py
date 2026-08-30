from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.deps import require_user, get_db
from app.models import User, PickupRequest, PublicBin, PickupStatus
from app.schemas import (
    UserResponse, UserUpdate, PickupRequestCreate, PickupRequestResponse,
    PickupRequestUpdate, PublicBinResponse, PaginatedResponse
)

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(require_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    if user_data.email is not None:
        existing = await db.execute(select(User).where(
            User.email == user_data.email, User.id != current_user.id
        ))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_data.email
    
    if user_data.phone is not None:
        current_user.phone = user_data.phone
    
    if user_data.is_active is not None:
        current_user.is_active = user_data.is_active
    
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/pickups", response_model=PickupRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_pickup_request(
    pickup_data: PickupRequestCreate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    # Location string fallback: parse "lat,lng" from location when explicit coords missing
    pickup_dict = pickup_data.model_dump()
    if pickup_dict.get("latitude") is None and pickup_dict.get("longitude") is None:
        loc = pickup_dict.get("location") or ""
        if "," in loc:
            parts = loc.split(",")
            if len(parts) == 2:
                try:
                    lat = float(parts[0].strip())
                    lng = float(parts[1].strip())
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        pickup_dict["latitude"] = lat
                        pickup_dict["longitude"] = lng
                except (ValueError, AttributeError):
                    pass

    # Resident request limit: max 5 active (pending/assigned/en_route) per user
    existing = await db.execute(
        select(func.count()).select_from(
            select(PickupRequest)
            .where(
                PickupRequest.user_id == current_user.id,
                PickupRequest.status.in_(
                    [PickupStatus.PENDING, PickupStatus.ASSIGNED, PickupStatus.EN_ROUTE]
                ),
            )
            .subquery()
        )
    )
    count = existing.scalar() or 0
    if count >= 5:
        raise HTTPException(
            status_code=429,
            detail="Request limit reached: max 5 active pickups. Complete or cancel existing requests before creating new ones.",
        )

    pickup = PickupRequest(
        user_id=current_user.id,
        **pickup_dict
    )
    db.add(pickup)
    await db.commit()
    await db.refresh(pickup)
    return pickup


@router.get("/pickups", response_model=PaginatedResponse)
async def list_pickup_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[PickupStatus] = Query(None),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(PickupRequest).where(PickupRequest.user_id == current_user.id)
    
    if status_filter:
        query = query.where(PickupRequest.status == status_filter)
    
    query = query.order_by(PickupRequest.requested_at.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    pickups = result.scalars().all()
    
    return PaginatedResponse(
        items=pickups,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/pickups/{pickup_id}", response_model=PickupRequestResponse)
async def get_pickup_request(
    pickup_id: int,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PickupRequest).where(
        PickupRequest.id == pickup_id,
        PickupRequest.user_id == current_user.id
    ))
    pickup = result.scalar_one_or_none()
    
    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup request not found"
        )
    
    return pickup


@router.put("/pickups/{pickup_id}", response_model=PickupRequestResponse)
async def update_pickup_request(
    pickup_id: int,
    pickup_data: PickupRequestUpdate,
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PickupRequest).where(
        PickupRequest.id == pickup_id,
        PickupRequest.user_id == current_user.id
    ))
    pickup = result.scalar_one_or_none()
    
    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup request not found"
        )
    
    if pickup.status != PickupStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update pending requests"
        )
    
    update_data = pickup_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(pickup, field, value)
    
    await db.commit()
    await db.refresh(pickup)
    return pickup


@router.get("/analytics/summary")
async def get_analytics(
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    total_pickups_result = await db.execute(
        select(func.count(PickupRequest.id)).where(PickupRequest.user_id == current_user.id)
    )
    total_pickups = total_pickups_result.scalar()
    
    completed_pickups_result = await db.execute(
        select(func.count(PickupRequest.id)).where(
            PickupRequest.user_id == current_user.id,
            PickupRequest.status == PickupStatus.COLLECTED
        )
    )
    completed_pickups = completed_pickups_result.scalar()
    
    total_kg_result = await db.execute(
        select(func.sum(PickupRequest.quantity_kg)).where(
            PickupRequest.user_id == current_user.id,
            PickupRequest.status == PickupStatus.COLLECTED
        )
    )
    total_kg = total_kg_result.scalar() or 0.0
    
    by_type_result = await db.execute(
        select(PickupRequest.waste_type, func.sum(PickupRequest.quantity_kg), func.count(PickupRequest.id))
        .where(
            PickupRequest.user_id == current_user.id,
            PickupRequest.status == PickupStatus.COLLECTED
        )
        .group_by(PickupRequest.waste_type)
    )
    by_type = [
        {"waste_type": row[0], "total_kg": row[1], "count": row[2]}
        for row in by_type_result.all()
    ]
    
    return {
        "total_pickups": total_pickups,
        "completed_pickups": completed_pickups,
        "total_kg_contributed": total_kg,
        "by_waste_type": by_type
    }


@router.get("/bins", response_model=List[PublicBinResponse])
async def list_public_bins(
    waste_type: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius_km: float = Query(10.0, ge=0.1, le=100),
    current_user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(PublicBin)
    
    if waste_type:
        query = query.where(PublicBin.accepted_waste_types.contains([waste_type]))
    
    result = await db.execute(query)
    bins = result.scalars().all()
    
    if lat is not None and lng is not None:
        from math import radians, sin, cos, sqrt, atan2
        
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            return 2 * R * atan2(sqrt(a), sqrt(1-a))
        
        bins = [b for b in bins if haversine(lat, lng, b.latitude, b.longitude) <= radius_km]
        bins.sort(key=lambda b: haversine(lat, lng, b.latitude, b.longitude))
    
    return bins