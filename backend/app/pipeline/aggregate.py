"""5-minute speed rollup aggregation and retention purge."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings


ROLLUP_SQL = text("""
    INSERT INTO segment_speed_agg
        (segment_id, bucket_start, n_points, n_trips,
         avg_kmh, p50_kmh, p85_kmh, min_kmh, max_kmh)
    SELECT
        segment_id,
        date_bin(
            CAST(:interval AS interval),
            recorded_at,
            TIMESTAMPTZ '2026-01-01 00:00+00'
        ) AS bucket,
        count(*)::int                                          AS n_points,
        count(DISTINCT trip_id)::smallint                       AS n_trips,
        avg(speed_kmh)                                         AS avg_kmh,
        percentile_cont(0.50) WITHIN GROUP (ORDER BY speed_kmh) AS p50_kmh,
        percentile_cont(0.85) WITHIN GROUP (ORDER BY speed_kmh) AS p85_kmh,
        min(speed_kmh)                                         AS min_kmh,
        max(speed_kmh)                                         AS max_kmh
    FROM gps_points
    WHERE segment_id IS NOT NULL
      AND speed_kmh IS NOT NULL
      AND recorded_at >= now() - CAST(:lookback AS interval)
    GROUP BY segment_id, bucket
    ON CONFLICT (segment_id, bucket_start)
    DO UPDATE SET
        n_points  = EXCLUDED.n_points,
        n_trips   = EXCLUDED.n_trips,
        avg_kmh   = EXCLUDED.avg_kmh,
        p50_kmh   = EXCLUDED.p50_kmh,
        p85_kmh   = EXCLUDED.p85_kmh,
        min_kmh   = EXCLUDED.min_kmh,
        max_kmh   = EXCLUDED.max_kmh
""")


async def run_rollup(db: AsyncSession) -> int:
    """Execute the 5-minute speed rollup."""
    interval = f"{settings.ROLLUP_INTERVAL_MINUTES} minutes"
    lookback = f"{settings.ROLLUP_LOOKBACK_MINUTES} minutes"

    result = await db.execute(ROLLUP_SQL, {
        "interval": interval,
        "lookback": lookback,
    })
    await db.commit()
    return result.rowcount or 0


PURGE_SQL = text("""
    DELETE FROM gps_points
    WHERE recorded_at < now() - make_interval(days => :days)
""")


async def purge_old_data(db: AsyncSession) -> int:
    """Delete raw GPS points older than the retention period."""
    result = await db.execute(PURGE_SQL, {
        "days": settings.RETENTION_RAW_DAYS,
    })
    await db.commit()
    return result.rowcount or 0
