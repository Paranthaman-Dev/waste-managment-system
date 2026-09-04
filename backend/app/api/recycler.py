from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, timezone
import uuid
from pathlib import Path

from app.api.deps import require_recycler, get_db
from app.core.config import get_settings
from app.models import User, Recycler, WasteBatch, BatchStatus, PickupRequest
from app.schemas import (
    RecyclerResponse, RecyclerUpdate, WasteBatchResponse,
    WasteBatchUpdate, PaginatedResponse
)

settings = get_settings()

router = APIRouter(prefix="/recycler", tags=["recycler"])


@router.get("/profile", response_model=RecyclerResponse)
async def get_recycler_profile(
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler profile not found"
        )
    return recycler


@router.put("/profile", response_model=RecyclerResponse)
async def update_recycler_profile(
    recycler_data: RecyclerUpdate,
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler profile not found"
        )
    
    update_data = recycler_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recycler, field, value)
    
    await db.commit()
    await db.refresh(recycler)
    return recycler


@router.get("/batches", response_model=PaginatedResponse)
async def list_available_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    waste_type: Optional[str] = Query(None),
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    query = select(WasteBatch).where(WasteBatch.status == BatchStatus.AVAILABLE)
    
    if waste_type:
        query = query.join(PickupRequest).where(PickupRequest.waste_type == waste_type)
    
    query = query.order_by(WasteBatch.id.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    batches = result.scalars().all()
    
    return PaginatedResponse(
        items=batches,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/batches/my", response_model=PaginatedResponse)
async def list_my_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[BatchStatus] = Query(None),
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler profile not found"
        )
    
    query = select(WasteBatch).where(WasteBatch.recycler_id == recycler.id)
    
    if status_filter:
        query = query.where(WasteBatch.status == status_filter)
    
    query = query.order_by(WasteBatch.id.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    batches = result.scalars().all()
    
    return PaginatedResponse(
        items=batches,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/batches/{batch_id}/request", response_model=WasteBatchResponse)
async def request_batch(
    batch_id: int,
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler profile not found"
        )
    
    result = await db.execute(select(WasteBatch).where(
        WasteBatch.id == batch_id,
        WasteBatch.status == BatchStatus.AVAILABLE
    ).with_for_update())
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found or not available"
        )
    
    batch.recycler_id = recycler.id
    batch.status = BatchStatus.REQUESTED
    await db.commit()
    await db.refresh(batch)
    return batch


@router.post("/batches/{batch_id}/accept", response_model=WasteBatchResponse)
async def accept_batch(
    batch_id: int,
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    result = await db.execute(select(WasteBatch).where(
        WasteBatch.id == batch_id,
        WasteBatch.recycler_id == recycler.id if recycler else False
    ).with_for_update())
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found or not assigned to you"
        )
    
    if batch.status != BatchStatus.REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch must be in requested status to accept"
        )
    
    batch.status = BatchStatus.ACCEPTED
    batch.handed_over_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(batch)
    return batch


@router.put("/batches/{batch_id}", response_model=WasteBatchResponse)
async def update_batch_status(
    batch_id: int,
    batch_data: WasteBatchUpdate,
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    result = await db.execute(select(WasteBatch).where(
        WasteBatch.id == batch_id,
        WasteBatch.recycler_id == recycler.id if recycler else False
    ))
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found or not assigned to you"
        )
    
    update_data = batch_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(batch, field, value)
    
    if batch_data.status == BatchStatus.COMPLETED and batch.status != BatchStatus.COMPLETED:
        batch.processed_at = datetime.now(timezone.utc)
        # Recycler verification: award (or confirm) resident points idempotently.
        from app.services.rewards import award_points_for_pickup
        presult = await db.execute(select(PickupRequest).where(PickupRequest.id == batch.pickup_request_id))
        related_pickup = presult.scalar_one_or_none()
        if related_pickup is not None:
            await award_points_for_pickup(db, related_pickup, batch_id=batch.id)
    
    await db.commit()
    await db.refresh(batch)
    return batch


@router.post("/batches/{batch_id}/proof", response_model=WasteBatchResponse)
async def upload_proof(
    batch_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    result = await db.execute(select(WasteBatch).where(
        WasteBatch.id == batch_id,
        WasteBatch.recycler_id == recycler.id if recycler else False
    ))
    batch = result.scalar_one_or_none()
    
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found or not assigned to you"
        )
    
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed"
        )
    
    upload_dir = Path(settings.UPLOAD_DIR) / "proofs"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    batch.proof_url = f"/uploads/proofs/{filename}"
    
    # Mass Recycled KPI fix: allow ACCEPTED/REQUESTED to complete on proof upload
    # (previously only PROCESSING → COMPLETED, so KPI always showed 0 kg)
    if batch.status != BatchStatus.COMPLETED:
        batch.status = BatchStatus.COMPLETED
        batch.processed_at = datetime.now(timezone.utc)
        # award resident points idempotently when recycling completes
        from app.services.rewards import award_points_for_pickup
        presult = await db.execute(select(PickupRequest).where(PickupRequest.id == batch.pickup_request_id))
        pickup = presult.scalar_one_or_none()
        if pickup is not None:
            try:
                await award_points_for_pickup(db, pickup, batch_id=batch.id)
            except Exception:
                pass
    
    await db.commit()
    await db.refresh(batch)
    return batch


@router.get("/analytics/summary")
async def get_recycler_analytics(
    current_user: User = Depends(require_recycler),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.user_id == current_user.id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler profile not found"
        )
    
    total_batches_result = await db.execute(
        select(func.count(WasteBatch.id)).where(WasteBatch.recycler_id == recycler.id)
    )
    total_batches = total_batches_result.scalar()
    
    completed_batches_result = await db.execute(
        select(func.count(WasteBatch.id)).where(
            WasteBatch.recycler_id == recycler.id,
            WasteBatch.status == BatchStatus.COMPLETED
        )
    )
    completed_batches = completed_batches_result.scalar()
    
    total_kg_result = await db.execute(
        select(func.sum(PickupRequest.quantity_kg))
        .join(WasteBatch, WasteBatch.pickup_request_id == PickupRequest.id)
        .where(WasteBatch.recycler_id == recycler.id, WasteBatch.status == BatchStatus.COMPLETED)
    )
    total_kg = total_kg_result.scalar() or 0.0
    
    by_type_result = await db.execute(
        select(PickupRequest.waste_type, func.sum(PickupRequest.quantity_kg), func.count(WasteBatch.id))
        .join(WasteBatch, WasteBatch.pickup_request_id == PickupRequest.id)
        .where(WasteBatch.recycler_id == recycler.id, WasteBatch.status == BatchStatus.COMPLETED)
        .group_by(PickupRequest.waste_type)
    )
    by_type = [
        {"waste_type": row[0], "total_kg": row[1], "count": row[2]}
        for row in by_type_result.all()
    ]
    
    return {
        "total_batches": total_batches,
        "completed_batches": completed_batches,
        "total_kg_processed": total_kg,
        "by_waste_type": by_type
    }