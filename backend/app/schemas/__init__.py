from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models import UserRole, PickupStatus, BatchStatus


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole


class TokenPayload(BaseModel):
    sub: int
    role: UserRole
    exp: int
    type: str


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=20)
    role: UserRole


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=100)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=20)
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=100)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CollectorBase(BaseModel):
    service_area: str = Field(max_length=100)
    is_available: bool = True


class CollectorCreate(CollectorBase):
    user_id: int


class CollectorResponse(CollectorBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class CollectorUpdate(BaseModel):
    service_area: Optional[str] = Field(default=None, max_length=100)
    is_available: Optional[bool] = None


class RecyclerBase(BaseModel):
    accepted_waste_types: List[str] = Field(default_factory=list)
    capacity_kg: float = Field(default=0.0, ge=0)
    rating: float = Field(default=0.0, ge=0, le=5)


class RecyclerCreate(RecyclerBase):
    user_id: int


class RecyclerResponse(RecyclerBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class RecyclerUpdate(BaseModel):
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: Optional[float] = Field(default=None, ge=0)
    rating: Optional[float] = Field(default=None, ge=0, le=5)


class PickupRequestBase(BaseModel):
    waste_type: str = Field(max_length=50)
    quantity_kg: float = Field(gt=0)
    location: str = Field(max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_time: Optional[datetime] = None


class PickupRequestCreate(PickupRequestBase):
    pass


class PickupRequestResponse(PickupRequestBase):
    id: int
    user_id: int
    collector_id: Optional[int] = None
    status: PickupStatus
    requested_at: datetime
    collected_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PickupRequestUpdate(BaseModel):
    waste_type: Optional[str] = Field(default=None, max_length=50)
    quantity_kg: Optional[float] = Field(default=None, gt=0)
    location: Optional[str] = Field(default=None, max_length=255)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    preferred_time: Optional[datetime] = None
    status: Optional[PickupStatus] = None
    collector_id: Optional[int] = None


class WasteBatchBase(BaseModel):
    status: BatchStatus = BatchStatus.AVAILABLE


class WasteBatchResponse(WasteBatchBase):
    id: int
    pickup_request_id: int
    recycler_id: Optional[int] = None
    handed_over_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    proof_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WasteBatchUpdate(BaseModel):
    status: Optional[BatchStatus] = None
    recycler_id: Optional[int] = None
    proof_url: Optional[str] = None


class PublicBinBase(BaseModel):
    name: str = Field(max_length=100)
    latitude: float
    longitude: float
    accepted_waste_types: List[str] = Field(default_factory=list)
    capacity_kg: float = Field(default=0.0, ge=0)


class PublicBinCreate(PublicBinBase):
    pass


class PublicBinResponse(PublicBinBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicBinUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accepted_waste_types: Optional[List[str]] = None
    capacity_kg: Optional[float] = Field(default=None, ge=0)


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: int
    action: str
    entity_type: str
    entity_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportResponse(BaseModel):
    id: int
    generated_by: int
    report_type: str
    file_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    items: List[object]
    total: int
    page: int
    page_size: int
    total_pages: int