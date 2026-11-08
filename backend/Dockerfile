FROM python:3.12-slim

# Install system dependencies:
# - ffmpeg: audio decoding for Whisper (MP3, M4A, WAV, etc.)
# - WeasyPrint runtime libraries (cairo, pango, gdk-pixbuf)
# - curl: healthcheck probing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run DB migrations on container startup, then start FastAPI server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
