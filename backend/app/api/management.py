from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime, timezone, date
import csv
from pathlib import Path
import uuid

from app.api.deps import require_management, get_db
from app.core.config import get_settings
from app.models import (
    User, Collector, Recycler, PickupRequest, WasteBatch,
    PublicBin, AuditLog, Report, UserRole, PickupStatus, BatchStatus,
    RewardLedger, RewardBalance, Voucher, Redemption
)
from app.schemas import (
    UserCreate, UserResponse, UserUpdate, CollectorResponse, CollectorUpdate,
    RecyclerResponse, RecyclerUpdate, PublicBinCreate, PublicBinResponse,
    PublicBinUpdate, ReportResponse, PaginatedResponse
)
from app.core.security import get_password_hash

settings = get_settings()

router = APIRouter(prefix="/management", tags=["management"])


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    users_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.USER))
    collectors_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.COLLECTOR))
    recyclers_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.RECYCLER))
    management_count = await db.execute(select(func.count(User.id)).where(User.role == UserRole.MANAGEMENT))
    
    pending_pickups = await db.execute(select(func.count(PickupRequest.id)).where(PickupRequest.status == PickupStatus.PENDING))
    assigned_pickups = await db.execute(select(func.count(PickupRequest.id)).where(PickupRequest.status == PickupStatus.ASSIGNED))
    collected_pickups = await db.execute(select(func.count(PickupRequest.id)).where(PickupRequest.status == PickupStatus.COLLECTED))
    
    available_batches = await db.execute(select(func.count(WasteBatch.id)).where(WasteBatch.status == BatchStatus.AVAILABLE))
    processing_batches = await db.execute(select(func.count(WasteBatch.id)).where(WasteBatch.status == BatchStatus.PROCESSING))
    completed_batches = await db.execute(select(func.count(WasteBatch.id)).where(WasteBatch.status == BatchStatus.COMPLETED))
    
    total_waste_result = await db.execute(
        select(func.sum(PickupRequest.quantity_kg)).where(PickupRequest.status == PickupStatus.COLLECTED)
    )
    total_waste = total_waste_result.scalar() or 0.0
    
    bins_count = await db.execute(select(func.count(PublicBin.id)))
    
    by_type_result = await db.execute(
        select(PickupRequest.waste_type, func.sum(PickupRequest.quantity_kg), func.count(PickupRequest.id))
        .where(PickupRequest.status == PickupStatus.COLLECTED)
        .group_by(PickupRequest.waste_type)
    )
    by_type = [
        {"waste_type": row[0], "total_kg": row[1], "count": row[2]}
        for row in by_type_result.all()
    ]

    points_issued = await db.execute(select(func.coalesce(func.sum(RewardLedger.points), 0)))
    points_redeemed = await db.execute(select(func.coalesce(func.sum(Redemption.points_spent), 0)))
    
    return {
        "users": {
            "users": users_count.scalar(),
            "collectors": collectors_count.scalar(),
            "recyclers": recyclers_count.scalar(),
            "management": management_count.scalar(),
        },
        "pickup_pipeline": {
            "pending": pending_pickups.scalar(),
            "assigned": assigned_pickups.scalar(),
            "collected": collected_pickups.scalar(),
        },
        "batches": {
            "available": available_batches.scalar(),
            "processing": processing_batches.scalar(),
            "completed": completed_batches.scalar(),
        },
        "total_waste_kg": total_waste,
        "public_bins": bins_count.scalar(),
        "points_issued": points_issued.scalar(),
        "points_redeemed": points_redeemed.scalar(),
        "by_waste_type": by_type,
    }


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)
    
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    query = query.order_by(User.created_at.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    # Ensure username and email are unique
    existing = await db.execute(select(User).where((User.username == user_data.username) | (User.email == user_data.email)))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    # Hash password
    hashed = get_password_hash(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        phone=user_data.phone,
        role=user_data.role,
        password_hash=hashed,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Auto-create role-specific profile rows so new collect/recycler accounts are immediately usable
    try:
        if user.role == UserRole.COLLECTOR:
            collector = Collector(user_id=user.id, service_area="Chennai", is_available=True)
            db.add(collector)
            await db.commit()
        elif user.role == UserRole.RECYCLER:
            recycler = Recycler(user_id=user.id, accepted_waste_types=["organic", "plastic", "e-waste"], capacity_kg=500)
            db.add(recycler)
            await db.commit()
    except Exception:
        # Profile creation is best-effort; user creation itself succeeded
        await db.rollback()
    await db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Project-only: clean up FK children that would violate NOT NULL on delete
    # 1) Remember collector/recycler ids to nullify references before deleting profiles
    collector_ids_res = await db.execute(select(Collector.id).where(Collector.user_id == user_id))
    collector_ids = [r[0] for r in collector_ids_res.all()]
    if collector_ids:
        await db.execute(update(PickupRequest).where(PickupRequest.collector_id.in_(collector_ids)).values(collector_id=None))
    recycler_ids_res = await db.execute(select(Recycler.id).where(Recycler.user_id == user_id))
    recycler_ids = [r[0] for r in recycler_ids_res.all()]
    if recycler_ids:
        await db.execute(update(WasteBatch).where(WasteBatch.recycler_id.in_(recycler_ids)).values(recycler_id=None))
    # 2) Delete profiles themselves (1:1 NOT NULL)
    await db.execute(delete(Collector).where(Collector.user_id == user_id))
    await db.execute(delete(Recycler).where(Recycler.user_id == user_id))
    # 3) User-owned history (project: delete to unblock; in prod would block or anonymize)
    await db.execute(delete(RewardLedger).where(RewardLedger.user_id == user_id))
    await db.execute(delete(RewardBalance).where(RewardBalance.user_id == user_id))
    await db.execute(delete(Redemption).where(Redemption.user_id == user_id))
    await db.execute(delete(AuditLog).where(AuditLog.actor_user_id == user_id))
    await db.execute(delete(Report).where(Report.generated_by == user_id))
    await db.execute(delete(Voucher).where(Voucher.created_by == user_id))
    await db.execute(delete(PublicBin).where(PublicBin.created_by == user_id))
    # Pickups owned by resident — delete their batches first then pickups
    pickup_ids_res = await db.execute(select(PickupRequest.id).where(PickupRequest.user_id == user_id))
    pickup_ids = [r[0] for r in pickup_ids_res.all()]
    if pickup_ids:
        await db.execute(delete(RewardLedger).where(RewardLedger.pickup_id.in_(pickup_ids)))
        await db.execute(delete(WasteBatch).where(WasteBatch.pickup_request_id.in_(pickup_ids)))
        await db.execute(delete(PickupRequest).where(PickupRequest.id.in_(pickup_ids)))
    await db.flush()
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}


@router.get("/collectors", response_model=PaginatedResponse)
async def list_collectors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_available: Optional[bool] = Query(None),
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    query = select(Collector).join(User)
    
    if is_available is not None:
        query = query.where(Collector.is_available == is_available)
    
    query = query.order_by(User.created_at.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    collectors = result.scalars().all()
    
    return PaginatedResponse(
        items=collectors,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/collectors", response_model=CollectorResponse, status_code=status.HTTP_201_CREATED)
async def create_collector(
    collector_data: CollectorUpdate,
    user_id: int,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or user.role != UserRole.COLLECTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must have collector role"
        )
    
    existing = await db.execute(select(Collector).where(Collector.user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collector profile already exists"
        )
    
    collector = Collector(user_id=user_id, **collector_data.model_dump(exclude_unset=True))
    db.add(collector)
    await db.commit()
    await db.refresh(collector)
    return collector


@router.put("/collectors/{collector_id}", response_model=CollectorResponse)
async def update_collector(
    collector_id: int,
    collector_data: CollectorUpdate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Collector).where(Collector.id == collector_id))
    collector = result.scalar_one_or_none()
    
    if not collector:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collector not found"
        )
    
    update_data = collector_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collector, field, value)
    
    await db.commit()
    await db.refresh(collector)
    return collector


@router.get("/recyclers", response_model=PaginatedResponse)
async def list_recyclers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    query = select(Recycler).join(User).order_by(User.created_at.desc())
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    recyclers = result.scalars().all()
    # Ensure accepted_waste_types never serializes as null (defensive for legacy rows)
    for r in recyclers:
        if r.accepted_waste_types is None:
            r.accepted_waste_types = []
    
    return PaginatedResponse(
        items=[RecyclerResponse.model_validate(r) for r in recyclers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/recyclers", response_model=RecyclerResponse, status_code=status.HTTP_201_CREATED)
async def create_recycler(
    recycler_data: RecyclerUpdate,
    user_id: int,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user or user.role != UserRole.RECYCLER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must have recycler role"
        )
    
    existing = await db.execute(select(Recycler).where(Recycler.user_id == user_id))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recycler profile already exists"
        )
    
    recycler = Recycler(user_id=user_id, **recycler_data.model_dump(exclude_unset=True))
    db.add(recycler)
    await db.commit()
    await db.refresh(recycler)
    return recycler


@router.put("/recyclers/{recycler_id}", response_model=RecyclerResponse)
async def update_recycler(
    recycler_id: int,
    recycler_data: RecyclerUpdate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Recycler).where(Recycler.id == recycler_id))
    recycler = result.scalar_one_or_none()
    
    if not recycler:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recycler not found"
        )
    
    update_data = recycler_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(recycler, field, value)
    
    await db.commit()
    await db.refresh(recycler)
    return recycler


@router.get("/bins", response_model=List[PublicBinResponse])
async def list_bins(
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PublicBin).order_by(PublicBin.created_at.desc()))
    return result.scalars().all()


@router.post("/bins", response_model=PublicBinResponse, status_code=status.HTTP_201_CREATED)
async def create_bin(
    bin_data: PublicBinCreate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    bin = PublicBin(
        **bin_data.model_dump(),
        created_by=current_user.id
    )
    db.add(bin)
    await db.commit()
    await db.refresh(bin)
    return bin


@router.put("/bins/{bin_id}", response_model=PublicBinResponse)
async def update_bin(
    bin_id: int,
    bin_data: PublicBinUpdate,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PublicBin).where(PublicBin.id == bin_id))
    bin = result.scalar_one_or_none()
    
    if not bin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bin not found"
        )
    
    update_data = bin_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bin, field, value)
    
    bin.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(bin)
    return bin


@router.delete("/bins/{bin_id}")
async def delete_bin(
    bin_id: int,
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PublicBin).where(PublicBin.id == bin_id))
    bin = result.scalar_one_or_none()
    
    if not bin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bin not found"
        )
    
    await db.delete(bin)
    await db.commit()
    return {"message": "Bin deleted"}


@router.get("/audit-logs", response_model=PaginatedResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    actor_id: Optional[int] = Query(None),
    entity_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())
    
    if actor_id:
        query = query.where(AuditLog.actor_user_id == actor_id)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if date_from:
        query = query.where(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.where(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))
    
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return PaginatedResponse(
        items=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/reports/{report_type}", response_model=ReportResponse)
async def generate_report(
    report_type: str,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    # validate before touching FS
    allowed = {"users", "pickups", "batches", "bins", "rewards", "vouchers", "redemptions"}
    if report_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown report type: {report_type}. Allowed: {', '.join(sorted(allowed))}"
        )
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / "reports"
        upload_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Cannot create reports dir: {e}")

    filename = f"{report_type}_{uuid.uuid4().hex[:8]}.csv"
    file_path = upload_dir / filename

    def _iso(dt):
        return dt.isoformat() if dt else ""

    try:
        if report_type == "users":
            result = await db.execute(select(User))
            users = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "Username", "Email", "Role", "Phone", "Created At", "Is Active"])
                for u in users:
                    writer.writerow([u.id, u.username, u.email, u.role.value, u.phone, _iso(u.created_at), u.is_active])

        elif report_type == "pickups":
            query = select(PickupRequest)
            if date_from:
                query = query.where(PickupRequest.requested_at >= datetime.combine(date_from, datetime.min.time()))
            if date_to:
                query = query.where(PickupRequest.requested_at <= datetime.combine(date_to, datetime.max.time()))
            result = await db.execute(query)
            pickups = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "User ID", "Collector ID", "Waste Type", "Quantity (kg)", "Location", "Status", "Requested At", "Collected At"])
                for p in pickups:
                    writer.writerow([p.id, p.user_id, p.collector_id, p.waste_type, p.quantity_kg, p.location, p.status.value, _iso(p.requested_at), _iso(p.collected_at)])

        elif report_type == "batches":
            query = select(WasteBatch)
            if date_from:
                query = query.where(WasteBatch.handed_over_at >= datetime.combine(date_from, datetime.min.time()))
            if date_to:
                query = query.where(WasteBatch.handed_over_at <= datetime.combine(date_to, datetime.max.time()))
            result = await db.execute(query)
            batches = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "Pickup Request ID", "Recycler ID", "Status", "Handed Over At", "Processed At", "Proof URL"])
                for b in batches:
                    writer.writerow([b.id, b.pickup_request_id, b.recycler_id, b.status.value, _iso(b.handed_over_at), _iso(b.processed_at), b.proof_url or ""])

        elif report_type == "bins":
            result = await db.execute(select(PublicBin))
            bins = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "Name", "Latitude", "Longitude", "Accepted Waste Types", "Capacity (kg)", "Created By", "Created At"])
                for b in bins:
                    writer.writerow([b.id, b.name, b.latitude, b.longitude, ",".join(b.accepted_waste_types or []), b.capacity_kg, b.created_by, _iso(b.created_at)])

        elif report_type == "rewards":
            from app.models import RewardLedger

            result = await db.execute(select(RewardLedger).order_by(RewardLedger.created_at.desc()))
            rows = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "User ID", "Pickup ID", "Batch ID", "Waste Type", "Weight (kg)", "Points", "Created At"])
                for r in rows:
                    writer.writerow([r.id, r.user_id, r.pickup_id, r.batch_id, r.waste_type, r.weight_kg, r.points, _iso(r.created_at)])

        elif report_type == "vouchers":
            from app.models import Voucher

            result = await db.execute(select(Voucher).order_by(Voucher.created_at.desc()))
            rows = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "Title", "Description", "Cost Points", "Active", "Valid Until", "Created By", "Created At"])
                for v in rows:
                    writer.writerow([v.id, v.title, v.description, v.cost_points, v.active, _iso(v.valid_until), v.created_by, _iso(v.created_at)])

        elif report_type == "redemptions":
            from app.models import Redemption, Voucher
            from sqlalchemy.orm import selectinload

            result = await db.execute(select(Redemption).options(selectinload(Redemption.voucher), selectinload(Redemption.user)).order_by(Redemption.redeemed_at.desc()))
            rows = result.scalars().all()
            with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                writer.writerow(["ID", "User ID", "Username", "Voucher ID", "Voucher Title", "Points Spent", "Status", "Redeemed At"])
                for r in rows:
                    vtitle = r.voucher.title if r.voucher else ""
                    uname = r.user.username if r.user else ""
                    writer.writerow([r.id, r.user_id, uname, r.voucher_id, vtitle, r.points_spent, r.status.value if hasattr(r.status, "value") else r.status, _iso(r.redeemed_at)])
    except HTTPException:
        # clean up empty file on known error
        try:
            if file_path.exists():
                file_path.unlink()
        except OSError:
            pass
        raise
    except Exception as e:
        try:
            if file_path.exists():
                file_path.unlink()
        except OSError:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation failed: {e}")
    
    report = Report(
        generated_by=current_user.id,
        report_type=report_type,
        file_url=f"/uploads/reports/{filename}"
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return report


@router.get("/reports", response_model=List[ReportResponse])
async def list_reports(
    current_user: User = Depends(require_management),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Report).order_by(Report.created_at.desc()))
    return result.scalars().all()