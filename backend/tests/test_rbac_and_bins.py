from app.api.deps import require_roles
from app.models import User, UserRole


async def _call_role_checker(allowed_roles, role):
    user = User(
        id=1,
        username="tester",
        email="tester@example.com",
        role=role,
        password_hash="hash",
        is_active=True,
    )
    checker = require_roles(allowed_roles)
    return await checker(user)


async def test_require_roles_allows_matching_role():
    user = await _call_role_checker([UserRole.MANAGEMENT], UserRole.MANAGEMENT)

    assert user.role == UserRole.MANAGEMENT


async def test_require_roles_rejects_non_matching_role():
    checker = require_roles([UserRole.MANAGEMENT])
    user = User(
        id=2,
        username="user",
        email="user@example.com",
        role=UserRole.USER,
        password_hash="hash",
        is_active=True,
    )

    try:
        await checker(user)
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
    else:
        raise AssertionError("Expected non-management user to be rejected")
