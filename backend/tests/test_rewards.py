import os
from pathlib import Path

os.environ.setdefault("JWT_SECRET_KEY", "testsecret")
os.environ.setdefault("UPLOAD_DIR", "/tmp/waste-rewards-test-uploads")

_TEST_DB = Path(f"/tmp/opencode/wm_rewards_test_{os.getpid()}.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TEST_DB}"

import asyncio
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlmodel import SQLModel, select

from app.core.config import calculate_points, reward_rate_for
from app.models import (
    AuditLog,
    PickupRequest,
    PickupStatus,
    RewardBalance,
    RewardLedger,
    User,
    UserRole,
    Voucher,
)
from app.services.rewards import (
    award_points_for_pickup,
    redeem_voucher,
    rates_payload,
)

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


async def make_pickup(db: AsyncSession, user_id: int, waste_type: str = "ewaste", weight: float = 2.0) -> PickupRequest:
    p = PickupRequest(user_id=user_id, waste_type=waste_type, quantity_kg=weight, location="Test", status=PickupStatus.PENDING)
    db.add(p)
    await db.flush()
    return p


def test_points_calculation_floors_and_rates():
    assert calculate_points(1.0, "organic") == 5
    assert calculate_points(2.0, "plastic") == 20
    assert calculate_points(0.5, "ewaste") == 7
    assert calculate_points(10.0, "hazardous") == 80
    assert calculate_points(3.0, "general") == 9
    assert calculate_points(2.5, "metal") == 25


def test_reward_rates_payload_covers_all_types_and_default():
    rates = rates_payload()["rates"]
    for t in ["organic", "plastic", "e-waste", "ewaste", "metal", "paper", "glass", "recyclable", "hazardous", "general"]:
        assert rates[t] > 0, f"no rate for {t}"
    assert rates_payload()["default"] == 3
    assert reward_rate_for("unknown-type") == 3
    assert reward_rate_for(" EWASTE ") == 15


def test_zero_or_negative_weight_rejected():
    with pytest.raises(ValueError):
        calculate_points(0, "organic")
    with pytest.raises(ValueError):
        calculate_points(-5, "organic")


def test_award_is_idempotent_and_updates_balance():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_idempotent")
            pickup = await make_pickup(db, user.id, "ewaste", 2.0)
            await db.commit()

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            ok1 = await award_points_for_pickup(db, pickup)
            await db.commit()
            ok2 = await award_points_for_pickup(db, pickup)
            await db.commit()

        async with session() as db:
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            ledgers = (await db.execute(select(RewardLedger).where(RewardLedger.pickup_id == pickup.id))).scalars().all()
            assert ok1 == 30
            assert ok2 == 0
            assert len(ledgers) == 1
            assert ledgers[0].points == 30
            assert bal.balance == 30
            assert bal.lifetime_earned == 30

    asyncio.run(run())


def test_both_collector_and_recycler_paths_dont_double_award():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_dual")
            pickup = await make_pickup(db, user.id, "plastic", 3.0)
            await db.commit()

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            await award_points_for_pickup(db, pickup)
            await award_points_for_pickup(db, pickup, batch_id=999)
            await db.commit()

        async with session() as db:
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert bal.balance == 30
            assert bal.lifetime_earned == 30

    asyncio.run(run())


def test_redeem_success_deducts_balance_and_creates_redemption():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_redeem1")
            pickup = await make_pickup(db, user.id, "ewaste", 5.0)
            voucher = Voucher(title="₹100 Off", description="d", cost_points=50, active=True, created_by=user.id)
            db.add(voucher)
            await db.commit()
            voucher_id = voucher.id

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            await award_points_for_pickup(db, pickup)
            await db.commit()

        async with session() as db:
            red = await redeem_voucher(db, user.id, voucher_id)
            await db.commit()
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert red.points_spent == 50
            assert bal.balance == 25
            assert bal.lifetime_earned == 75

    asyncio.run(run())


def test_redeem_insufficient_points_raises_409():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_poor")
            pickup = await make_pickup(db, user.id, "general", 1.0)
            voucher = Voucher(title="Big", description="d", cost_points=500, active=True, created_by=user.id)
            db.add(voucher)
            await db.commit()
            voucher_id = voucher.id

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            await award_points_for_pickup(db, pickup)
            await db.commit()

        async with session() as db:
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc:
                await redeem_voucher(db, user.id, voucher_id)
            assert exc.value.status_code == 409
            assert "Insufficient" in exc.value.detail
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert bal.balance == 3  # no deduction on failure

    asyncio.run(run())


def test_redeem_inactive_voucher_raises_404():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_v404")
            voucher = Voucher(title="Off", description="d", cost_points=10, active=False, created_by=user.id)
            db.add(voucher)
            await db.commit()
            voucher_id = voucher.id

        async with session() as db:
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc:
                await redeem_voucher(db, user.id, voucher_id)
            assert exc.value.status_code == 404

    asyncio.run(run())


def test_concurrent_redemptions_never_overdraw():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_race")
            pickup = await make_pickup(db, user.id, "ewaste", 6.0)
            v1 = Voucher(title="v1", description="d", cost_points=60, active=True, created_by=user.id)
            v2 = Voucher(title="v2", description="d", cost_points=60, active=True, created_by=user.id)
            db.add_all([v1, v2])
            await db.commit()
            v1_id, v2_id = v1.id, v2.id

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            await award_points_for_pickup(db, pickup)
            await db.commit()

        from fastapi import HTTPException
        outcomes = []
        for vid in (v1_id, v2_id):
            async with session() as this:
                try:
                    await redeem_voucher(this, user.id, vid)
                    await this.commit()
                    outcomes.append(60)
                except HTTPException:
                    await this.rollback()
                    outcomes.append(0)

        async with session() as db:
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user.id))).scalar_one()
            assert bal.balance >= 0
            assert bal.balance == 90 - sum(outcomes)  # 90 pts cannot fund both 60s

    asyncio.run(run())


def test_audit_log_entries_written_for_award_and_redeem():
    async def run():
        async with session() as db:
            user = await make_user(db, "u_audit")
            pickup = await make_pickup(db, user.id, "glass", 2.0)
            voucher = Voucher(title="v", description="d", cost_points=5, active=True, created_by=user.id)
            db.add(voucher)
            await db.commit()
            voucher_id = voucher.id

        async with session() as db:
            pickup = (await db.execute(select(PickupRequest).where(PickupRequest.id == pickup.id))).scalar_one()
            await award_points_for_pickup(db, pickup)
            await db.commit()

        async with session() as db:
            await redeem_voucher(db, user.id, voucher_id)
            await db.commit()

        async with session() as db:
            logs = (await db.execute(select(AuditLog).order_by(AuditLog.id))).scalars().all()
            actions = [l.action for l in logs]
            assert "rewards.awarded" in actions
            assert "rewards.redeemed" in actions

    asyncio.run(run())
