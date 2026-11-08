#!/usr/bin/env bash
# scripts/download_models.sh
# F10 fix – pre-download Faster-Whisper and Ollama model weights
# Run this ONCE before starting the stack:
#   bash scripts/download_models.sh
set -euo pipefail

WHISPER_MODEL=${WHISPER_MODEL_SIZE:-base}
OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2:3b}

echo "==> MeetMind: First-run model download"
echo "    Whisper model : ${WHISPER_MODEL}"
echo "    Ollama model  : ${OLLAMA_MODEL}"
echo ""

# ── 1. Pull Ollama model ──────────────────────────────────────────────────────
echo "[1/2] Pulling Ollama model '${OLLAMA_MODEL}' ..."
# Start Ollama container temporarily if not running
if ! docker compose ps ollama | grep -q "running"; then
  docker compose up -d ollama
  echo "      Waiting for Ollama to become ready..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then break; fi
    sleep 2
  done
fi

docker compose exec ollama ollama pull "${OLLAMA_MODEL}"
echo "    ✓ Ollama model downloaded."
echo ""

# ── 2. Pre-download Faster-Whisper model ─────────────────────────────────────
echo "[2/2] Pre-downloading Faster-Whisper model '${WHISPER_MODEL}' ..."
docker compose run --rm \
  -e WHISPER_MODEL_SIZE="${WHISPER_MODEL}" \
  worker python -c "
from faster_whisper import WhisperModel
import os
model_dir = os.environ.get('WHISPER_MODEL_DIR', '/app/models')
size = os.environ.get('WHISPER_MODEL_SIZE', 'base')
print(f'  Downloading {size} model to {model_dir} ...')
WhisperModel(size, device='cpu', download_root=model_dir)
print('  Done.')
"
echo "    ✓ Faster-Whisper model downloaded."
echo ""
echo "==> All models ready. You can now start the full stack:"
echo "    docker compose up -d"
