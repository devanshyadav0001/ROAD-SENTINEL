"""Background worker — Redis Stream consumer and scheduled jobs.

Reads GPS batches from 'gps:in' Redis stream, runs data cleaning,
map-matching to road segments, writes points, and schedules rollups & event detection.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import redis.asyncio as aioredis
from sqlalchemy import text

from app.config import settings
from app.db import AsyncSessionLocal
from app.pipeline.clean import clean_and_speed, median_smooth, trim_edges
from app.pipeline.match import match_batch
from app.pipeline.aggregate import run_rollup, purge_old_data
from app.pipeline.detect import detect_overspeed, detect_slowdown, close_stale_events

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("worker")

GROUP = "speed-workers"
CONSUMER = "worker-1"
STREAM = "gps:in"


async def ensure_consumer_group(r: aioredis.Redis):
    """Create the consumer group if it does not already exist."""
    try:
        await r.xgroup_create(STREAM, GROUP, id="0", mkstream=True)
        log.info(f"Created consumer group '{GROUP}' on stream '{STREAM}'.")
    except Exception:
        pass


async def process_batch(payload_str: str, device_id: str) -> int:
    """
    Process a single GPS batch:
    1. Parse payload
    2. Clean fixes and compute speed
    3. Median smooth
    4. Trim privacy margins
    5. Map match and insert into database
    """
    payload = json.loads(payload_str)
    trip_id = payload["trip_id"]
    vehicle_class = payload.get("vehicle_class", "unknown")
    fixes = payload["fixes"]

    points = []
    for f in fixes:
        t = f["t"]
        if isinstance(t, str):
            dt = datetime.fromisoformat(t.replace("Z", "+00:00"))
            epoch = dt.timestamp()
        else:
            epoch = float(t)
        points.append({
            "t": epoch,
            "lat": f["lat"],
            "lon": f["lon"],
            "acc": f.get("acc"),
            "spd": f.get("spd"),
            "hdg": f.get("hdg"),
        })

    points.sort(key=lambda p: p["t"])

    # 1. Clean & speed calculation
    cleaned = clean_and_speed(points)
    if not cleaned:
        log.debug(f"Trip {trip_id}: No valid points after cleaning.")
        return 0

    # 2. Smoothing
    smoothed = median_smooth(cleaned)

    # 3. Privacy edge trimming
    trimmed = trim_edges(smoothed, trim_m=settings.TRIP_EDGE_TRIM_M)
    if not trimmed:
        # If trip is too short for trimming in dev, retain points
        trimmed = smoothed

    # 4. Store and map match
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            INSERT INTO trips (id, device_id, started_at, vehicle_class)
            VALUES (:tid, :did, :started, :vc)
            ON CONFLICT (id) DO UPDATE SET ended_at = :ended
        """), {
            "tid": trip_id,
            "did": device_id,
            "started": datetime.fromtimestamp(trimmed[0]["t"], tz=timezone.utc),
            "ended": datetime.fromtimestamp(trimmed[-1]["t"], tz=timezone.utc),
            "vc": vehicle_class,
        })

        matched = await match_batch(db, trimmed)

        for p in matched:
            await db.execute(text("""
                INSERT INTO gps_points
                    (trip_id, recorded_at, geom, speed_kmh, raw_speed_kmh,
                     accuracy_m, heading, segment_id)
                VALUES
                    (:tid, :rec, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                     :speed, :raw_speed, :acc, :hdg, :seg_id)
            """), {
                "tid": trip_id,
                "rec": datetime.fromtimestamp(p["t"], tz=timezone.utc),
                "lat": p["lat"],
                "lon": p["lon"],
                "speed": p["kmh"],
                "raw_speed": p.get("spd", None),
                "acc": p.get("acc"),
                "hdg": p.get("hdg"),
                "seg_id": p.get("segment_id"),
            })

        await db.commit()

    return len(matched)


async def stream_consumer(r: aioredis.Redis):
    """Continuously read GPS batches from Redis Stream."""
    log.info("Stream consumer loop started.")

    while True:
        try:
            messages = await r.xreadgroup(
                GROUP, CONSUMER,
                {STREAM: ">"},
                count=10,
                block=5000,
            )

            if not messages:
                continue

            for stream_name, entries in messages:
                for msg_id, data in entries:
                    try:
                        n = await process_batch(
                            data["payload"],
                            data["device_id"],
                        )
                        log.info(f"Processed batch {msg_id}: {n} points saved.")
                        await r.xack(STREAM, GROUP, msg_id)
                    except Exception as e:
                        log.error(f"Error processing message {msg_id}: {e}", exc_info=True)

        except Exception as e:
            log.error(f"Stream consumer error: {e}", exc_info=True)
            await asyncio.sleep(1)


async def scheduler(r: aioredis.Redis):
    """Periodic jobs: 5-minute rollup, event detection, retention purge."""
    log.info("Scheduler loop started.")
    rollup_interval = settings.ROLLUP_INTERVAL_MINUTES * 60
    purge_counter = 0

    while True:
        await asyncio.sleep(rollup_interval)
        purge_counter += 1

        try:
            async with AsyncSessionLocal() as db:
                n = await run_rollup(db)
                log.info(f"Rollup completed: {n} segment-buckets updated.")

                overspeed = await detect_overspeed(db, r)
                slowdown = await detect_slowdown(db, r)
                closed = await close_stale_events(db)
                log.info(
                    f"Events checked: {len(overspeed)} overspeed, "
                    f"{len(slowdown)} slowdown, {closed} closed."
                )

                # Nightly purge (every ~288 rollups = 24h)
                if purge_counter >= 288:
                    purge_counter = 0
                    deleted = await purge_old_data(db)
                    log.info(f"Purged {deleted} points older than {settings.RETENTION_RAW_DAYS} days.")

        except Exception as e:
            log.error(f"Scheduler error: {e}", exc_info=True)


async def main():
    """Worker process main entry point."""
    log.info("Starting Speed Tracker Worker...")

    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    await ensure_consumer_group(r)

    await asyncio.gather(
        stream_consumer(r),
        scheduler(r),
    )


if __name__ == "__main__":
    asyncio.run(main())
