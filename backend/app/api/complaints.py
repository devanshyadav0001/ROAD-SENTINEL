"""Complaint speed context and repair verification endpoints."""

from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.core.security import require_role

router = APIRouter(prefix="/v1/complaints")


@router.get("/{complaint_id}/speed-context")
async def get_speed_context(
    complaint_id: int,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """
    Return traffic context and repair verification for a complaint:
    - 7-day average trips and median/P85 speeds
    - Repair verification verdict (if complaint is resolved)
    """
    q = text("""
        SELECT c.id, c.segment_id, c.status, c.resolved_at,
               s.speed_limit_kmh, s.name
        FROM complaints c
        LEFT JOIN road_segments s ON s.id = c.segment_id
        WHERE c.id = :cid
    """)
    result = await db.execute(q, {"cid": complaint_id})
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    if not row["segment_id"]:
        return {
            "complaint_id": complaint_id,
            "message": "Complaint not linked to a road segment.",
        }

    segment_id = row["segment_id"]

    traffic_q = text("""
        SELECT
            count(*) AS bucket_count,
            coalesce(avg(n_trips), 0) AS avg_trips_per_bucket,
            coalesce(avg(p50_kmh), 0) AS avg_p50,
            coalesce(avg(p85_kmh), 0) AS avg_p85
        FROM segment_speed_agg
        WHERE segment_id = :sid
          AND bucket_start >= now() - interval '7 days'
    """)
    traffic = (await db.execute(traffic_q, {"sid": segment_id})).mappings().first()

    response: Dict[str, Any] = {
        "complaint_id": complaint_id,
        "segment_id": segment_id,
        "segment_name": row["name"],
        "speed_limit_kmh": row["speed_limit_kmh"],
        "recent_7d": {
            "avg_median_speed": round(float(traffic["avg_p50"]), 1) if traffic else None,
            "avg_p85_speed": round(float(traffic["avg_p85"]), 1) if traffic else None,
            "avg_trips_per_5min": round(float(traffic["avg_trips_per_bucket"]), 1) if traffic else None,
        },
    }

    if row["status"] == "resolved" and row.get("resolved_at"):
        resolved_at = row["resolved_at"]
        before_start = resolved_at - timedelta(days=14)
        after_start = resolved_at + timedelta(days=1)
        after_end = after_start + timedelta(days=14)

        verify_q = text("""
            SELECT
                'before' AS period,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY p50_kmh) AS median_speed,
                count(*) AS n_buckets,
                sum(n_trips) AS total_trips
            FROM segment_speed_agg
            WHERE segment_id = :sid
              AND bucket_start >= :before_start AND bucket_start < :resolved_at
            UNION ALL
            SELECT
                'after' AS period,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY p50_kmh) AS median_speed,
                count(*) AS n_buckets,
                sum(n_trips) AS total_trips
            FROM segment_speed_agg
            WHERE segment_id = :sid
              AND bucket_start >= :after_start AND bucket_start < :after_end
        """)
        verify = (await db.execute(verify_q, {
            "sid": segment_id,
            "before_start": before_start,
            "resolved_at": resolved_at,
            "after_start": after_start,
            "after_end": after_end,
        })).mappings().all()

        before = next((r for r in verify if r["period"] == "before"), None)
        after = next((r for r in verify if r["period"] == "after"), None)

        min_trips = 30
        if (before and after
                and before["total_trips"] and before["total_trips"] >= min_trips
                and after["total_trips"] and after["total_trips"] >= min_trips
                and before["median_speed"] is not None and after["median_speed"] is not None):
            b_spd = float(before["median_speed"])
            a_spd = float(after["median_speed"])
            change_pct = ((a_spd - b_spd) / b_spd) * 100.0 if b_spd > 0 else 0.0

            verdict = "verified_improved" if change_pct >= 15.0 else "no_change_detected"

            response["repair_verification"] = {
                "verdict": verdict,
                "before_median_kmh": round(b_spd, 1),
                "after_median_kmh": round(a_spd, 1),
                "change_pct": round(change_pct, 1),
                "before_trips": int(before["total_trips"]),
                "after_trips": int(after["total_trips"]),
            }
        else:
            response["repair_verification"] = {
                "verdict": "not_enough_data",
                "before_trips": int(before["total_trips"]) if (before and before["total_trips"]) else 0,
                "after_trips": int(after["total_trips"]) if (after and after["total_trips"]) else 0,
            }

    return response
