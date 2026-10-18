"""FastAPI application entry point for the Speed Tracker API."""

import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api import ingest, devices, segments, events, complaints, settings as settings_api, stream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: manages Redis connection pool."""
    try:
        app.state.redis = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=50,
        )
        log.info(f"Connected to Redis at {settings.REDIS_URL}")
    except Exception as e:
        log.warning(f"Failed to connect to Redis at startup: {e}")
        app.state.redis = None

    yield

    if app.state.redis:
        await app.state.redis.aclose()
        log.info("Closed Redis connection.")


app = FastAPI(
    title="ROAD-SENTINEL Speed Tracker API",
    description="GPS speed data ingestion, road map-matching, and hazard correlation backend.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(ingest.router, tags=["Ingest"])
app.include_router(devices.router, tags=["Devices"])
app.include_router(segments.router, tags=["Segments"])
app.include_router(events.router, tags=["Events"])
app.include_router(complaints.router, tags=["Complaints"])
app.include_router(settings_api.router, tags=["Settings"])
app.include_router(stream.router, tags=["Stream"])


@app.get("/healthz", tags=["Health"])
async def healthz():
    """Health check endpoint for Docker and monitoring."""
    return {"status": "ok", "service": "road-sentinel-speed-tracker"}
