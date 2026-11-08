import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import get_settings
from app.api import auth_router, meetings_router, jobs_router

settings = get_settings()

# Configure Loguru structured logging (F12 fix)
logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure required storage directories exist
    logger.info("Initializing MeetMind API storage directories...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
    os.makedirs(settings.WHISPER_MODEL_DIR, exist_ok=True)
    logger.info("MeetMind API service ready.")
    yield
    logger.info("Shutting down MeetMind API service.")


app = FastAPI(
    title="MeetMind API",
    description="Local-first AI Meeting Assistant API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration (F9 fix)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public Health Check endpoint (F13 fix)
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "app": "MeetMind",
        "version": "1.0.0",
        "environment": settings.APP_ENV
    }


# Include Routers
app.include_router(auth_router)
app.include_router(meetings_router)
app.include_router(jobs_router)
