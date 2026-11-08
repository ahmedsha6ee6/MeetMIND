from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://meetmind:change_me_strong_password@postgres:5432/meetmind"

    # Redis / ARQ
    REDIS_URL: str = "redis://redis:6379/0"

    # Single-user Token Auth (F1 fix)
    API_SECRET_TOKEN: str = "meetmind_dev_secret_token_12345"
    API_USERNAME: str = "admin"
    API_PASSWORD: str = "change_me_strong_password"

    # Ollama LLM (F4 fix)
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"

    # Faster-Whisper ASR (F10 fix)
    WHISPER_MODEL_SIZE: str = "base"
    WHISPER_DEVICE: str = "cpu"  # auto falls back to cpu if cuda unavailable
    WHISPER_MODEL_DIR: str = os.getenv("WHISPER_MODEL_DIR", "/app/models")

    # Upload & Storage constraints (F3 fix)
    MAX_UPLOAD_SIZE_MB: int = 500
    ALLOWED_AUDIO_TYPES: str = "audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/ogg,audio/x-wav"
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/app/uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "/app/outputs")

    # Application
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_audio_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_AUDIO_TYPES.split(",") if t.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
