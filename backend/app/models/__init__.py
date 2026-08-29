from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, Column, Enum
from sqlalchemy import JSON


class UserRole(str, PyEnum):
    USER = "user"
    COLLECTOR = "collector"
    RECYCLER = "recycler"
    MANAGEMENT = "management"


class PickupStatus(str, PyEnum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    EN_ROUTE = "en_route"
    COLLECTED = "collected"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class BatchStatus(str, PyEnum):
    AVAILABLE = "available"
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    PROCESSING = "processing"
    COMPLETED = "completed"


class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, max_length=50)
    password_hash: str = Field(max_length=255)
    role: UserRole = Field(sa_column=Column(Enum(UserRole), nullable=False, index=True))
    email: str = Field(unique=True, index=True, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    
    collector_profile: Optional["Collector"] = Relationship(back_populates="user")
    recycler_profile: Optional["Recycler"] = Relationship(back_populates="user")
    pickup_requests: List["PickupRequest"] = Relationship(back_populates="user")
    audit_logs: List["AuditLog"] = Relationship(back_populates="actor")
    reports: List["Report"] = Relationship(back_populates="generated_by_user")
    created_bins: List["PublicBin"] = Relationship(back_populates="created_by_user")
    redemptions: List["Redemption"] = Relationship(back_populates="user")


class Collector(SQLModel, table=True):
    __tablename__ = "collectors"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, nullable=False)
    service_area: str = Field(max_length=100)
    is_available: bool = Field(default=True, nullable=False)
    
    user: User = Relationship(back_populates="collector_profile")
    assigned_pickups: List["PickupRequest"] = Relationship(back_populates="collector")


class Recycler(SQLModel, table=True):
    __tablename__ = "recyclers"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, nullable=False)
    accepted_waste_types: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    capacity_kg: float = Field(default=0.0)
    rating: float = Field(default=0.0)
    
    user: User = Relationship(back_populates="recycler_profile")
    batches: List["WasteBatch"] = Relationship(back_populates="recycler")


class PickupRequest(SQLModel, table=True):
    __tablename__ = "pickup_requests"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    collector_id: Optional[int] = Field(default=None, foreign_key="collectors.id", index=True)
    waste_type: str = Field(max_length=50, index=True)
    quantity_kg: float = Field(gt=0)
    location: str = Field(max_length=255)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    preferred_time: Optional[datetime] = Field(default=None)
    status: PickupStatus = Field(
        default=PickupStatus.PENDING, 
        sa_column=Column(Enum(PickupStatus), nullable=False, index=True)
    )
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    collected_at: Optional[datetime] = Field(default=None)
    
    user: User = Relationship(back_populates="pickup_requests")
    collector: Optional[Collector] = Relationship(back_populates="assigned_pickups")
    waste_batch: Optional["WasteBatch"] = Relationship(back_populates="pickup_request")


class WasteBatch(SQLModel, table=True):
    __tablename__ = "waste_batches"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    pickup_request_id: int = Field(foreign_key="pickup_requests.id", unique=True, nullable=False)
    recycler_id: Optional[int] = Field(default=None, foreign_key="recyclers.id", index=True)
    status: BatchStatus = Field(
        default=BatchStatus.AVAILABLE,
        sa_column=Column(Enum(BatchStatus), nullable=False, index=True)
    )
    handed_over_at: Optional[datetime] = Field(default=None)
    processed_at: Optional[datetime] = Field(default=None)
    proof_url: Optional[str] = Field(default=None, max_length=500)
    
    pickup_request: PickupRequest = Relationship(back_populates="waste_batch")
    recycler: Optional[Recycler] = Relationship(back_populates="batches")


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    action: str = Field(max_length=100)
    entity_type: str = Field(max_length=50)
    entity_id: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    
    actor: User = Relationship(back_populates="audit_logs")


class Report(SQLModel, table=True):
    __tablename__ = "reports"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    generated_by: int = Field(foreign_key="users.id", nullable=False)
    report_type: str = Field(max_length=50)
    file_url: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    
    generated_by_user: User = Relationship(back_populates="reports")


class PublicBin(SQLModel, table=True):
    __tablename__ = "public_bins"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    latitude: float = Field(index=True)
    longitude: float = Field(index=True)
    accepted_waste_types: List[str] = Field(sa_column=Column(JSON), default_factory=list)
    capacity_kg: float = Field(default=0.0)
    created_by: int = Field(foreign_key="users.id", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    
    created_by_user: User = Relationship(back_populates="created_bins")

class RewardLedger(SQLModel, table=True):
    """One row per reward event. Idempotent via unique pickup_id/batch_id."""
    __tablename__ = "reward_ledger"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    pickup_id: Optional[int] = Field(default=None, foreign_key="pickup_requests.id", unique=True, index=True)
    batch_id: Optional[int] = Field(default=None, foreign_key="waste_batches.id", index=True)
    waste_type: str = Field(max_length=50)
    weight_kg: float = Field(gt=0)
    points: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


class RewardBalance(SQLModel, table=True):
    """Running balance per resident user."""
    __tablename__ = "reward_balances"

    user_id: int = Field(foreign_key="users.id", primary_key=True)
    balance: int = Field(default=0)
    lifetime_earned: int = Field(default=0)


class Voucher(SQLModel, table=True):
    """A redeemable reward voucher created by management."""
    __tablename__ = "vouchers"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=120)
    description: str = Field(max_length=500, default="")
    cost_points: int = Field(gt=0)
    active: bool = Field(default=True, nullable=False)
    created_by: int = Field(foreign_key="users.id", nullable=False)
    valid_until: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)


class RedemptionStatus(str, PyEnum):
    PENDING = "pending"
    ISSUED = "issued"
    CANCELLED = "cancelled"


class Redemption(SQLModel, table=True):
    """A resident redeeming points for a voucher."""
    __tablename__ = "redemptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    voucher_id: int = Field(foreign_key="vouchers.id", nullable=False, index=True)
    points_spent: int = Field(default=0)
    status: RedemptionStatus = Field(
        default=RedemptionStatus.PENDING,
        sa_column=Column(Enum(RedemptionStatus), nullable=False, index=True),
    )
    redeemed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    voucher: "Voucher" = Relationship()
    user: "User" = Relationship(back_populates="redemptions")
