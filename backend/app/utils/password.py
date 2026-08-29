"""Password utilities – Argon2 hashing.
Provides functions to hash a plain password and verify a hash.
"""

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

def hash_password(password: str) -> str:
    """Hash a plain password using Argon2.
    Returns the encoded hash string.
    """
    return ph.hash(password)

def verify_password(hash_: str, password: str) -> bool:
    """Verify a password against an Argon2 hash.
    Returns ``True`` if the password matches, ``False`` otherwise.
    """
    try:
        return ph.verify(hash_, password)
    except VerifyMismatchError:
        return False
