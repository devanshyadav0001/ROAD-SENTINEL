"""Speed event endpoints — listing, acknowledgment, and complaint linking."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import SpeedEvent, AuditLog
from app.core.security import require_role

router = APIRouter(prefix="/v1/events")


@router.get("")
async def list_events(
    type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    from_time: Optional[str] = Query(default=None, alias="from"),
    to_time: Optional[str] = Query(default=None, alias="to"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """List speed events with filtering options."""
    stmt = select(SpeedEvent).order_by(SpeedEvent.last_seen.desc())

    if type:
        stmt = stmt.where(SpeedEvent.type == type)
    if status:
        stmt = stmt.where(SpeedEvent.status == status)
    if from_time:
        stmt = stmt.where(SpeedEvent.first_seen >= datetime.fromisoformat(from_time.replace("Z", "+00:00")))
    if to_time:
        stmt = stmt.where(SpeedEvent.last_seen <= datetime.fromisoformat(to_time.replace("Z", "+00:00")))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    events = result.scalars().all()

    return [
        {
            "id": e.id,
            "type": e.type,
            "segment_id": e.segment_id,
            "first_seen": e.first_seen.isoformat(),
            "last_seen": e.last_seen.isoformat(),
            "severity": e.severity,
            "metric": e.metric,
            "status": e.status,
            "complaint_id": e.complaint_id,
        }
        for e in events
    ]


class EventPatch(BaseModel):
    status: Optional[str] = None


@router.patch("/{event_id}")
async def update_event(
    event_id: int,
    patch: EventPatch,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("officer")),
):
    """Acknowledge or close an event."""
    result = await db.execute(select(SpeedEvent).where(SpeedEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    if patch.status:
        valid = ("open", "acknowledged", "linked", "closed")
        if patch.status not in valid:
            raise HTTPException(status_code=422, detail=f"Status must be one of: {valid}")
        event.status = patch.status

    db.add(AuditLog(
        action="update_event",
        entity_type="speed_event",
        entity_id=str(event_id),
        user_id=user.get("sub", "unknown"),
        detail={"new_status": patch.status},
    ))

    return {"id": event.id, "status": event.status}


@router.post("/{event_id}/complaint")
async def create_complaint_from_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("officer")),
):
    """
    Create a new complaint from a speed event.
    Auto-populates title, description, category, and links complaint with event.
    """
    result = await db.execute(select(SpeedEvent).where(SpeedEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.complaint_id:
        raise HTTPException(status_code=409, detail="Event is already linked to a complaint.")

    type_to_category = {
        "OVERSPEED": "driver_behavior",
        "SLOWDOWN": "damaged_pavement",
        "DECEL_CLUSTER": "pothole",
    }
    type_to_title = {
        "OVERSPEED": f"Overspeed hotspot (P85: {event.metric.get('p85', '?')} km/h)",
        "SLOWDOWN": "Traffic slowdown detected — possible road damage",
        "DECEL_CLUSTER": "Hard braking cluster — possible road hazard",
    }

    insert_q = text("""
        INSERT INTO complaints (title, description, category, severity, status, geom, segment_id, created_at)
        VALUES (:title, :desc, :cat, :sev, 'submitted',
                (SELECT geom FROM speed_events WHERE id = :eid),
                :seg_id, now())
        RETURNING id
    """)

    try:
        complaint_res = await db.execute(insert_q, {
            "title": type_to_title.get(event.type, "Speed event detected"),
            "desc": f"Auto-escalated from speed event #{event.id}. Metric: {event.metric}",
            "cat": type_to_category.get(event.type, "other"),
            "sev": "high" if event.severity >= 2 else "medium",
            "eid": event_id,
            "seg_id": event.segment_id,
        })
        complaint_id = complaint_res.scalar_one()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create linked complaint (ensure complaints table is initialized): {str(e)}",
        )

    event.complaint_id = complaint_id
    event.status = "linked"

    db.add(AuditLog(
        action="create_complaint_from_event",
        entity_type="speed_event",
        entity_id=str(event_id),
        user_id=user.get("sub", "unknown"),
        detail={"complaint_id": complaint_id},
    ))

    return {"event_id": event_id, "complaint_id": complaint_id, "status": "linked"}
