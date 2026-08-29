"""Pydantic schemas for the Waste Management API.
Covers auth, user, collector, recycler, management, bins, pickups, batches.
"""

from datetime import datetime, date
from typing import Optional, List, Any, Generic, TypeVar

from pydantic import BaseModel, EmailStr, ConfigDict

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
    waste_type: str
    quantity_kg: float
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_time: Optional[datetime] = None

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

class PickupRequestUpdate(BaseModel):
    waste_type: Optional[str] = None
    quantity_kg: Optional[float] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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
