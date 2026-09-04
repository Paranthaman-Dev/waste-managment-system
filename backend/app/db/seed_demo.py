import asyncio
from datetime import datetime, timezone

from sqlmodel import SQLModel, select, func

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models import User, UserRole, Collector, Recycler, PickupRequest, PickupStatus, WasteBatch, BatchStatus


async def upsert_user(username: str, email: str, role: UserRole, password: str) -> User:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                username=username,
                email=email,
                role=role,
                password_hash=get_password_hash(password),
                is_active=True,
            )
            db.add(user)
            await db.flush()
            user_id = user.id
        else:
            user_id = user.id
        await db.commit()

    # Ensure per-role profile rows exist
    async with AsyncSessionLocal() as db:
        if role == UserRole.COLLECTOR:
            prof = (await db.execute(select(Collector).where(Collector.user_id == user_id))).scalar_one_or_none()
            if prof is None:
                db.add(Collector(user_id=user_id, service_area="Chennai", is_available=True))
        elif role == UserRole.RECYCLER:
            prof = (await db.execute(select(Recycler).where(Recycler.user_id == user_id))).scalar_one_or_none()
            if prof is None:
                db.add(
                    Recycler(
                        user_id=user_id,
                        accepted_waste_types=["organic", "plastic", "e-waste"],
                        capacity_kg=500.0,
                        rating=4.8,
                    )
                )
        await db.commit()

    async with AsyncSessionLocal() as db:
        return (await db.execute(select(User).where(User.username == username))).scalar_one()


async def seed_demo_batches() -> None:
    """Create demo pickups + batches so Plant Analytics shows Mass Recycled >0 even after DB wipe.
    Idempotent: only runs when no PickupRequest exists."""
    async with AsyncSessionLocal() as db:
        cnt = (await db.execute(select(func.count(PickupRequest.id)))).scalar() or 0
        if cnt > 0:
            return
        # resolve demo users/profiles
        user = (await db.execute(select(User).where(User.username == "user1"))).scalar_one_or_none()
        collector_user = (await db.execute(select(User).where(User.username == "collector1"))).scalar_one_or_none()
        recycler_user = (await db.execute(select(User).where(User.username == "recycler1"))).scalar_one_or_none()
        if not user or not collector_user or not recycler_user:
            return
        collector = (await db.execute(select(Collector).where(Collector.user_id == collector_user.id))).scalar_one_or_none()
        recycler = (await db.execute(select(Recycler).where(Recycler.user_id == recycler_user.id))).scalar_one_or_none()
        if not collector or not recycler:
            return
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        demos = [
            # (waste_type, kg, location, batch_status)
            ("metal", 15.0, "Demo Metal Yard", BatchStatus.COMPLETED),
            ("plastic", 10.0, "Demo Plastic Hub", BatchStatus.COMPLETED),
            ("organic", 8.0, "Demo Organic Site", BatchStatus.AVAILABLE),
            ("e-waste", 12.0, "Demo E-Waste Center", BatchStatus.AVAILABLE),
        ]
        for waste_type, kg, loc, batch_status in demos:
            pickup = PickupRequest(
                user_id=user.id,
                collector_id=collector.id,
                waste_type=waste_type,
                quantity_kg=kg,
                location=loc,
                latitude=13.08,
                longitude=80.27,
                status=PickupStatus.COLLECTED,
                collected_at=now,
            )
            db.add(pickup)
            await db.flush()
            # create batch for this pickup
            batch = WasteBatch(
                pickup_request_id=pickup.id,
                recycler_id=recycler.id if batch_status in (BatchStatus.COMPLETED, BatchStatus.REQUESTED, BatchStatus.ACCEPTED) else None,
                status=batch_status,
                handed_over_at=now if batch_status in (BatchStatus.ACCEPTED, BatchStatus.COMPLETED) else None,
                processed_at=now if batch_status == BatchStatus.COMPLETED else None,
                proof_url="/uploads/proofs/demo.jpg" if batch_status == BatchStatus.COMPLETED else None,
            )
            # For AVAILABLE demo, leave recycler_id None so it shows in Available Batches
            if batch_status == BatchStatus.AVAILABLE:
                batch.recycler_id = None
            db.add(batch)
            await db.flush()
            print(f"  seeded pickup {pickup.id} {waste_type} {kg}kg -> batch {batch.id} {batch_status.value}")
        await db.commit()
        # verify analytics
        total = (await db.execute(select(func.sum(PickupRequest.quantity_kg)).join(WasteBatch, WasteBatch.pickup_request_id == PickupRequest.id).where(WasteBatch.recycler_id == recycler.id, WasteBatch.status == BatchStatus.COMPLETED))).scalar() or 0
        print(f"  demo analytics total_kg_processed={total}")


async def seed_all() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    demo = [
        ("admin", "admin@example.com", UserRole.MANAGEMENT, "admin123"),
        ("admin1", "admin1@example.com", UserRole.MANAGEMENT, "admin123"),
        ("user1", "user1@example.com", UserRole.USER, "user123"),
        ("collector1", "collector1@example.com", UserRole.COLLECTOR, "collector123"),
        ("recycler1", "recycler1@example.com", UserRole.RECYCLER, "recycler123"),
    ]
    for username, email, role, password in demo:
        u = await upsert_user(username, email, role, password)
        print(f"  seeded {username!r:16} role={u.role.value}")

    await seed_demo_batches()


if __name__ == "__main__":
    asyncio.run(seed_all())
