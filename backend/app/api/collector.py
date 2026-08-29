from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone, date, timedelta

from app.api.deps import require_collector, get_db
from app.models import User, Collector, PickupRequest, PickupStatus, WasteBatch, BatchStatus
from app.schemas import (
    CollectorResponse, CollectorUpdate, PickupRequestResponse,
    PickupCollectResponse, PickupRequestUpdate, PaginatedResponse
)

router = APIRouter(prefix="/collector", tags=["collector"])


@router.get("/profile", response_model=CollectorResponse)
async def get_collector_profile(
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collector profile not found"
        )
    return collector


@router.put("/profile", response_model=CollectorResponse)
async def update_collector_profile(
    collector_data: CollectorUpdate,
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collector profile not found"
        )
    
    update_data = collector_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collector, field, value)
    
    await db.commit()
    await db.refresh(collector)
    return collector


@router.get("/pickups", response_model=PaginatedResponse)
async def list_assigned_pickups(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[PickupStatus] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collector profile not found"
        )
    
    query = select(PickupRequest).where(PickupRequest.collector_id == collector.id)
    
    if status_filter:
        query = query.where(PickupRequest.status == status_filter)
    
    if date_from:
        query = query.where(PickupRequest.preferred_time >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(PickupRequest.preferred_time <= datetime.combine(date_to, datetime.max.time()))
    
    query = query.order_by(PickupRequest.preferred_time.asc().nullslast())
    
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


@router.get("/pickups/available", response_model=List[PickupRequestResponse])
async def list_available_pickups(
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector or not collector.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collector not available"
        )
    
    query = select(PickupRequest).where(
        PickupRequest.status == PickupStatus.PENDING,
        PickupRequest.collector_id.is_(None)
    ).order_by(PickupRequest.requested_at.asc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/pickups/{pickup_id}/accept", response_model=PickupRequestResponse)
async def accept_pickup(
    pickup_id: int,
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector or not collector.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collector not available"
        )
    
    result = await db.execute(select(PickupRequest).where(
        PickupRequest.id == pickup_id,
        PickupRequest.status == PickupStatus.PENDING
    ).with_for_update())
    pickup = result.scalar_one_or_none()
    
    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup request not found or already assigned"
        )
    
    pickup.collector_id = collector.id
    pickup.status = PickupStatus.ASSIGNED
    await db.commit()
    await db.refresh(pickup)
    return pickup


@router.post("/pickups/{pickup_id}/decline", response_model=PickupRequestResponse)
async def decline_pickup(
    pickup_id: int,
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    result = await db.execute(select(PickupRequest).where(
        PickupRequest.id == pickup_id,
        PickupRequest.collector_id == collector.id if collector else False
    ))
    pickup = result.scalar_one_or_none()
    
    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup request not found or not assigned to you"
        )
    
    pickup.collector_id = None
    pickup.status = PickupStatus.DECLINED
    await db.commit()
    await db.refresh(pickup)
    return pickup


@router.put("/pickups/{pickup_id}/status", response_model=PickupCollectResponse)
async def update_pickup_status(
    pickup_id: int,
    pickup_data: PickupRequestUpdate,
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    result = await db.execute(select(PickupRequest).where(
        PickupRequest.id == pickup_id,
        PickupRequest.collector_id == collector.id if collector else False
    ))
    pickup = result.scalar_one_or_none()
    
    if not pickup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pickup request not found or not assigned to you"
        )
    
    points_earned = 0
    if pickup_data.status:
        valid_transitions = {
            PickupStatus.ASSIGNED: [PickupStatus.EN_ROUTE, PickupStatus.DECLINED],
            PickupStatus.EN_ROUTE: [PickupStatus.COLLECTED, PickupStatus.DECLINED],
        }
        if pickup.status in valid_transitions and pickup_data.status not in valid_transitions[pickup.status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from {pickup.status.value}"
            )
        pickup.status = pickup_data.status
        if pickup_data.status == PickupStatus.COLLECTED:
            pickup.collected_at = datetime.now(timezone.utc)
            existing_batch = await db.execute(
                select(WasteBatch).where(WasteBatch.pickup_request_id == pickup.id)
            )
            if not existing_batch.scalar_one_or_none():
                db.add(WasteBatch(pickup_request_id=pickup.id, status=BatchStatus.AVAILABLE))
            from app.services.rewards import award_points_for_pickup
            points_earned = await award_points_for_pickup(db, pickup)
    
    await db.commit()
    await db.refresh(pickup)
    return PickupCollectResponse(pickup=PickupRequestResponse.model_validate(pickup), points_earned=points_earned)


@router.get("/schedule", response_model=List[PickupRequestResponse])
async def get_schedule(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.user_id == current_user.id))
    collector = result.scalar_one_or_none()
    
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collector profile not found"
        )
    
    query = select(PickupRequest).where(
        PickupRequest.collector_id == collector.id,
        PickupRequest.preferred_time >= datetime.combine(date_from, datetime.min.time()),
        PickupRequest.preferred_time <= datetime.combine(date_to, datetime.max.time())
    ).order_by(PickupRequest.preferred_time.asc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/bins", response_model=List[object])
async def list_public_bins(
    waste_type: Optional[str] = Query(None),
    current_user: User = Depends(require_collector),
    db: AsyncSession = Depends(get_db)
):
    from app.models import PublicBin
    query = select(PublicBin)
    
    if waste_type:
        query = query.where(PublicBin.accepted_waste_types.contains([waste_type]))
    
    result = await db.execute(query)
    return result.scalars().all()