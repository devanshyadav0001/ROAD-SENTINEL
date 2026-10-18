"""GPS data cleaning and speed calculation pipeline.

Filters bad data, computes speed between consecutive points,
applies median smoothing, and trims trip start/end for privacy.
"""

from math import radians, sin, cos, asin, sqrt
from typing import Any, Dict, List, Optional


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in metres between two lat/lon coordinates."""
    R = 6_371_000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


def clean_and_speed(
    points: List[Dict[str, Any]],
    max_acc_m: float = 30.0,
    max_kmh: float = 160.0,
    max_gap_s: float = 30.0,
    jitter_kmh: float = 2.0,
) -> List[Dict[str, Any]]:
    """
    Clean raw GPS fixes and compute speed.

    Args:
        points: Time-sorted dicts with keys: t (epoch s), lat, lon, acc.
        max_acc_m: Drop fixes with reported accuracy worse than this (metres).
        max_kmh: Teleport filter — drop if computed speed exceeds this.
        max_gap_s: Start new sub-trip if gap between fixes exceeds this.
        jitter_kmh: Set speed to 0 if computed speed is below this.

    Returns:
        List of cleaned points with added 'kmh' key.
    """
    out: List[Dict[str, Any]] = []
    prev: Optional[Dict[str, Any]] = None

    for p in points:
        # Step 1: Drop poor accuracy fixes
        if p.get("acc") is not None and p["acc"] > max_acc_m:
            continue

        if prev is not None:
            dt = p["t"] - prev["t"]

            # Step 2: Drop out-of-order or duplicate timestamps
            if dt <= 0:
                continue

            # Step 3: Gap detection — start new sub-trip
            if dt > max_gap_s:
                prev = p
                continue

            # Step 4: Compute speed from distance and time
            dist_m = haversine_m(prev["lat"], prev["lon"], p["lat"], p["lon"])
            v_kmh = (dist_m / dt) * 3.6

            # Step 5: Teleport filter
            if v_kmh > max_kmh:
                continue  # Retain old prev to test next point

            # Step 6: Jitter filter
            speed = 0.0 if v_kmh < jitter_kmh else v_kmh
            out.append({**p, "kmh": speed})

        prev = p

    return out


def median_smooth(points: List[Dict[str, Any]], window: int = 3) -> List[Dict[str, Any]]:
    """
    Apply median filter smoothing to speed values.

    Args:
        points: List of dicts with 'kmh' key.
        window: Odd window size.

    Returns:
        Points with smoothed 'kmh' values.
    """
    if len(points) < window:
        return points

    half = window // 2
    smoothed: List[Dict[str, Any]] = []

    for i, p in enumerate(points):
        start = max(0, i - half)
        end = min(len(points), i + half + 1)
        speeds = sorted(pt["kmh"] for pt in points[start:end])
        mid = len(speeds) // 2
        p_copy = {**p, "kmh": speeds[mid]}
        smoothed.append(p_copy)

    return smoothed


def trim_edges(points: List[Dict[str, Any]], trim_m: float = 200.0) -> List[Dict[str, Any]]:
    """
    Trim first and last `trim_m` metres of a trip for user privacy.
    Prevents exact home or workplace location identification.
    """
    if len(points) < 3:
        return []

    cum_dist = [0.0]
    for i in range(1, len(points)):
        d = haversine_m(
            points[i - 1]["lat"], points[i - 1]["lon"],
            points[i]["lat"], points[i]["lon"],
        )
        cum_dist.append(cum_dist[-1] + d)

    total = cum_dist[-1]
    if total <= trim_m * 2:
        return []

    return [
        p for p, d in zip(points, cum_dist)
        if trim_m <= d <= (total - trim_m)
    ]
