"""GPX file simulator — replays a GPS drive through the Ingest API.

Usage:
    python scripts/simulate_gpx.py path/to/drive.gpx [API_URL] [API_KEY]
"""

import sys
import time
import uuid

import requests
import gpxpy


def main():
    if len(sys.argv) < 2:
        print("Usage: python simulate_gpx.py <file.gpx> [API_URL] [API_KEY]")
        sys.exit(1)

    gpx_file = sys.argv[1]
    api_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000"
    api_key = sys.argv[3] if len(sys.argv) > 3 else "dev-key"

    try:
        with open(gpx_file, "r") as f:
            gpx = gpxpy.parse(f)
    except Exception as e:
        print(f"Error opening GPX file: {e}")
        sys.exit(1)

    points = [
        p for track in gpx.tracks
        for segment in track.segments
        for p in segment.points
    ]

    if not points:
        print("No GPS track points found in GPX file.")
        sys.exit(1)

    print(f"Loaded {len(points)} track points from {gpx_file}")

    trip_id = str(uuid.uuid4())
    batch_size = 10

    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        fixes = [
            {
                "t": p.time.isoformat() if p.time else "2026-10-18T10:00:00Z",
                "lat": p.latitude,
                "lon": p.longitude,
                "acc": 5.0,
                "spd": p.speed if hasattr(p, "speed") else None,
            }
            for p in batch
        ]

        try:
            r = requests.post(
                f"{api_url}/v1/ingest/batch",
                json={"trip_id": trip_id, "vehicle_class": "car", "fixes": fixes},
                headers={"X-API-Key": api_key},
                timeout=5,
            )
            print(f"  Sent batch {i // batch_size + 1} ({len(fixes)} fixes): HTTP {r.status_code}")
        except requests.RequestException as e:
            print(f"  Failed sending batch: {e}")

        time.sleep(1)

    print(f"Replay completed for trip {trip_id}.")


if __name__ == "__main__":
    main()
