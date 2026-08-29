"""Database connectivity utilities.
Creates a SQLAlchemy async engine and a sessionmaker that can be used
with FastAPI dependency injection.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from ..core.config import settings

# Async engine using asyncpg driver (SQLAlchemy 2.x syntax)
engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)

# Session factory – each FastAPI request can depend on this
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    """FastAPI dependency that provides a DB session.
    Usage: ``db: AsyncSession = Depends(get_db)``
    """
    async with AsyncSessionLocal() as session:
        yield session
