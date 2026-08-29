from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.api.deps import get_db, require_any_role, require_user
from app.schemas import RewardBalanceResponse, RewardLedgerResponse, RewardRatesResponse, PaginatedResponse
from app.services.rewards import rates_payload

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("/rates", response_model=RewardRatesResponse)
async def get_rates(
    current_user=Depends(require_any_role),
):
    payload = rates_payload()
    return RewardRatesResponse(rates=payload["rates"], default=payload["default"])


@router.get("/balance", response_model=RewardBalanceResponse)
async def get_balance(
    current_user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.rewards import get_or_create_balance
    return await get_or_create_balance(db, current_user.id)


@router.get("/history", response_model=PaginatedResponse)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user=Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models import RewardLedger
    query = select(RewardLedger).where(RewardLedger.user_id == current_user.id).order_by(RewardLedger.created_at.desc())
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(
        items=[RewardLedgerResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
