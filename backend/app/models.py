"""SQLAlchemy ORM models for the Speed Tracker module."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Float, SmallInteger, Integer, BigInteger,
    DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from geoalchemy2 import Geometry


class Base(DeclarativeBase):
    pass


# ─── Devices & Trips ──────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_hash = Column(Text, unique=True, nullable=False)
    api_key_hash = Column(Text, nullable=False)
    platform = Column(String(20), nullable=False)
    consent_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    trips = relationship("Trip", back_populates="device")

    __table_args__ = (
        CheckConstraint(
            "platform IN ('pwa','android','ios','tracker','simulator')",
            name="ck_devices_platform"
        ),
    )


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    vehicle_class = Column(String(20), nullable=False, default="unknown")

    device = relationship("Device", back_populates="trips")


# ─── GPS Points ───────────────────────────────────────────────────

class GpsPoint(Base):
    __tablename__ = "gps_points"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    trip_id = Column(UUID(as_uuid=True), nullable=False)
    recorded_at = Column(DateTime(timezone=True), nullable=False, primary_key=True)
    geom = Column(Geometry("POINT", srid=4326), nullable=False)
    speed_kmh = Column(Float, nullable=True)
    raw_speed_kmh = Column(Float, nullable=True)
    accuracy_m = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    segment_id = Column(BigInteger, ForeignKey("road_segments.id"), nullable=True)

    __table_args__ = (
        Index("ix_gps_points_segment_recorded", "segment_id", "recorded_at"),
    )


# ─── Road Segments ────────────────────────────────────────────────

class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    osm_way_id = Column(BigInteger, nullable=True)
    name = Column(Text, nullable=True)
    highway = Column(Text, nullable=True)  # OSM road class
    speed_limit_kmh = Column(SmallInteger, nullable=True)
    limit_source = Column(String(20), nullable=False, default="default")
    length_m = Column(Float, nullable=True)
    geom = Column(Geometry("LINESTRING", srid=4326), nullable=False)

    __table_args__ = (
        Index("ix_road_segments_geom", "geom", postgresql_using="gist"),
    )


# ─── Speed Aggregates ─────────────────────────────────────────────

class SegmentSpeedAgg(Base):
    __tablename__ = "segment_speed_agg"

    segment_id = Column(BigInteger, ForeignKey("road_segments.id"), primary_key=True)
    bucket_start = Column(DateTime(timezone=True), primary_key=True)
    n_points = Column(Integer, nullable=False)
    n_trips = Column(SmallInteger, nullable=False)
    avg_kmh = Column(Float, nullable=True)
    p50_kmh = Column(Float, nullable=True)
    p85_kmh = Column(Float, nullable=True)
    min_kmh = Column(Float, nullable=True)
    max_kmh = Column(Float, nullable=True)


# ─── Speed Events ─────────────────────────────────────────────────

class SpeedEvent(Base):
    __tablename__ = "speed_events"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    type = Column(String(20), nullable=False)
    segment_id = Column(BigInteger, ForeignKey("road_segments.id"), nullable=False)
    geom = Column(Geometry("POINT", srid=4326), nullable=True)
    first_seen = Column(DateTime(timezone=True), nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=False)
    severity = Column(SmallInteger, nullable=False)
    metric = Column(JSONB, nullable=False)
    status = Column(String(20), nullable=False, default="open")
    complaint_id = Column(BigInteger, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "type IN ('OVERSPEED','SLOWDOWN','DECEL_CLUSTER')",
            name="ck_speed_events_type"
        ),
        CheckConstraint(
            "severity BETWEEN 1 AND 3",
            name="ck_speed_events_severity"
        ),
        CheckConstraint(
            "status IN ('open','acknowledged','linked','closed')",
            name="ck_speed_events_status"
        ),
    )


# ─── Thresholds (admin-configurable) ─────────────────────────────

class ThresholdSetting(Base):
    __tablename__ = "threshold_settings"

    key = Column(String(60), primary_key=True)
    value = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(100), nullable=True)


# ─── Audit Log ────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    action = Column(String(60), nullable=False)
    entity_type = Column(String(40), nullable=False)
    entity_id = Column(Text, nullable=False)
    user_id = Column(String(100), nullable=False)
    detail = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
