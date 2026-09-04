import asyncio
from datetime import datetime, timezone

from sqlmodel import SQLModel, select, func

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.core.config import calculate_points
from app.models import User, UserRole, Collector, Recycler, PickupRequest, PickupStatus, WasteBatch, BatchStatus, Voucher, RewardLedger, RewardBalance, PublicBin


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
        # seed public bins so map shows network after wipe
        await seed_public_bins()
        # seed rewards/vouchers so fresh DB has catalogue + balances
        await seed_rewards_and_vouchers()


async def seed_public_bins() -> None:
    """Seed 6 demo public bins across Chennai. Idempotent."""
    async with AsyncSessionLocal() as db:
        cnt = (await db.execute(select(func.count(PublicBin.id)))).scalar() or 0
        if cnt > 0:
            return
        admin = (await db.execute(select(User).where(User.username == "admin"))).scalar_one_or_none()
        if not admin:
            return
        bins = [
            ("Marina Beach Bin 04", 13.0500, 80.2827, ["organic", "plastic"], 120),
            ("T Nagar Hub", 13.0418, 80.2341, ["plastic", "e-waste"], 150),
            ("Adyar Eco Station", 13.0067, 80.2570, ["organic", "metal"], 100),
            ("Anna Nagar Depot", 13.0850, 80.2101, ["paper", "plastic", "glass"], 200),
            ("Velachery Green Point", 12.9815, 80.2180, ["organic", "paper"], 80),
            ("Guindy Industrial Yard", 13.0063, 80.2206, ["metal", "e-waste", "glass"], 250),
        ]
        for name, lat, lng, types, cap in bins:
            db.add(PublicBin(name=name, latitude=lat, longitude=lng, accepted_waste_types=types, capacity_kg=cap, created_by=admin.id))
        await db.commit()
        print(f"  seeded {len(bins)} public bins")


async def seed_rewards_and_vouchers() -> None:
    """Seed vouchers + reward balances so fresh DB has catalogue. Idempotent."""
    async with AsyncSessionLocal() as db:
        vcnt = (await db.execute(select(func.count(Voucher.id)))).scalar() or 0
        if vcnt == 0:
            admin = (await db.execute(select(User).where(User.username == "admin"))).scalar_one_or_none()
            admin_id = admin.id if admin else 1
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            from datetime import timedelta

            demos = [
                ("₹100 Off", "Flat ₹100 off on next pickup", 100, 30),
                ("Eco Kit", "Reusable kit + bin", 150, 30),
                ("Compost Bin", "Home compost bin", 300, 60),
                ("Recycle Hero Badge", "Digital badge + 5% bonus", 50, 60),
                ("Free Pickup 5kg", "Free 5kg pickup", 200, 30),
            ]
            for title, desc, cost, days in demos:
                v = Voucher(
                    title=title,
                    description=desc,
                    cost_points=cost,
                    active=True,
                    created_by=admin_id,
                    valid_until=now + timedelta(days=days),
                )
                db.add(v)
            await db.flush()
            print(f"  seeded {len(demos)} vouchers")
        # seed reward balance + ledger for user1 based on completed pickups
        user1 = (await db.execute(select(User).where(User.username == "user1"))).scalar_one_or_none()
        if user1:
            # balance
            bal = (await db.execute(select(RewardBalance).where(RewardBalance.user_id == user1.id))).scalar_one_or_none()
            if bal is None:
                # compute points from completed pickups (metal 15*10=150, plastic 10*10=100) = 250
                # use same rates as config
                completed = (await db.execute(select(PickupRequest).join(WasteBatch, WasteBatch.pickup_request_id == PickupRequest.id).where(WasteBatch.status == BatchStatus.COMPLETED))).scalars().all()
                total_pts = 0
                for p in completed:
                    total_pts += calculate_points(float(p.quantity_kg), p.waste_type)
                if total_pts == 0:
                    total_pts = 250
                db.add(RewardBalance(user_id=user1.id, balance=total_pts, lifetime_earned=total_pts))
                await db.flush()
                print(f"  seeded reward balance user1 {total_pts}")
            # ledger per completed pickup (idempotent on pickup_id)
            completed_pickups = (await db.execute(select(PickupRequest).join(WasteBatch, WasteBatch.pickup_request_id == PickupRequest.id).where(WasteBatch.status == BatchStatus.COMPLETED))).scalars().all()
            for p in completed_pickups:
                exists = (await db.execute(select(RewardLedger).where(RewardLedger.pickup_id == p.id))).scalar_one_or_none()
                if exists is None:
                    pts = calculate_points(float(p.quantity_kg), p.waste_type)
                    db.add(
                        RewardLedger(
                            user_id=p.user_id,
                            pickup_id=p.id,
                            batch_id=(await db.execute(select(WasteBatch).where(WasteBatch.pickup_request_id == p.id))).scalar_one().id,
                            waste_type=p.waste_type,
                            weight_kg=float(p.quantity_kg),
                            points=pts,
                        )
                    )
            await db.commit()
            cnt = (await db.execute(select(func.count(RewardLedger.id)))).scalar() or 0
            print(f"  reward ledger count={cnt}")


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
    await seed_rewards_and_vouchers()


if __name__ == "__main__":
    asyncio.run(seed_all())
