"""Reward accounting service.

Source of truth for awarding points, maintaining balances, and redeeming
vouchers. All mutations are idempotent and race-safe.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import calculate_points
from app.models import (
    AuditLog,
    PickupRequest,
    Redemption,
    RedemptionStatus,
    RewardBalance,
    RewardLedger,
    Voucher,
)


async def get_or_create_balance(db: AsyncSession, user_id: int) -> RewardBalance:
    result = await db.execute(select(RewardBalance).where(RewardBalance.user_id == user_id))
    balance = result.scalar_one_or_none()
    if balance is None:
        balance = RewardBalance(user_id=user_id, balance=0, lifetime_earned=0)
        db.add(balance)
        await db.flush()
    return balance


async def award_points_for_pickup(
    db: AsyncSession,
    pickup: PickupRequest,
    batch_id: Optional[int] = None,
) -> int:
    """Award points to the pickup's resident. Idempotent on pickup_id.

    Returns the number of points that were newly awarded (0 if already
    recorded, so callers never double-award even on duplicate transitions).
    """
    if pickup.user_id is None or pickup.quantity_kg is None or pickup.quantity_kg <= 0:
        return 0

    # Idempotency guard: one reward event per pickup
    result = await db.execute(select(RewardLedger).where(RewardLedger.pickup_id == pickup.id))
    if result.scalar_one_or_none() is not None:
        return 0

    weight = float(pickup.quantity_kg)
    points = calculate_points(weight, pickup.waste_type)

    ledger = RewardLedger(
        user_id=pickup.user_id,
        pickup_id=pickup.id,
        batch_id=batch_id,
        waste_type=pickup.waste_type,
        weight_kg=weight,
        points=points,
    )
    db.add(ledger)
    await db.flush()

    balance = await get_or_create_balance(db, pickup.user_id)
    balance.balance += points
    balance.lifetime_earned += points

    audit = AuditLog(
        actor_user_id=pickup.user_id if pickup.user_id else 0,
        action="rewards.awarded",
        entity_type="reward_ledger",
        entity_id=ledger.id,
    )
    db.add(audit)
    await db.flush()
    return points


async def redeem_voucher(db: AsyncSession, user_id: int, voucher_id: int) -> Redemption:
    """Redeem points for a voucher. Race-safe via SELECT FOR UPDATE on balance.

    Raises 404 if voucher missing/inactive/expired, 409 if insufficient points.
    """
    # Lock the balance row for the duration of the redemption to prevent
    # two concurrent redemptions from double-spending the same points.
    result = await db.execute(
        select(RewardBalance).where(RewardBalance.user_id == user_id).with_for_update()
    )
    balance = result.scalar_one_or_none()
    if balance is None:
        balance = RewardBalance(user_id=user_id, balance=0, lifetime_earned=0)
        db.add(balance)
        await db.flush()

    result = await db.execute(select(Voucher).where(Voucher.id == voucher_id))
    voucher = result.scalar_one_or_none()

    if voucher is None or not voucher.active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voucher not found or no longer active",
        )
    if voucher.valid_until is not None and voucher.valid_until < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voucher has expired",
        )

    cost = int(voucher.cost_points)
    if balance.balance < cost:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Insufficient points. You need {cost} but have {balance.balance}.",
        )

    balance.balance -= cost

    redemption = Redemption(
        user_id=user_id,
        voucher_id=voucher_id,
        points_spent=cost,
        status=RedemptionStatus.PENDING,
    )
    db.add(redemption)
    await db.flush()

    audit = AuditLog(
        actor_user_id=user_id,
        action="rewards.redeemed",
        entity_type="redemption",
        entity_id=redemption.id,
    )
    db.add(audit)
    await db.flush()
    return redemption


def rates_payload() -> dict:
    from app.core.config import REWARD_RATES, DEFAULT_REWARD_RATE
    return {"rates": dict(REWARD_RATES), "default": DEFAULT_REWARD_RATE}
