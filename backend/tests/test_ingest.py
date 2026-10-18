"""Unit tests for the GPS ingest payload validation models."""

from datetime import datetime, timezone
import pytest
from app.api.ingest import Fix, Batch


class TestIngestValidation:
    def test_fix_model_valid(self):
        fix = Fix(
            t=datetime.now(timezone.utc),
            lat=31.7087,
            lon=76.9320,
            acc=6.0,
            spd=9.8,
            hdg=112.0,
        )
        assert fix.lat == 31.7087
        assert fix.lon == 76.9320

    def test_fix_model_lat_out_of_range(self):
        with pytest.raises(Exception):
            Fix(t=datetime.now(timezone.utc), lat=95.0, lon=76.0)

    def test_fix_model_lon_out_of_range(self):
        with pytest.raises(Exception):
            Fix(t=datetime.now(timezone.utc), lat=31.0, lon=200.0)

    def test_batch_model_valid(self):
        batch = Batch(
            trip_id="test-trip-uuid",
            vehicle_class="car",
            fixes=[Fix(
                t=datetime.now(timezone.utc),
                lat=31.7087,
                lon=76.9320,
            )],
        )
        assert len(batch.fixes) == 1
        assert batch.vehicle_class == "car"

    def test_batch_model_empty_fixes(self):
        with pytest.raises(Exception):
            Batch(trip_id="test", fixes=[])

    def test_batch_model_too_many_fixes(self):
        fixes = [
            Fix(t=datetime.now(timezone.utc), lat=31.7, lon=76.9)
            for _ in range(501)
        ]
        with pytest.raises(Exception):
            Batch(trip_id="test", fixes=fixes)
