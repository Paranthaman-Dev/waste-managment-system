"""Core dependencies for FastAPI.
Provides:
- ``get_db`` – DB session dependency (already defined in ``app.db.database``).
- ``get_current_user`` – extracts JWT from ``Authorization: Bearer`` header,
  validates it, and returns the ``User`` model.
- ``rate_limiter`` – instance of ``slowapi`` ``Limiter`` for request rate limiting.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select

from ..utils.token import decode_token
from ..models import User
from ..db.database import get_db
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter (10 requests per minute as example)
rate_limiter = Limiter(key_func=get_remote_address, default_limits=["10/minute"])

bearer_scheme = HTTPBearer()

async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    # Fetch user
    result = await db.exec(select(User).where(User.id == user_id))
    user = result.one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
