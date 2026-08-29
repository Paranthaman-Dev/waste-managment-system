"""JWT token helpers.
Generates and verifies access and refresh tokens using ``python-jose``.
"""

from datetime import datetime, timedelta
from typing import Any, Dict

from jose import JWTError, jwt

from ..core.config import settings

def _create_token(data: Dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_access_token(subject: str) -> str:
    """Create a short‑lived access token.
    ``subject`` is usually the user identifier (e.g., email or user id).
    """
    return _create_token({"sub": subject, "type": "access"}, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(subject: str) -> str:
    """Create a longer‑lived refresh token.
    ``subject`` mirrors the access token ``sub`` claim.
    """
    return _create_token({"sub": subject, "type": "refresh"}, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

def decode_token(token: str) -> Dict[str, Any]:
    """Decode a JWT and return its payload.
    Raises ``JWTError`` if verification fails.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
