"""Device registration and management endpoints."""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Device
from app.core.security import hash_key, require_role

router = APIRouter(prefix="/v1/devices")


class RegisterRequest(BaseModel):
    device_hash: str = Field(min_length=8, max_length=128)
    platform: str = Field(pattern="^(pwa|android|ios|tracker|simulator)$")
    consent: bool


class RegisterResponse(BaseModel):
    device_id: str
    api_key: str  # Shown once


@router.post("/register", response_model=RegisterResponse)
async def register_device(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new GPS data collector device.

    Returns the API key once. The raw key is never stored in plain text.
    """
    if not req.consent:
        raise HTTPException(status_code=400, detail="Consent is required before registration.")

    existing = await db.execute(
        select(Device).where(Device.device_hash == req.device_hash)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Device already registered.")

    raw_key = secrets.token_urlsafe(32)
    key_hash = hash_key(raw_key)

    device = Device(
        device_hash=req.device_hash,
        api_key_hash=key_hash,
        platform=req.platform,
        consent_at=datetime.now(timezone.utc),
    )
    db.add(device)
    await db.flush()

    return RegisterResponse(
        device_id=str(device.id),
        api_key=raw_key,
    )


@router.post("/{device_id}/revoke")
async def revoke_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """Revoke a device's API key (admin only)."""
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    device.revoked_at = datetime.now(timezone.utc)
    return {"status": "revoked", "device_id": device_id}
