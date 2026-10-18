from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://roads_user:changeme@localhost:5432/roads"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT Auth
    JWT_SECRET: str = "road-sentinel-speed-tracker-dev-secret-key-32chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Device key hashing
    DEVICE_KEY_SALT: str = "road-sentinel-device-salt-key-999"

    # Ingest settings
    ALLOW_OLD_TIMESTAMPS: bool = True
    MAX_BATCH_SIZE: int = 500
    DEVICE_RATE_LIMIT_PER_MIN: int = 12

    # Data retention
    RETENTION_RAW_DAYS: int = 30

    # Speed analytics
    MIN_TRIPS_FOR_STATS: int = 5
    ROLLUP_INTERVAL_MINUTES: int = 5
    ROLLUP_LOOKBACK_MINUTES: int = 30

    # Event detection thresholds (defaults, overridable via admin API)
    OVERSPEED_RATIO: float = 1.10
    SLOWDOWN_RATIO: float = 0.60
    DECEL_SPEED_DROP: float = 0.50
    DECEL_MIN_TRIPS: int = 4
    DECEL_CELL_SIZE_M: float = 30.0
    EVENT_OPEN_BUCKETS: int = 3
    EVENT_CLOSE_BUCKETS: int = 6

    # Map matching
    MATCH_DISTANCE_DEG: float = 0.0003  # ~33m

    # Privacy
    TRIP_EDGE_TRIM_M: float = 200.0

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
