-- Default speed limits by OSM highway class for Indian roads & hill campus routes.
-- Admins can override per segment via PUT /v1/settings/segments/{id}/limit

UPDATE road_segments SET speed_limit_kmh = 80, limit_source = 'default'
WHERE highway IN ('trunk', 'trunk_link') AND speed_limit_kmh IS NULL;

UPDATE road_segments SET speed_limit_kmh = 60, limit_source = 'default'
WHERE highway IN ('primary', 'primary_link') AND speed_limit_kmh IS NULL;

UPDATE road_segments SET speed_limit_kmh = 50, limit_source = 'default'
WHERE highway IN ('secondary', 'secondary_link') AND speed_limit_kmh IS NULL;

UPDATE road_segments SET speed_limit_kmh = 40, limit_source = 'default'
WHERE highway IN ('tertiary', 'tertiary_link') AND speed_limit_kmh IS NULL;

UPDATE road_segments SET speed_limit_kmh = 30, limit_source = 'default'
WHERE highway IN ('residential', 'living_street', 'service') AND speed_limit_kmh IS NULL;

UPDATE road_segments SET speed_limit_kmh = 20, limit_source = 'default'
WHERE highway IN ('unclassified', 'track', 'path') AND speed_limit_kmh IS NULL;

-- Summary of applied defaults
SELECT highway, count(*) AS segments_count, speed_limit_kmh
FROM road_segments
WHERE limit_source = 'default'
GROUP BY highway, speed_limit_kmh
ORDER BY speed_limit_kmh DESC;
