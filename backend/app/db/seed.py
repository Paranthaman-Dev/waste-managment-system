import asyncio

from sqlmodel import select

from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models import User, UserRole


async def seed_admin() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            return

        admin = User(
            username="admin",
            email="admin@example.com",
            phone=None,
            role=UserRole.MANAGEMENT,
            password_hash=get_password_hash("admin123"),
            is_active=True,
        )
        db.add(admin)
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed_admin())
