from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_management, require_user
from app.models import Redemption, RedemptionStatus, Voucher
from app.schemas import (
    RedemptionResponse,
    VoucherCreate,
    VoucherResponse,
    VoucherUpdate,
    PaginatedResponse,
)
from app.services.rewards import redeem_voucher

router = APIRouter(prefix="/vouchers", tags=["vouchers"])


@router.get("", response_model=List[VoucherResponse])
async def list_active_vouchers(
    current_user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    # Use naive UTC to match sqlite storage (stored as naive after replace(tzinfo=None) in model)
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    query = select(Voucher).where(
        Voucher.active.is_(True),
        (Voucher.valid_until.is_(None)) | (Voucher.valid_until > now_naive),
    ).order_by(Voucher.cost_points.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/all", response_model=List[VoucherResponse])
async def list_all_vouchers(
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Voucher).order_by(Voucher.created_at.desc()))
    return result.scalars().all()


@router.get("/redemptions", response_model=PaginatedResponse)
async def list_redemptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    query = select(Redemption)
    if status_filter:
        query = query.where(Redemption.status == status_filter)
    query = query.order_by(Redemption.redeemed_at.desc())
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query.options(selectinload(Redemption.voucher)).options(selectinload(Redemption.user)))
    items = result.scalars().all()
    enriched = []
    for red in items:
        resp = RedemptionResponse.model_validate(red)
        if red.voucher is not None:
            resp.voucher_title = red.voucher.title
        if red.user is not None:
            resp.username = red.user.username
        enriched.append(resp)
    return PaginatedResponse(
        items=enriched,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/my-redemptions", response_model=List[RedemptionResponse])
async def list_my_redemptions(
    current_user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Redemption)
        .where(Redemption.user_id == current_user.id)
        .order_by(Redemption.redeemed_at.desc())
    )
    items = result.scalars().all()
    enriched = []
    for red in items:
        resp = RedemptionResponse.model_validate(red)
        voucher = (await db.execute(select(Voucher).where(Voucher.id == red.voucher_id))).scalar_one_or_none()
        if voucher is not None:
            resp.voucher_title = voucher.title
        resp.username = current_user.username
        enriched.append(resp)
    return enriched


@router.patch("/redemptions/{redemption_id}", response_model=RedemptionResponse)
async def update_redemption_status(
    redemption_id: int,
    new_status: RedemptionStatus,
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Redemption).where(Redemption.id == redemption_id))
    redemption = result.scalar_one_or_none()
    if not redemption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Redemption not found")
    if redemption.status == RedemptionStatus.ISSUED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redemption already issued")
    if redemption.status == RedemptionStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Redemption already cancelled")
    if new_status == RedemptionStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PENDING is the initial status")
    # Refund points on cancellation so user balance is restored (idempotent, guarded above)
    if new_status == RedemptionStatus.CANCELLED:
        from app.models import RewardBalance
        from datetime import datetime, timezone
        bal_result = await db.execute(
            select(RewardBalance).where(RewardBalance.user_id == redemption.user_id).with_for_update()
        )
        bal = bal_result.scalar_one_or_none()
        if bal is None:
            bal = RewardBalance(user_id=redemption.user_id, balance=0, lifetime_earned=0)
            db.add(bal)
            await db.flush()
        bal.balance += int(redemption.points_spent)
        # audit trail for refund
        from app.models import AuditLog
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="rewards.refunded",
            entity_type="redemption",
            entity_id=redemption.id,
        )
        db.add(audit)
    elif new_status == RedemptionStatus.ISSUED:
        from app.models import AuditLog
        audit = AuditLog(
            actor_user_id=current_user.id,
            action="rewards.issued",
            entity_type="redemption",
            entity_id=redemption.id,
        )
        db.add(audit)
    redemption.status = new_status
    await db.commit()
    await db.refresh(redemption)
    return redemption





@router.post("/redeem/{voucher_id}", response_model=RedemptionResponse, status_code=status.HTTP_201_CREATED)
async def redeem(
    voucher_id: int,
    current_user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    redemption = await redeem_voucher(db, current_user.id, voucher_id)
    await db.commit()
    await db.refresh(redemption)
    return redemption


@router.post("", response_model=VoucherResponse, status_code=status.HTTP_201_CREATED)
async def create_voucher(
    payload: VoucherCreate,
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timezone
    # Normalize valid_until to naive UTC for consistent sqlite storage and comparison
    vu = payload.valid_until
    if vu is not None and vu.tzinfo is not None:
        vu = vu.astimezone(timezone.utc).replace(tzinfo=None)
    voucher = Voucher(
        title=payload.title,
        description=payload.description,
        cost_points=payload.cost_points,
        active=payload.active,
        created_by=current_user.id,
        valid_until=vu,
    )
    db.add(voucher)
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.patch("/{voucher_id}", response_model=VoucherResponse)
async def update_voucher(
    voucher_id: int,
    payload: VoucherUpdate,
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timezone
    result = await db.execute(select(Voucher).where(Voucher.id == voucher_id))
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    data = payload.model_dump(exclude_unset=True)
    # Normalize valid_until to naive UTC if present
    if "valid_until" in data and data["valid_until"] is not None:
        vu = data["valid_until"]
        if hasattr(vu, "tzinfo") and vu.tzinfo is not None:
            data["valid_until"] = vu.astimezone(timezone.utc).replace(tzinfo=None)
    for k, v in data.items():
        setattr(voucher, k, v)
    await db.commit()
    await db.refresh(voucher)
    return voucher


@router.delete("/{voucher_id}", status_code=status.HTTP_200_OK)
async def delete_voucher(
    voucher_id: int,
    current_user=Depends(require_management),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete: deactivate so it disappears from the active list while
    keeping redemption history referentially intact."""
    result = await db.execute(select(Voucher).where(Voucher.id == voucher_id))
    voucher = result.scalar_one_or_none()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voucher not found")
    voucher.active = False
    await db.commit()
    return {"message": "Voucher deactivated"}
