"""WebSocket endpoint for real-time speed event notifications."""

import asyncio
import json
import logging
from typing import List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from app.config import settings

router = APIRouter(prefix="/v1/stream")
log = logging.getLogger("stream")


class ConnectionManager:
    """Manages active officer WebSocket connections."""

    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@router.websocket("/events")
async def ws_events(ws: WebSocket):
    """
    WebSocket endpoint for live speed events.
    Subscribes to Redis pub/sub channel 'speed:events'.
    """
    await manager.connect(ws)

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe("speed:events")
    except Exception as e:
        log.warning(f"Redis pubsub connection failed: {e}")
        r = None
        pubsub = None

    try:
        while True:
            if pubsub:
                msg = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                if msg and msg.get("type") == "message":
                    try:
                        data = json.loads(msg["data"])
                        await ws.send_json(data)
                    except Exception:
                        pass

            try:
                client_msg = await asyncio.wait_for(ws.receive_text(), timeout=0.1)
                if client_msg == "ping":
                    await ws.send_text("pong")
            except asyncio.TimeoutError:
                pass

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
        if pubsub:
            await pubsub.unsubscribe("speed:events")
        if r:
            await r.aclose()
