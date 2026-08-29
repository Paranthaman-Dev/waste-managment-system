"""Authentication router – login, registration, and token refresh.
Currently provides:
- ``/auth/register`` – create a new user.
- ``/auth/login`` – obtain access/refresh tokens.
- ``/auth/refresh`` – exchange a valid refresh token for a new access token.
- ``/auth/logout`` – placeholder for token revocation (not yet persisted).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_db
from ..core.config import settings
from ..utils.password import verify_password, hash_password
from ..utils.token import create_access_token, create_refresh_token, decode_token
from ..models import User
from ..schemas import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserRead)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute("SELECT * FROM users WHERE email = :email", {"email": user.email})
    existing = result.first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Create new user record
    db_user = User(email=user.email, hashed_password=hash_password(user.password), role=user.role)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return UserRead.from_orm(db_user)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    # Retrieve user by email (username field is ``username`` in OAuth2PasswordRequestForm)
    result = await db.execute("SELECT * FROM users WHERE email = :email", {"email": form_data.username})
    user_row = result.first()
    if not user_row:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    user: User = user_row[0]
    return {"access_token": create_access_token(str(user.id)), "refresh_token": create_refresh_token(str(user.id)), "token_type": "bearer"}

@router.post("/refresh")
async def refresh_token(refresh_token: str, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    # Optionally verify user still exists
    result = await db.execute("SELECT * FROM users WHERE id = :uid", {"uid": int(user_id)})
    user_row = result.first()
    if not user_row:
        raise HTTPException(status_code=401, detail="User not found")
    new_access = create_access_token(str(user_id))
    return {"access_token": new_access, "token_type": "bearer"}

@router.post("/logout")
async def logout():
    # Placeholder – actual revocation would add JTI to a blocklist
    return {"msg": "logout not implemented yet"}

