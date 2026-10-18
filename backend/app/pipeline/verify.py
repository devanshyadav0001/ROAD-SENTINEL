"""Repair verification — analyzes traffic recovery after complaint resolution."""

from datetime import datetime, timedelta
from typing import Any, Dict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def verify_repair(
    db: AsyncSession,
    segment_id: int,
    resolved_at: datetime,
    min_trips: int = 30,
) -> Dict[str, Any]:
    """
    Compare the segment's median speed in the 14 days before
    resolution with the 14 days after (starting +1 day after).

    Returns:
      - verdict: 'verified_improved' | 'no_change_detected' | 'not_enough_data'
      - before_median_kmh, after_median_kmh, change_pct
      - before_trips, after_trips
    """
    before_start = resolved_at - timedelta(days=14)
    after_start = resolved_at + timedelta(days=1)
    after_end = after_start + timedelta(days=14)

    query = text("""
        SELECT
            'before' AS period,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY p50_kmh) AS median_speed,
            sum(n_trips) AS total_trips
        FROM segment_speed_agg
        WHERE segment_id = :sid
          AND bucket_start >= :before_start
          AND bucket_start < :resolved_at
        UNION ALL
        SELECT
            'after' AS period,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY p50_kmh) AS median_speed,
            sum(n_trips) AS total_trips
        FROM segment_speed_agg
        WHERE segment_id = :sid
          AND bucket_start >= :after_start
          AND bucket_start < :after_end
    """)

    result = await db.execute(query, {
        "sid": segment_id,
        "before_start": before_start,
        "resolved_at": resolved_at,
        "after_start": after_start,
        "after_end": after_end,
    })
    rows = {r["period"]: r for r in result.mappings().all()}

    before = rows.get("before")
    after = rows.get("after")

    if (not before or not after
            or not before["total_trips"] or before["total_trips"] < min_trips
            or not after["total_trips"] or after["total_trips"] < min_trips
            or before["median_speed"] is None or after["median_speed"] is None):
        return {
            "verdict": "not_enough_data",
            "before_trips": before["total_trips"] if (before and before["total_trips"]) else 0,
            "after_trips": after["total_trips"] if (after and after["total_trips"]) else 0,
        }

    before_spd = float(before["median_speed"])
    after_spd = float(after["median_speed"])

    if before_spd == 0:
        change_pct = 0.0
    else:
        change_pct = ((after_spd - before_spd) / before_spd) * 100.0

    verdict = "verified_improved" if change_pct >= 15.0 else "no_change_detected"

    return {
        "verdict": verdict,
        "before_median_kmh": round(before_spd, 1),
        "after_median_kmh": round(after_spd, 1),
        "change_pct": round(change_pct, 1),
        "before_trips": int(before["total_trips"]),
        "after_trips": int(after["total_trips"]),
    }
