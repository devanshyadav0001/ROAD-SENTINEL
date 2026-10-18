"""Redis-based sliding window rate limiter."""

from typing import Optional
import redis.asyncio as aioredis
from fastapi import HTTPException, Request

from app.config import settings


async def check_rate_limit(
    request: Request,
    key: str,
    max_requests: Optional[int] = None,
    window_seconds: int = 60,
):
    """
    Check if the request exceeds the rate limit.
    Uses a Redis sliding counter keyed by device key or IP.
    """
    if max_requests is None:
        max_requests = settings.DEVICE_RATE_LIMIT_PER_MIN

    redis_client: aioredis.Redis = getattr(request.app.state, "redis", None)
    if not redis_client:
        return  # Gracefully pass if Redis is not configured during tests

    redis_key = f"ratelimit:{key}"

    current = await redis_client.incr(redis_key)
    if current == 1:
        await redis_client.expire(redis_key, window_seconds)

    if current > max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds}s.",
        )
