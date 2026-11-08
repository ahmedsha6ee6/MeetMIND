# MeetMind: AI-Powered Local Meeting Assistant

MeetMind is an open-source, local-first meeting assistant that transcribes meeting audio, extracts actionable items, and generates structured Minutes of Meeting (MOM) documents in DOCX and PDF formats without relying on paid third-party AI APIs.

---

## 🚀 Key Features

- **Local Speech-to-Text:** Faster-Whisper (CTranslate2) with GPU acceleration and automatic CPU fallback.
- **Local AI Analysis:** Ollama LLM (`llama3.2:3b`) extracting structured summaries, decisions, action items, and open questions in strict JSON format.
- **Privacy & Offline First:** Audio and transcripts remain on local storage.
- **Resilient Task Processing:** Async background execution via ARQ and Redis with Append-Only File (AOF) persistence.
- **Optimistic Concurrency Control:** Version-tracked edits to prevent overwriting concurrent updates.
- **Document Export:** Standardized DOCX generation via `python-docx` and clean PDF export via `WeasyPrint`.

---

## 🛠️ Tech Stack

| Layer | Component | Description |
|---|---|---|
| **Host** | Windows + Ubuntu on WSL2 | Dockerized services with NVIDIA CUDA passthrough |
| **Containers** | Docker Compose | Multi-container orchestration |
| **Frontend** | React (Vite) + TailwindCSS | Audio upload, review dashboard, and editor |
| **Backend** | Python 3.12 + FastAPI | Async REST API, token authentication, file validation |
| **Database** | PostgreSQL 16 + Alembic | Durable records, JSONB storage for transcripts & MOM data |
| **Queue / Broker** | ARQ + Redis 7 | Resilient async job pipeline with AOF persistence |
| **Transcription** | Faster-Whisper | Local ASR powered by CTranslate2 |
| **LLM Inference** | Ollama | Local quantized model serving |
| **Document Engine** | python-docx + WeasyPrint | Document formatting and PDF generation |

---

## 📁 Repository Structure

```
meetmind/
├── docker-compose.yml          # Container configuration for all 5 services
├── .env.example                # Environment variables template
├── .gitignore                  # VCS rules ignoring sensitive files and weights
├── README.md                   # Project overview and setup guide
├── scripts/
│   ├── download_models.sh      # First-run pre-fetch script for models
│   └── backup.sh               # Database and output document backup utility
├── backend/                    # FastAPI REST API & ARQ workers
│   ├── Dockerfile              # Backend container
│   ├── Dockerfile.worker       # Task worker container
│   ├── requirements.txt        # Python dependencies
│   ├── alembic/                # Database migrations
│   └── app/                    # Application logic, models, schemas, and routes
└── frontend/                   # React web application
    ├── Dockerfile              # Production Nginx frontend container
    ├── package.json            # Node dependencies
    └── src/                    # UI components, pages, and API clients
```

---

## 🏁 Quickstart

### 1. Prerequisites
- Docker & Docker Compose
- NVIDIA Drivers + Container Toolkit (for GPU acceleration on WSL2/Linux, optional)
- Git

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your desired credentials and secrets
```

### 3. Pre-download AI Models
```bash
bash scripts/download_models.sh
```

### 4. Launch Services
```bash
docker compose up -d
```

The web dashboard will be available at `http://localhost:3000` and the API documentation at `http://localhost:8000/docs`.
