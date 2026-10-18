"""Unit tests for the GPS cleaning and speed computation pipeline."""

import pytest
from app.pipeline.clean import haversine_m, clean_and_speed, median_smooth, trim_edges


class TestHaversine:
    def test_same_point(self):
        assert haversine_m(31.7, 76.9, 31.7, 76.9) == 0.0

    def test_known_distance(self):
        d = haversine_m(31.7754, 76.9861, 31.7087, 76.9320)
        assert 7000 < d < 12000

    def test_symmetry(self):
        d1 = haversine_m(31.7, 76.9, 31.8, 77.0)
        d2 = haversine_m(31.8, 77.0, 31.7, 76.9)
        assert abs(d1 - d2) < 0.01


class TestCleanAndSpeed:
    def test_empty_input(self):
        assert clean_and_speed([]) == []

    def test_single_point(self):
        result = clean_and_speed([{"t": 0, "lat": 31.7, "lon": 76.9, "acc": 5}])
        assert result == []

    def test_stationary_jitter(self):
        points = [
            {"t": 0, "lat": 31.70000, "lon": 76.90000, "acc": 5},
            {"t": 1, "lat": 31.700001, "lon": 76.900001, "acc": 5},
        ]
        result = clean_and_speed(points)
        assert len(result) == 1
        assert result[0]["kmh"] == 0.0

    def test_drops_poor_accuracy(self):
        points = [
            {"t": 0, "lat": 31.70, "lon": 76.90, "acc": 5},
            {"t": 1, "lat": 31.71, "lon": 76.91, "acc": 100},
            {"t": 2, "lat": 31.7002, "lon": 76.9002, "acc": 5},
        ]
        result = clean_and_speed(points, max_acc_m=30)
        assert all(p.get("acc", 0) <= 30 for p in result)

    def test_drops_teleport(self):
        points = [
            {"t": 0, "lat": 31.70, "lon": 76.90, "acc": 5},
            {"t": 1, "lat": 31.90, "lon": 76.90, "acc": 5},  # ~22 km jump in 1 second
        ]
        result = clean_and_speed(points, max_kmh=160)
        assert len(result) == 0

    def test_gap_detection(self):
        points = [
            {"t": 0, "lat": 31.70, "lon": 76.90, "acc": 5},
            {"t": 1, "lat": 31.7001, "lon": 76.9001, "acc": 5},
            {"t": 100, "lat": 31.7002, "lon": 76.9002, "acc": 5},
        ]
        result = clean_and_speed(points, max_gap_s=30)
        assert len(result) == 1


class TestMedianSmooth:
    def test_smoothing(self):
        points = [
            {"kmh": 30}, {"kmh": 100}, {"kmh": 35},
            {"kmh": 32}, {"kmh": 31},
        ]
        smoothed = median_smooth(points, window=3)
        assert smoothed[1]["kmh"] < 100

    def test_short_input(self):
        points = [{"kmh": 50}]
        assert median_smooth(points, window=3) == points


class TestTrimEdges:
    def test_short_trip(self):
        points = [
            {"lat": 31.70, "lon": 76.90},
            {"lat": 31.7001, "lon": 76.9001},
        ]
        assert trim_edges(points, trim_m=200) == []

    def test_trims_edges(self):
        points = [
            {"lat": 31.70 + i * 0.0001, "lon": 76.90}
            for i in range(100)
        ]
        trimmed = trim_edges(points, trim_m=200)
        assert len(trimmed) < len(points)
        assert len(trimmed) > 0
