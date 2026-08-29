"""Pydantic schemas for request/response models.
Only ``UserCreate`` and ``UserRead`` are defined for now.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "user"

class UserRead(BaseModel):
    id: int
    email: EmailStr
    role: str

    class Config:
        orm_mode = True
