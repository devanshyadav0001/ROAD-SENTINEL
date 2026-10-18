"""Authentication and authorization utilities."""

import hashlib
from typing import Callable, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal
from app.models import Device


# ─── Device authentication (API key) ─────────────────────────────

def hash_key(raw: str) -> str:
    """Generate SHA-256 salted hash of an API key."""
    return hashlib.sha256((settings.DEVICE_KEY_SALT + raw).encode()).hexdigest()


async def authenticate_device(api_key: str) -> Device:
    """
    Authenticate a device by its raw API key.
    Raises 401 if the key is invalid or the device is revoked.
    """
    key_hash = hash_key(api_key)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Device).where(
                Device.api_key_hash == key_hash,
                Device.revoked_at.is_(None),
            )
        )
        device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key.",
        )
    return device


# ─── JWT-based officer/admin authentication ───────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    Decode and validate a JWT Bearer token.
    Returns the decoded payload as a dict with at least 'sub' and 'role'.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )

    if "sub" not in payload or "role" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims (sub, role).",
        )

    return payload


def require_role(*allowed_roles: str) -> Callable:
    """
    FastAPI dependency factory that enforces role-based access.

    Usage:
        @router.get("/", dependencies=[Depends(require_role("admin"))])
        or
        user = Depends(require_role("officer", "admin"))

    Role hierarchy: admin (3) > officer (2) > viewer (1)
    """
    hierarchy = {"admin": 3, "officer": 2, "viewer": 1}

    async def _check(user: dict = Depends(get_current_user)) -> dict:
        user_role = user.get("role", "")
        user_level = hierarchy.get(user_role, 0)
        min_level = min(hierarchy.get(r, 99) for r in allowed_roles)

        if user_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' lacks permission. Required: {allowed_roles}",
            )
        return user

    return _check
