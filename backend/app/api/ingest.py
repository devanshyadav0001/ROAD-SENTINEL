"""GPS data ingestion endpoint.

Accepts batches of GPS fixes from registered devices, validates them,
and pushes to Redis Stream for async processing by the worker.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.core.security import authenticate_device

router = APIRouter(prefix="/v1/ingest")


class Fix(BaseModel):
    """A single GPS fix from a device."""
    t: datetime
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    acc: Optional[float] = Field(default=None, ge=0, le=500)
    spd: Optional[float] = Field(default=None, ge=0, le=100)  # m/s from browser
    hdg: Optional[float] = Field(default=None, ge=0, le=360)


class Batch(BaseModel):
    """A batch of GPS fixes for a single trip."""
    trip_id: str
    vehicle_class: str = "unknown"
    fixes: List[Fix] = Field(min_length=1, max_length=500)


@router.post("/batch", status_code=202)
async def ingest_batch(
    batch: Batch,
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
):
    """
    Ingest a batch of GPS fixes.

    Authenticates device via API key, validates timestamps,
    and enqueues payload onto Redis stream 'gps:in'. Returns 202 Accepted.
    """
    device = await authenticate_device(x_api_key)

    now = datetime.now(timezone.utc)
    max_future = now + timedelta(minutes=5)
    max_past = now - timedelta(hours=24)

    valid_fixes = []
    for fix in batch.fixes:
        fix_time = fix.t if fix.t.tzinfo else fix.t.replace(tzinfo=timezone.utc)
        if fix_time > max_future:
            continue
        if not settings.ALLOW_OLD_TIMESTAMPS and fix_time < max_past:
            continue
        valid_fixes.append(fix)

    if not valid_fixes:
        raise HTTPException(
            status_code=422,
            detail="No valid fixes in batch after timestamp filtering.",
        )

    redis_client = getattr(request.app.state, "redis", None)
    payload = Batch(
        trip_id=batch.trip_id,
        vehicle_class=batch.vehicle_class,
        fixes=valid_fixes,
    ).model_dump_json()

    if redis_client:
        await redis_client.xadd("gps:in", {
            "device_id": str(device.id),
            "payload": payload,
        })

    return {"accepted": len(valid_fixes)}
