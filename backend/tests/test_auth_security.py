from app.core.security import (
    create_token_pair,
    decode_token,
    get_password_hash,
    is_token_revoked,
    revoke_token,
    verify_password,
)
from app.models import UserRole


def test_passwords_are_argon2_hashed():
    hashed = get_password_hash("password123")

    assert hashed.startswith("$argon2")
    assert verify_password("password123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_token_pair_contains_access_refresh_and_unique_jti():
    access_token, refresh_token = create_token_pair(1, UserRole.USER)
    access_payload = decode_token(access_token)
    refresh_payload = decode_token(refresh_token)

    assert access_payload is not None
    assert refresh_payload is not None
    assert access_payload.type == "access"
    assert refresh_payload.type == "refresh"
    assert access_payload.role == UserRole.USER
    assert refresh_payload.role == UserRole.USER
    assert access_payload.jti != refresh_payload.jti


def test_revoked_token_is_rejected_by_revocation_check():
    access_token, _ = create_token_pair(2, UserRole.MANAGEMENT)
    payload = decode_token(access_token)

    assert payload is not None
    assert not is_token_revoked(payload)

    revoke_token(payload)

    assert is_token_revoked(payload)
