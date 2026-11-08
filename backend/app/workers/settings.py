from urllib.parse import urlparse
from arq.connections import RedisSettings
from app.config import get_settings
from app.workers.tasks import process_meeting

settings = get_settings()

redis_url = urlparse(settings.REDIS_URL)


class WorkerSettings:
    functions = [process_meeting]
    redis_settings = RedisSettings(
        host=redis_url.hostname or "localhost",
        port=redis_url.port or 6379,
        database=int(redis_url.path.lstrip("/") or "0")
    )
    # Limit max_jobs to 2 to prevent RAM/VRAM exhaustion on laptops (4GB VRAM constraint)
    max_jobs = 2
    job_timeout = 1800  # 30 minutes max per meeting processing
    max_tries = 3
    retry_delay = 10
