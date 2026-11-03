"""Speed event detection with hysteresis.

Detects:
- OVERSPEED: P85 above limit * 1.10 for N consecutive buckets.
- SLOWDOWN: P50 below baseline * 0.60 for N consecutive buckets.
- DECEL_CLUSTER: Hard braking events in a localized 30m cell.
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.models import SpeedEvent
from app.config import settings


def _severity_overspeed(ratio: float) -> int:
    """Compute severity from overspeed ratio."""
    if ratio >= 1.5:
        return 3
    elif ratio >= 1.25:
        return 2
    return 1


def _severity_slowdown(ratio: float) -> int:
    """Compute severity from slowdown ratio (speed / baseline)."""
    if ratio < 0.35:
        return 3
    elif ratio < 0.5:
        return 2
    return 1


async def detect_overspeed(
    db: AsyncSession,
    redis_client: Optional[aioredis.Redis] = None,
) -> List[Dict[str, Any]]:
    """Detect sustained OVERSPEED events across consecutive buckets."""
    n_buckets = settings.EVENT_OPEN_BUCKETS
    min_trips = settings.MIN_TRIPS_FOR_STATS
    ratio_threshold = settings.OVERSPEED_RATIO

    query = text("""
        WITH recent AS (
            SELECT
                a.segment_id,
                a.bucket_start,
                a.p85_kmh,
                a.n_trips,
                s.speed_limit_kmh AS lim,
                ROW_NUMBER() OVER (
                    PARTITION BY a.segment_id
                    ORDER BY a.bucket_start DESC
                ) AS rn
            FROM segment_speed_agg a
            JOIN road_segments s ON s.id = a.segment_id
            WHERE a.bucket_start >= now() - interval '1 hour'
              AND s.speed_limit_kmh IS NOT NULL
              AND a.n_trips >= :min_trips
        ),
        violations AS (
            SELECT
                segment_id,
                lim,
                min(bucket_start) AS first_bucket,
                max(bucket_start) AS last_bucket,
                avg(p85_kmh) AS avg_p85,
                count(*) AS n_consecutive
            FROM recent
            WHERE rn <= :n_buckets
              AND p85_kmh > lim * :ratio
            GROUP BY segment_id, lim
            HAVING count(*) >= :n_buckets
        )
        SELECT * FROM violations
    """)

    result = await db.execute(query, {
        "min_trips": min_trips,
        "n_buckets": n_buckets,
        "ratio": ratio_threshold,
    })
    rows = result.mappings().all()

    events_created = []
    now = datetime.now(timezone.utc)

    for row in rows:
        ratio = row["avg_p85"] / row["lim"]
        severity = _severity_overspeed(ratio)

        existing = await db.execute(
            select(SpeedEvent).where(
                SpeedEvent.segment_id == row["segment_id"],
                SpeedEvent.type == "OVERSPEED",
                SpeedEvent.status.in_(["open", "acknowledged"]),
            )
        )
        event = existing.scalar_one_or_none()

        metric_data = {
            "p85": round(row["avg_p85"], 1),
            "limit": row["lim"],
            "ratio": round(ratio, 2),
        }

        if event:
            event.last_seen = now
            event.severity = max(event.severity, severity)
            event.metric = metric_data
        else:
            event = SpeedEvent(
                type="OVERSPEED",
                segment_id=row["segment_id"],
                first_seen=now,
                last_seen=now,
                severity=severity,
                metric=metric_data,
                status="open",
            )
            db.add(event)

            if redis_client:
                try:
                    await redis_client.publish("speed:events", json.dumps({
                        "type": "OVERSPEED",
                        "segment_id": row["segment_id"],
                        "severity": severity,
                        "metric": metric_data,
                    }))
                except Exception:
                    pass

            events_created.append({
                "type": "OVERSPEED",
                "segment_id": row["segment_id"],
                "severity": severity,
            })

    await db.commit()
    return events_created


async def detect_slowdown(
    db: AsyncSession,
    redis_client: Optional[aioredis.Redis] = None,
) -> List[Dict[str, Any]]:
    """Detect sustained SLOWDOWN events relative to baseline speeds."""
    n_buckets = settings.EVENT_OPEN_BUCKETS
    min_trips = settings.MIN_TRIPS_FOR_STATS
    ratio_threshold = settings.SLOWDOWN_RATIO

    query = text("""
        WITH baseline AS (
            SELECT
                segment_id,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY p50_kmh) AS baseline_p50
            FROM segment_speed_agg
            WHERE bucket_start >= now() - interval '28 days'
              AND n_trips >= :min_trips
            GROUP BY segment_id
        ),
        recent AS (
            SELECT
                a.segment_id,
                a.bucket_start,
                a.p50_kmh,
                a.n_trips,
                b.baseline_p50,
                ROW_NUMBER() OVER (
                    PARTITION BY a.segment_id
                    ORDER BY a.bucket_start DESC
                ) AS rn
            FROM segment_speed_agg a
            JOIN baseline b ON b.segment_id = a.segment_id
            WHERE a.bucket_start >= now() - interval '1 hour'
              AND a.n_trips >= :min_trips
        ),
        slowdowns AS (
            SELECT
                segment_id,
                baseline_p50,
                avg(p50_kmh) AS current_p50,
                count(*) AS n_consecutive
            FROM recent
            WHERE rn <= :n_buckets
              AND p50_kmh < baseline_p50 * :ratio
            GROUP BY segment_id, baseline_p50
            HAVING count(*) >= :n_buckets
        )
        SELECT * FROM slowdowns
    """)

    result = await db.execute(query, {
        "min_trips": min_trips,
        "n_buckets": n_buckets,
        "ratio": ratio_threshold,
    })
    rows = result.mappings().all()

    events_created = []
    now = datetime.now(timezone.utc)

    for row in rows:
        if not row["baseline_p50"] or row["baseline_p50"] <= 0:
            continue

        ratio = row["current_p50"] / row["baseline_p50"]
        severity = _severity_slowdown(ratio)

        existing = await db.execute(
            select(SpeedEvent).where(
                SpeedEvent.segment_id == row["segment_id"],
                SpeedEvent.type == "SLOWDOWN",
                SpeedEvent.status.in_(["open", "acknowledged"]),
            )
        )
        event = existing.scalar_one_or_none()

        metric_data = {
            "current_p50": round(row["current_p50"], 1),
            "baseline_p50": round(row["baseline_p50"], 1),
            "ratio": round(ratio, 2),
        }

        if event:
            event.last_seen = now
            event.severity = max(event.severity, severity)
            event.metric = metric_data
        else:
            event = SpeedEvent(
                type="SLOWDOWN",
                segment_id=row["segment_id"],
                first_seen=now,
                last_seen=now,
                severity=severity,
                metric=metric_data,
                status="open",
            )
            db.add(event)

            if redis_client:
                try:
                    await redis_client.publish("speed:events", json.dumps({
                        "type": "SLOWDOWN",
                        "segment_id": row["segment_id"],
                        "severity": severity,
                        "metric": metric_data,
                    }))
                except Exception:
                    pass

            events_created.append({
                "type": "SLOWDOWN",
                "segment_id": row["segment_id"],
                "severity": severity,
            })

    await db.commit()
    return events_created


async def close_stale_events(db: AsyncSession) -> int:
    """Close speed events with no violation updates in the last 6 buckets (30m)."""
    close_buckets = settings.EVENT_CLOSE_BUCKETS
    interval_min = settings.ROLLUP_INTERVAL_MINUTES
    stale_minutes = close_buckets * interval_min

    query = text("""
        UPDATE speed_events
        SET status = 'closed'
        WHERE status IN ('open', 'acknowledged')
          AND last_seen < now() - make_interval(mins => :stale_minutes)
        RETURNING id
    """)
    result = await db.execute(query, {"stale_minutes": stale_minutes})
    await db.commit()
    return result.rowcount or 0
