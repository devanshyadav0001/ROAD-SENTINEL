"""Map matching — assigns GPS points to nearest road segments.

MVP: Nearest-segment with heading bearing disambiguation.
"""

from math import fabs
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings


async def match_point_to_segment(
    db: AsyncSession,
    lat: float,
    lon: float,
    heading: Optional[float] = None,
) -> Optional[int]:
    """
    Find the nearest road segment within threshold distance.
    Uses PostGIS ST_DWithin and optionally picks closest bearing.
    """
    query = text("""
        SELECT
            s.id,
            degrees(ST_Azimuth(
                ST_StartPoint(s.geom),
                ST_EndPoint(s.geom)
            )) AS segment_bearing
        FROM road_segments s
        WHERE ST_DWithin(
            s.geom,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            :threshold
        )
        ORDER BY s.geom <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        LIMIT 5
    """)

    result = await db.execute(query, {
        "lat": lat,
        "lon": lon,
        "threshold": settings.MATCH_DISTANCE_DEG,
    })
    candidates = result.mappings().all()

    if not candidates:
        return None

    if heading is None:
        return candidates[0]["id"]

    best_id = candidates[0]["id"]
    best_diff = 180.0

    for c in candidates:
        seg_bearing = c["segment_bearing"] or 0
        diff1 = fabs(heading - seg_bearing) % 360
        diff1 = min(diff1, 360 - diff1)
        diff2 = fabs(heading - (seg_bearing + 180) % 360) % 360
        diff2 = min(diff2, 360 - diff2)
        diff = min(diff1, diff2)

        if diff < best_diff:
            best_diff = diff
            best_id = c["id"]

    return best_id


async def match_batch(
    db: AsyncSession,
    points: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Match a batch of cleaned GPS points to road segments."""
    for p in points:
        seg_id = await match_point_to_segment(
            db,
            lat=p["lat"],
            lon=p["lon"],
            heading=p.get("hdg"),
        )
        p["segment_id"] = seg_id

    return points
