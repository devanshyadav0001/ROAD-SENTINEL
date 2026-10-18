"""Road segment endpoints — GeoJSON map layers and speed statistics."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.core.security import require_role
from app.config import settings

router = APIRouter(prefix="/v1/segments")


@router.get("")
async def get_segments(
    bbox: str = Query(..., description="west,south,east,north"),
    at: Optional[str] = Query(default=None, description="ISO datetime for historical view"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """
    Return road segments within bounding box as GeoJSON FeatureCollection,
    enriched with the latest speed statistics.
    """
    try:
        parts = [float(x.strip()) for x in bbox.split(",")]
        if len(parts) != 4:
            raise ValueError()
        west, south, east, north = parts
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail="bbox must be 'west,south,east,north' floats.")

    if at:
        try:
            ref_time = datetime.fromisoformat(at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid ISO format for 'at' timestamp.")
    else:
        ref_time = datetime.now(timezone.utc)

    query = text("""
        SELECT
            s.id, s.osm_way_id, s.name, s.highway,
            s.speed_limit_kmh, s.limit_source, s.length_m,
            ST_AsGeoJSON(s.geom)::json AS geometry,
            a.p50_kmh, a.p85_kmh, a.avg_kmh, a.n_trips, a.n_points,
            a.bucket_start
        FROM road_segments s
        LEFT JOIN LATERAL (
            SELECT p50_kmh, p85_kmh, avg_kmh, n_trips, n_points, bucket_start
            FROM segment_speed_agg
            WHERE segment_id = s.id
              AND bucket_start <= :ref_time
            ORDER BY bucket_start DESC
            LIMIT 1
        ) a ON true
        WHERE s.geom && ST_MakeEnvelope(:west, :south, :east, :north, 4326)
    """)

    result = await db.execute(query, {
        "ref_time": ref_time,
        "west": west, "south": south, "east": east, "north": north,
    })
    rows = result.mappings().all()

    min_trips = settings.MIN_TRIPS_FOR_STATS
    features = []

    for row in rows:
        has_data = row["n_trips"] is not None and row["n_trips"] >= min_trips
        props = {
            "id": row["id"],
            "osm_way_id": row["osm_way_id"],
            "name": row["name"],
            "highway": row["highway"],
            "speed_limit_kmh": row["speed_limit_kmh"],
            "limit_source": row["limit_source"],
            "length_m": row["length_m"],
            "p50_kmh": row["p50_kmh"] if has_data else None,
            "p85_kmh": row["p85_kmh"] if has_data else None,
            "avg_kmh": row["avg_kmh"] if has_data else None,
            "n_trips": row["n_trips"] if has_data else None,
            "bucket_start": row["bucket_start"].isoformat() if row["bucket_start"] else None,
        }
        features.append({
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": props,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/{segment_id}/stats")
async def get_segment_stats(
    segment_id: int,
    from_time: str = Query(..., alias="from", description="ISO datetime start"),
    to_time: str = Query(..., alias="to", description="ISO datetime end"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_role("viewer")),
):
    """Return time-series speed buckets for a single segment (24h chart)."""
    try:
        dt_from = datetime.fromisoformat(from_time.replace("Z", "+00:00"))
        dt_to = datetime.fromisoformat(to_time.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid ISO format for 'from' or 'to'.")

    query = text("""
        SELECT bucket_start, n_points, n_trips,
               avg_kmh, p50_kmh, p85_kmh, min_kmh, max_kmh
        FROM segment_speed_agg
        WHERE segment_id = :segment_id
          AND bucket_start >= :from_time
          AND bucket_start <= :to_time
        ORDER BY bucket_start
    """)
    result = await db.execute(query, {
        "segment_id": segment_id,
        "from_time": dt_from,
        "to_time": dt_to,
    })
    rows = result.mappings().all()

    return {
        "segment_id": segment_id,
        "buckets": [
            {
                "time": r["bucket_start"].isoformat(),
                "n_points": r["n_points"],
                "n_trips": r["n_trips"],
                "avg_kmh": r["avg_kmh"],
                "p50_kmh": r["p50_kmh"],
                "p85_kmh": r["p85_kmh"],
                "min_kmh": r["min_kmh"],
                "max_kmh": r["max_kmh"],
            }
            for r in rows
        ],
    }
