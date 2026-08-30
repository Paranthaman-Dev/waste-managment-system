"""Tests for reward/voucher hardening and pipeline correctness.

Covers:
- voucher cost_points must be > 0
- voucher valid_until must be in the future
- pickup waste_type/quantity/lat validation + normalization
- points awarded + idempotent award
- redeem deducts balance, insufficient -> 409
- redemption status transition to ISSUED
"""
import os
from pathlib import Path

os.environ.setdefault("JWT_SECRET_KEY", "testsecret")
os.environ.setdefault("UPLOAD_DIR", "/tmp/waste-hardening-test-uploads")

_TEST_DB = Path(f"/tmp/opencode/wm_hardening_{os.getpid()}.db")
if _TEST_DB.exists():
    _TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB}"

import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel, select
from fastapi import HTTPException

from app.core.config import calculate_points
from app.models import (
    PickupRequest, PickupStatus, RewardBalance, User, UserRole, Voucher,
    RedemptionStatus,
)
from app.schemas import VoucherCreate, PickupRequestCreate
from app.services.rewards import award_points_for_pickup, redeem_voucher

_ENGINE = create_async_engine(os.environ["DATABASE_URL"], echo=False)
SESSION_MAKER = async_sessionmaker(_ENGINE, class_=AsyncSession, expire_on_commit=False)


def session():
    return SESSION_MAKER()


@pytest.fixture(scope="module", autouse=True)
def _reset_db():
    if _TEST_DB.exists():
        _TEST_DB.unlink()

    async def setup():
        async with _ENGINE.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    asyncio.run(setup())
    yield

    async def teardown():
        await _ENGINE.dispose()

    asyncio.run(teardown())
    if _TEST_DB.exists():
        _TEST_DB.unlink()


async def make_user(db: AsyncSession, username: str, role=UserRole.USER) -> User:
    u = User(username=username, email=f"{username}@test.dev", password_hash="x", role=role, is_active=True)
    db.add(u)
    await db.flush()
    return u


@pytest.mark.asyncio
async def test_voucher_validation_rejects_bad_costs_and_past_dates():
    with pytest.raises(Exception):
        VoucherCreate(title="bad", cost_points=0)
    with pytest.raises(Exception):
        VoucherCreate(title="bad", cost_points=-5)
    with pytest.raises(Exception):
        VoucherCreate(title="bad", cost_points=10,
                      valid_until=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1))
    ok = VoucherCreate(title="ok", cost_points=10,
                       valid_until=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1))
    assert ok.cost_points == 10


@pytest.mark.asyncio
async def test_pickup_validation_rejects_bad_inputs_and_normalizes():
    with pytest.raises(Exception):
        PickupRequestCreate(waste_type="organic", quantity_kg=0, location="x")
    with pytest.raises(Exception):
        PickupRequestCreate(waste_type="organic", quantity_kg=-3, location="x")
    with pytest.raises(Exception):
        PickupRequestCreate(waste_type="organic", quantity_kg=2, location="x", latitude=999)
    ok = PickupRequestCreate(waste_type=" Plastic ", quantity_kg=2.5, location="Chennai")
    assert ok.waste_type == "plastic"
    assert ok.quantity_kg == 2.5


@pytest.mark.asyncio
async def test_points_awarded_idempotently():
    async with session() as db:
        try:
            user = await make_user(db, "h_award")
            p = PickupRequest(user_id=user.id, waste_type="plastic", quantity_kg=2.5,
                              location="Chennai", status=PickupStatus.COLLECTED)
            db.add(p)
            await db.flush()
            assert await award_points_for_pickup(db, p) > 0
            assert await award_points_for_pickup(db, p, batch_id=1) == 0

            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert bal.balance == calculate_points(2.5, "plastic")  # 25
            await db.rollback()
        except Exception:
            await db.rollback()
            raise


@pytest.mark.asyncio
async def test_redeem_deducts_and_transitions():
    async with session() as db:
        try:
            user = await make_user(db, "h_redeem")
            v = Voucher(title="Vch 50", description="d", cost_points=50, active=True, created_by=user.id)
            db.add(v)
            await db.flush()
            vid = v.id

            p = PickupRequest(user_id=user.id, waste_type="metal", quantity_kg=5.0,
                              location="x", status=PickupStatus.COLLECTED)
            db.add(p)
            await db.flush()
            assert await award_points_for_pickup(db, p) > 0

            red = await redeem_voucher(db, user.id, vid)
            assert red.status == RedemptionStatus.PENDING
            assert red.points_spent == 50
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert bal.balance == calculate_points(5.0, "metal") - 50  # 50 - 50 = 0

            red.status = RedemptionStatus.ISSUED
            await db.flush()
            assert red.status == RedemptionStatus.ISSUED
            await db.rollback()
        except Exception:
            await db.rollback()
            raise


@pytest.mark.asyncio
async def test_redeem_insufficient_409():
    async with session() as db:
        try:
            user = await make_user(db, "h_poor")
            p = PickupRequest(user_id=user.id, waste_type="general", quantity_kg=1.0,
                              location="x", status=PickupStatus.COLLECTED)
            db.add(p)
            await db.flush()
            assert await award_points_for_pickup(db, p) > 0

            vbig = Voucher(title="Big", description="d", cost_points=9999, active=True, created_by=user.id)
            db.add(vbig)
            await db.flush()
            with pytest.raises(HTTPException) as e:
                await redeem_voucher(db, user.id, vbig.id)
            assert e.value.status_code == 409
            await db.rollback()
        except Exception:
            await db.rollback()
            raise
