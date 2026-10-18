#!/bin/bash
# Import OpenStreetMap road network into PostGIS for ROAD-SENTINEL.
#
# Requirements:
#   - osmium-tool (apt install osmium-tool)
#   - osm2pgsql (apt install osm2pgsql)
#   - Geofabrik India extract: https://download.geofabrik.de/asia/india.html
#
# Example Usage:
#   ./scripts/import_osm.sh india-latest.osm.pbf 76.85,31.65,77.05,31.85

set -euo pipefail

PBF_FILE="${1:?Usage: import_osm.sh <pbf_file> <bbox>}"
BBOX="${2:?Provide bounding box as west,south,east,north}"
DB_NAME="${POSTGRES_DB:-roads}"
DB_USER="${POSTGRES_USER:-roads_user}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

echo "==> Extracting area from $PBF_FILE with bounding box $BBOX"
osmium extract -b "$BBOX" "$PBF_FILE" -o /tmp/region.osm.pbf --overwrite

echo "==> Importing into PostGIS database '$DB_NAME'"
osm2pgsql \
  -d "$DB_NAME" \
  -U "$DB_USER" \
  -H "$DB_HOST" \
  -P "$DB_PORT" \
  --create \
  --slim \
  -G \
  --hstore \
  -S /usr/share/osm2pgsql/default.style \
  /tmp/region.osm.pbf

echo "==> Populating road_segments table"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
  INSERT INTO road_segments (osm_way_id, name, highway, length_m, geom)
  SELECT
    osm_id,
    COALESCE(tags->'name', ''),
    tags->'highway',
    ST_Length(way::geography),
    ST_Transform(way, 4326)
  FROM planet_osm_line
  WHERE tags->'highway' IN (
    'trunk', 'trunk_link',
    'primary', 'primary_link',
    'secondary', 'secondary_link',
    'tertiary', 'tertiary_link',
    'residential', 'living_street',
    'service', 'unclassified'
  )
  ON CONFLICT DO NOTHING;
SQL

echo "==> Seeding default speed limits"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/seed_limits.sql

echo "==> Done. Imported road counts:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT highway, count(*) FROM road_segments GROUP BY highway ORDER BY count DESC;"

rm -f /tmp/region.osm.pbf
