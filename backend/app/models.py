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
    collector_id: Optional[int] = Field(foreign_key="user.id", default=None)
    status: str = Field(default="pending")  # pending, accepted, en_route, collected, completed, cancelled
    waste_type: str = Field(nullable=False)
    quantity_kg: float = Field(nullable=False)
    location: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    requester: User = Relationship(back_populates="pickups")
    collector: Optional[User] = Relationship(sa_relationship_kwargs={"primaryjoin": "PickupRequest.collector_id==User.id"})

class WasteBatch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    pickup_request_id: int = Field(foreign_key="pickuprequest.id", nullable=False)
    recycler_id: Optional[int] = Field(foreign_key="user.id", default=None)
    status: str = Field(default="available")  # available, requested, accepted, processed, delivered
    proof_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Relationships
    recycler: Optional[User] = Relationship(sa_relationship_kwargs={"primaryjoin": "WasteBatch.recycler_id==User.id"})
    pickup: PickupRequest = Relationship()

class PublicBin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(nullable=False)
    latitude: float = Field(nullable=False)
    longitude: float = Field(nullable=False)
    description: Optional[str] = None
    accepted_waste_types: List[str] = Field(default_factory=list, sa_column="accepted_waste_types", nullable=False)
    capacity_kg: float = Field(default=0.0, nullable=False)

