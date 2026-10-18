"""Admin settings endpoints — rule thresholds and manual road speed limits."""

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import ThresholdSetting, RoadSegment, AuditLog
from app.core.security import require_role

router = APIRouter(prefix="/v1/settings")


@router.get("/thresholds")
async def get_thresholds(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("admin")),
):
    """Retrieve all configurable system rule thresholds."""
    result = await db.execute(select(ThresholdSetting))
    items = result.scalars().all()
    return {
        s.key: {
            "value": s.value,
            "description": s.description,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in items
    }


class ThresholdUpdate(BaseModel):
    thresholds: Dict[str, float]


@router.put("/thresholds")
async def update_thresholds(
    body: ThresholdUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("admin")),
):
    """Update threshold configuration values."""
    updated = []
    for key, value in body.thresholds.items():
        result = await db.execute(
            select(ThresholdSetting).where(ThresholdSetting.key == key)
        )
        setting = result.scalar_one_or_none()
        if not setting:
            setting = ThresholdSetting(
                key=key,
                value=value,
                description=f"Configurable parameter {key}",
                updated_at=datetime.now(timezone.utc),
                updated_by=user.get("sub", "unknown"),
            )
            db.add(setting)
            old_value = None
        else:
            old_value = setting.value
            setting.value = value
            setting.updated_at = datetime.now(timezone.utc)
            setting.updated_by = user.get("sub", "unknown")

        updated.append(key)
        db.add(AuditLog(
            action="update_threshold",
            entity_type="threshold_setting",
            entity_id=key,
            user_id=user.get("sub", "unknown"),
            detail={"old": old_value, "new": value},
        ))

    return {"updated": updated}


class SpeedLimitUpdate(BaseModel):
    speed_limit_kmh: int


@router.put("/segments/{segment_id}/limit")
async def set_segment_limit(
    segment_id: int,
    body: SpeedLimitUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("admin")),
):
    """Override and set a manual speed limit for a road segment."""
    result = await db.execute(
        select(RoadSegment).where(RoadSegment.id == segment_id)
    )
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found.")

    old_limit = segment.speed_limit_kmh
    segment.speed_limit_kmh = body.speed_limit_kmh
    segment.limit_source = "manual"

    db.add(AuditLog(
        action="set_speed_limit",
        entity_type="road_segment",
        entity_id=str(segment_id),
        user_id=user.get("sub", "unknown"),
        detail={"old_limit": old_limit, "new_limit": body.speed_limit_kmh},
    ))

    return {
        "segment_id": segment_id,
        "speed_limit_kmh": body.speed_limit_kmh,
        "source": "manual",
    }
