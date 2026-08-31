"""Pydantic schemas for the Waste Management API.
Covers auth, user, collector, recycler, management, bins, pickups, batches.
"""

from datetime import datetime, timezone
from typing import Optional, List, Any

from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator

from app.models import UserRole, PickupStatus, BatchStatus

# -------------------------------------------------------------------
# Shared
# -------------------------------------------------------------------
class TokenPayload(BaseModel):
    sub: int
    role: UserRole
    type: str
    exp: int
    jti: str

# -------------------------------------------------------------------
# Auth
# -------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    role: UserRole = UserRole.USER

    @field_validator("role", mode="before")
    @classmethod
    def _lower_role(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    created_at: datetime
    is_active: bool

class UserRead(UserResponse):
    pass

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None
    username: Optional[str] = None

    @field_validator("role", mode="before")
    @classmethod
    def _lower_role(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: Optional[UserRole] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# -------------------------------------------------------------------
# Collector
# -------------------------------------------------------------------
class CollectorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    service_area: str
    is_available: bool

class CollectorUpdate(BaseModel):
    service_area: Optional[str] = None
    is_available: Optional[bool] = None

# -------------------------------------------------------------------
# Recycler
# -------------------------------------------------------------------
class RecyclerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: float
    rating: float

class RecyclerUpdate(BaseModel):
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: Optional[float] = None
    rating: Optional[float] = None
    is_available: Optional[bool] = None

# -------------------------------------------------------------------
# PickupRequest
# -------------------------------------------------------------------
class PickupRequestCreate(BaseModel):
    waste_type: str = Field(min_length=1, max_length=50)
    quantity_kg: float = Field(gt=0)
    location: str = Field(min_length=1)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    preferred_time: Optional[datetime] = None

    @field_validator("waste_type")
    @classmethod
    def validate_waste_type(cls, v: str) -> str:
        return v.strip().lower()

class PickupRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    collector_id: Optional[int] = None
    waste_type: str
    quantity_kg: float
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_time: Optional[datetime] = None
    status: PickupStatus
    requested_at: datetime
    collected_at: Optional[datetime] = None
    points_earned: Optional[int] = None

class PickupCollectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    pickup: PickupRequestResponse
    points_earned: int

class PickupRequestUpdate(BaseModel):
    waste_type: Optional[str] = Field(default=None, min_length=1, max_length=50)
    quantity_kg: Optional[float] = Field(default=None, gt=0)
    location: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    preferred_time: Optional[datetime] = None
    status: Optional[PickupStatus] = None

# -------------------------------------------------------------------
# WasteBatch
# -------------------------------------------------------------------
class WasteBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    pickup_request_id: int
    recycler_id: Optional[int] = None
    status: BatchStatus
    handed_over_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    proof_url: Optional[str] = None

class WasteBatchUpdate(BaseModel):
    status: Optional[BatchStatus] = None
    proof_url: Optional[str] = None

# -------------------------------------------------------------------
# PublicBin
# -------------------------------------------------------------------
class PublicBinCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: float = 0.0

class PublicBinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    latitude: float
    longitude: float
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: float
    created_by: int
    created_at: datetime
    updated_at: datetime

class PublicBinUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: Optional[float] = None

# -------------------------------------------------------------------
# Audit & Report
# -------------------------------------------------------------------
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_user_id: int
    action: str
    entity_type: str
    entity_id: int
    timestamp: datetime

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    generated_by: int
    report_type: str
    file_url: str
    created_at: datetime

# -------------------------------------------------------------------
# Pagination
# -------------------------------------------------------------------
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int

# -------------------------------------------------------------------
# Rewards & Vouchers
# -------------------------------------------------------------------
class RewardBalanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    balance: int
    lifetime_earned: int

class RewardRatesResponse(BaseModel):
    rates: dict
    default: int

class RewardLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    pickup_id: Optional[int] = None
    batch_id: Optional[int] = None
    waste_type: str
    weight_kg: float
    points: int
    created_at: datetime
class VoucherCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = ""

    cost_points: int = Field(gt=0)
    active: bool = True
    valid_until: Optional[datetime] = None

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            # Handle both naive and aware datetimes: normalize to aware UTC for comparison
            v_aware = v if v.tzinfo is not None else v.replace(tzinfo=timezone.utc)
            if v_aware < datetime.now(timezone.utc):
                raise ValueError("valid_until must be in the future")
        return v


class VoucherUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = None
    cost_points: Optional[int] = Field(default=None, gt=0)
    active: Optional[bool] = None
    valid_until: Optional[datetime] = None

    @field_validator("valid_until")
    @classmethod
    def validate_valid_until(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is not None:
            v_aware = v if v.tzinfo is not None else v.replace(tzinfo=timezone.utc)
            if v_aware < datetime.now(timezone.utc):
                raise ValueError("valid_until must be in the future")
        return v

class VoucherResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str
    cost_points: int
    active: bool
    created_by: int
    valid_until: Optional[datetime] = None
    created_at: datetime

class RedemptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    voucher_id: int
    points_spent: int
    status: str
    redeemed_at: datetime
    voucher_title: Optional[str] = None
    username: Optional[str] = None
