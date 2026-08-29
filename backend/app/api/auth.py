from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    verify_password, get_password_hash, 
    create_token_pair, decode_token, is_token_revoked, revoke_token
)
from app.core.config import get_settings
from app.db.session import get_db
from app.api.deps import get_current_user, limiter
from app.models import User, UserRole
from app.schemas import (
    UserCreate, UserLogin, Token, UserResponse, 
    RefreshTokenRequest, PasswordChange
)

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(
        (User.username == user_data.username) | (User.email == user_data.email)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        phone=user_data.phone,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == user_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    access_token, refresh_token = create_token_pair(user.id, user.role)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    response: Response,
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    token_data = decode_token(request.refresh_token)
    if not token_data or token_data.type != "refresh" or is_token_revoked(token_data):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    revoke_token(token_data)
    access_token, refresh_token = create_token_pair(user.id, user.role)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role
    )


@router.post("/logout")
async def logout(response: Response, token: str = Depends(oauth2_scheme)):
    token_data = decode_token(token)
    if token_data:
        revoke_token(token_data)
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}
