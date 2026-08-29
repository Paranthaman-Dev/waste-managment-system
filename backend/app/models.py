"""Data models for the waste‑management platform.
We use SQLModel (SQLAlchemy + Pydantic) to define tables.
Additional models are added beyond the minimal ``User``.
"""

from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    hashed_password: str = Field(nullable=False)
    role: str = Field(nullable=False, default="user")
    # Relationships
    pickups: List["PickupRequest"] = Relationship(back_populates="requester")
    waste_batches: List["WasteBatch"] = Relationship(back_populates="recycler")

class PickupRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", nullable=False)
    status: str = Field(default="pending")  # pending, accepted, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    requester: User = Relationship(back_populates="pickups")

class WasteBatch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    recycler_id: int = Field(foreign_key="user.id", nullable=False)
    status: str = Field(default="pending")  # pending, processed, delivered
    created_at: datetime = Field(default_factory=datetime.utcnow)
    recycler: User = Relationship(back_populates="waste_batches")

class PublicBin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(nullable=False)
    latitude: float = Field(nullable=False)
    longitude: float = Field(nullable=False)
    description: Optional[str] = None
