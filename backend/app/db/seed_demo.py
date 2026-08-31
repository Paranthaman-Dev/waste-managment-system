import asyncio

from sqlmodel import SQLModel, select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal, engine
from app.models import User, UserRole, Collector, Recycler


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


if __name__ == "__main__":
    asyncio.run(seed_all())
