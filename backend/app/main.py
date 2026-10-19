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


@app.get("/", include_in_schema=False)
async def root():
    """Root route providing direct navigation to Swagger docs and frontends."""
    from fastapi.responses import HTMLResponse
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ROAD-SENTINEL — Speed Tracker API</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                background: #07130d;
                color: #e2e8f0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
            }
            .card {
                background: #0f2318;
                border: 1px solid rgba(16, 185, 129, 0.25);
                border-radius: 16px;
                padding: 36px;
                max-width: 560px;
                width: 100%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
                border: 1px solid rgba(16, 185, 129, 0.3);
                padding: 4px 12px;
                border-radius: 9999px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 16px;
            }
            .badge::before {
                content: "";
                display: inline-block;
                width: 8px;
                height: 8px;
                background: #10b981;
                border-radius: 50%;
                box-shadow: 0 0 8px #10b981;
            }
            h1 { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
            p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
            .grid { display: grid; gap: 12px; }
            .btn {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 18px;
                border-radius: 10px;
                text-decoration: none;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .btn-primary {
                background: #10b981;
                color: #07130d;
            }
            .btn-primary:hover { background: #34d399; transform: translateY(-1px); }
            .btn-secondary {
                background: rgba(255, 255, 255, 0.05);
                color: #e2e8f0;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(16, 185, 129, 0.4); }
            .endpoints {
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                font-size: 12px;
                color: #64748b;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="badge">Speed Tracker API Active</div>
            <h1>ROAD-SENTINEL Backend</h1>
            <p>GPS speed data ingestion, road map-matching, and hazard correlation backend engine for IIT Mandi Campus Road Safety Observatory.</p>
            
            <div class="grid">
                <a href="/docs" class="btn btn-primary">
                    <span>📖 Open Interactive Swagger UI</span>
                    <span>/docs &rarr;</span>
                </a>
                <a href="/redoc" class="btn btn-secondary">
                    <span>📋 Open ReDoc API Specs</span>
                    <span>/redoc &rarr;</span>
                </a>
                <a href="http://localhost:3001/dashboard" class="btn btn-secondary" target="_blank">
                    <span>📊 Open Admin Dashboard</span>
                    <span>:3001 &rarr;</span>
                </a>
                <a href="http://localhost:3000" class="btn btn-secondary" target="_blank">
                    <span>🌐 Open Public Website</span>
                    <span>:3000 &rarr;</span>
                </a>
            </div>

            <div class="endpoints">
                Healthcheck: <a href="/healthz" style="color: #34d399;">/healthz</a> &bull; Version 1.0.0
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
