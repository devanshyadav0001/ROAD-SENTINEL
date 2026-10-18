-- ROAD-SENTINEL Speed Tracker Initial Database Schema
-- Run this once on the PostgreSQL + PostGIS database

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Devices (registered data collectors)
CREATE TABLE IF NOT EXISTS devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash  TEXT UNIQUE NOT NULL,
  api_key_hash TEXT NOT NULL,
  platform     TEXT NOT NULL CHECK (platform IN ('pwa','android','ios','tracker','simulator')),
  consent_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at   TIMESTAMPTZ
);

-- 2. Trips
CREATE TABLE IF NOT EXISTS trips (
  id            UUID PRIMARY KEY,
  device_id     UUID NOT NULL REFERENCES devices(id),
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ,
  vehicle_class TEXT NOT NULL DEFAULT 'unknown'
);

-- 3. Road Segments
CREATE TABLE IF NOT EXISTS road_segments (
  id              BIGSERIAL PRIMARY KEY,
  osm_way_id      BIGINT,
  name            TEXT,
  highway         TEXT,
  speed_limit_kmh SMALLINT,
  limit_source    TEXT NOT NULL DEFAULT 'default',
  length_m        REAL,
  geom            GEOMETRY(LineString, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_road_segments_geom ON road_segments USING GIST (geom);

-- 4. GPS Points (Partitioned by day)
CREATE TABLE IF NOT EXISTS gps_points (
  id            BIGSERIAL,
  trip_id       UUID NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL,
  geom          GEOMETRY(Point, 4326) NOT NULL,
  speed_kmh     REAL,
  raw_speed_kmh REAL,
  accuracy_m    REAL,
  heading       REAL,
  segment_id    BIGINT REFERENCES road_segments(id),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Initial daily partitions for active development & testing
CREATE TABLE IF NOT EXISTS gps_points_default PARTITION OF gps_points DEFAULT;

CREATE INDEX IF NOT EXISTS ix_gps_points_segment_recorded ON gps_points (segment_id, recorded_at);
CREATE INDEX IF NOT EXISTS ix_gps_points_recorded_brin ON gps_points USING BRIN (recorded_at);

-- 5. 5-Minute Segment Speed Aggregates
CREATE TABLE IF NOT EXISTS segment_speed_agg (
  segment_id   BIGINT NOT NULL REFERENCES road_segments(id),
  bucket_start TIMESTAMPTZ NOT NULL,
  n_points     INT NOT NULL,
  n_trips      SMALLINT NOT NULL,
  avg_kmh      REAL,
  p50_kmh      REAL,
  p85_kmh      REAL,
  min_kmh      REAL,
  max_kmh      REAL,
  PRIMARY KEY (segment_id, bucket_start)
);

-- 6. Speed Events
CREATE TABLE IF NOT EXISTS speed_events (
  id           BIGSERIAL PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('OVERSPEED','SLOWDOWN','DECEL_CLUSTER')),
  segment_id   BIGINT NOT NULL REFERENCES road_segments(id),
  geom         GEOMETRY(Point, 4326),
  first_seen   TIMESTAMPTZ NOT NULL,
  last_seen    TIMESTAMPTZ NOT NULL,
  severity     SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 3),
  metric       JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','linked','closed')),
  complaint_id BIGINT
);

-- 7. Complaints table (for standalone development or integration)
CREATE TABLE IF NOT EXISTS complaints (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'medium',
  status       TEXT NOT NULL DEFAULT 'submitted',
  segment_id   BIGINT REFERENCES road_segments(id),
  geom         GEOMETRY(Point, 4326),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_complaints_geom ON complaints USING GIST (geom);

-- 8. Threshold Settings
CREATE TABLE IF NOT EXISTS threshold_settings (
  key         VARCHAR(60) PRIMARY KEY,
  value       DOUBLE PRECISION NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  VARCHAR(100)
);

-- 9. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  action      VARCHAR(60) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id   TEXT NOT NULL,
  user_id     VARCHAR(100) NOT NULL,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial thresholds
INSERT INTO threshold_settings (key, value, description)
VALUES
  ('OVERSPEED_RATIO', 1.10, 'P85 ratio above speed limit to trigger overspeed event'),
  ('SLOWDOWN_RATIO', 0.60, 'P50 ratio below historic baseline to trigger slowdown event'),
  ('DECEL_SPEED_DROP', 0.50, 'Minimum speed loss fraction (50%) to qualify as hard deceleration'),
  ('DECEL_MIN_TRIPS', 4.0, 'Minimum number of distinct trips in cell for deceleration cluster'),
  ('EVENT_OPEN_BUCKETS', 3.0, 'Consecutive 5-minute buckets required to open an event (15 min)'),
  ('EVENT_CLOSE_BUCKETS', 6.0, 'Consecutive 5-minute buckets without violation to close event (30 min)')
ON CONFLICT (key) DO NOTHING;
