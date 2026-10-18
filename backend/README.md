# ROAD-SENTINEL Speed Tracker Backend

The backend engine for the **Speed Tracker Module** inside the Campus Road Safety Observatory platform.

## Architecture

- **Framework:** FastAPI (Python 3.11+) with async SQLAlchemy 2
- **Database:** PostgreSQL 16 + PostGIS 3.4
- **Queue & PubSub:** Redis 7 (Streams for ingest buffering + Pub/Sub for WebSockets)
- **Containerization:** Docker + Docker Compose

## Quick Start with Docker

```bash
# 1. From the project root, launch database, redis, api, and worker
docker compose up --build -d

# 2. Initialize the PostGIS database schema
docker compose exec db psql -U roads_user -d roads -f /app/scripts/init_schema.sql

# 3. View live logs
docker compose logs -f api worker
```

## Running Locally without Docker

1. **Setup virtual environment:**
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

2. **Configure environment:**
Copy `.env.example` to `.env` and verify database / Redis URLs.

3. **Run API:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

4. **Run Background Worker:**
```bash
python -m app.worker
```

## API Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/v1/devices/register` | Public | Register client device & obtain secret API key |
| `POST` | `/v1/ingest/batch` | Device (`X-API-Key`) | Ingest batch of GPS fixes (returns 202 Accepted) |
| `GET` | `/v1/segments?bbox=&at=` | Viewer | GeoJSON FeatureCollection with live speed stats |
| `GET` | `/v1/segments/{id}/stats?from=&to=` | Viewer | 5-minute time series buckets for charts |
| `GET` | `/v1/events?type=&status=` | Viewer | Filter speed events (OVERSPEED, SLOWDOWN) |
| `PATCH` | `/v1/events/{id}` | Officer | Acknowledge or close an event |
| `POST` | `/v1/events/{id}/complaint` | Officer | Auto-escalate speed event into a complaint |
| `GET` | `/v1/complaints/{id}/speed-context` | Viewer | Traffic stats & repair verification verdict |
| `GET/PUT` | `/v1/settings/thresholds` | Admin | Read or update detection rule thresholds |
| `PUT` | `/v1/settings/segments/{id}/limit` | Admin | Set manual speed limit for a road segment |
| `WS` | `/v1/stream/events` | Officer | Live WebSocket event stream |
| `GET` | `/healthz` | Public | Container health check |

## Testing

Run unit tests with pytest:
```bash
pytest tests/
```
