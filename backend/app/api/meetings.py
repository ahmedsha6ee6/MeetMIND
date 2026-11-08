import os
import uuid
import json
import shutil
from datetime import date
from typing import List, Optional
from urllib.parse import urlparse
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status
)
from fastapi.responses import FileResponse
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from arq import create_pool
from arq.connections import RedisSettings
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.auth import require_auth
from app.models.meeting import Meeting
from app.models.log import ProcessingLog
from app.schemas.meeting import (
    MeetingResponse,
    MeetingListResponse,
    MeetingUpdate,
    MeetingStatus
)
from app.services.docgen import document_service

router = APIRouter(prefix="/meetings", tags=["Meetings"], dependencies=[Depends(require_auth)])
settings = get_settings()

redis_url = urlparse(settings.REDIS_URL)
redis_settings = RedisSettings(
    host=redis_url.hostname or "localhost",
    port=redis_url.port or 6379,
    database=int(redis_url.path.lstrip("/") or "0")
)


async def get_arq_redis():
    return await create_pool(redis_settings)


@router.post("/upload", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting(
    file: UploadFile = File(...),
    title: str = Form(...),
    meeting_date: Optional[date] = Form(None),
    participants: Optional[str] = Form("[]"),  # JSON array string or comma separated
    context: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts meeting recording upload with streaming size & MIME validation (F3 fix),
    creates database record, and enqueues background processing task.
    """
    # 1. Validate MIME type
    content_type = (file.content_type or "").lower().strip()
    filename = file.filename or "recording.wav"
    ext = os.path.splitext(filename)[1].lower()

    allowed_types = settings.allowed_audio_types_list
    if content_type not in allowed_types and not any(ext.endswith(e) for e in [".mp3", ".wav", ".m4a", ".mp4", ".ogg"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{content_type}'. Allowed types: {', '.join(allowed_types)}"
        )

    # 2. Parse participants list
    parsed_participants = []
    if participants:
        try:
            parsed_participants = json.loads(participants)
            if not isinstance(parsed_participants, list):
                parsed_participants = [str(participants)]
        except Exception:
            parsed_participants = [p.strip() for p in participants.split(",") if p.strip()]

    meeting_id = uuid.uuid4()
    meeting_dir = os.path.join(settings.UPLOAD_DIR, str(meeting_id))
    os.makedirs(meeting_dir, exist_ok=True)
    audio_path = os.path.join(meeting_dir, filename)

    # 3. Stream upload and enforce file size limit
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    total_bytes = 0

    try:
        with open(audio_path, "wb") as buffer:
            while chunk := await file.read(64 * 1024):  # 64 KB chunks
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    buffer.close()
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded audio file."
        )

    # 4. Create Database record
    meeting = Meeting(
        id=meeting_id,
        title=title,
        meeting_date=meeting_date or date.today(),
        participants=parsed_participants,
        context=context,
        status=MeetingStatus.QUEUED.value,
        audio_path=audio_path,
        audio_filename=filename,
        audio_size_bytes=total_bytes,
        version=1,
        retry_count=0
    )
    db.add(meeting)

    log_entry = ProcessingLog(
        meeting_id=meeting.id,
        stage="upload",
        level="info",
        message=f"Uploaded audio '{filename}' ({round(total_bytes / (1024*1024), 2)} MB) and queued for processing."
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(meeting)

    # 5. Enqueue ARQ task
    try:
        redis = await get_arq_redis()
        await redis.enqueue_job("process_meeting", str(meeting.id))
        await redis.close()
        logger.info(f"Enqueued meeting {meeting.id} for processing.")
    except Exception as q_err:
        logger.warning(f"Could not connect to Redis broker ({q_err}). Job remains in QUEUED status.")

    return meeting


@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    List all meetings with pagination, ordered by latest created.
    """
    offset = (page - 1) * page_size

    total_query = select(func.count()).select_from(Meeting)
    total_result = await db.execute(total_query)
    total = total_result.scalar_one()

    query = select(Meeting).options(selectinload(Meeting.logs)).order_by(desc(Meeting.created_at)).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return MeetingListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve full meeting record by ID, including transcript, MOM data, and logs.
    """
    query = select(Meeting).options(selectinload(Meeting.logs)).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    return meeting


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Optimistic locking update endpoint (F7 fix).
    Checks version before applying changes. Returns 409 Conflict if stale.
    """
    query = select(Meeting).options(selectinload(Meeting.logs)).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    # Check optimistic concurrency lock
    if meeting.version != payload.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "stale_version",
                "message": "This meeting was updated elsewhere. Please refresh to inspect the latest changes.",
                "current_version": meeting.version,
                "attempted_version": payload.version
            }
        )

    # Apply updates
    if payload.title is not None:
        meeting.title = payload.title
    if payload.meeting_date is not None:
        meeting.meeting_date = payload.meeting_date
    if payload.participants is not None:
        meeting.participants = payload.participants
    if payload.context is not None:
        meeting.context = payload.context
    if payload.status is not None:
        meeting.status = payload.status.value

    regenerate_docs = False
    if payload.mom_data is not None:
        meeting.mom_data = payload.mom_data.model_dump()
        regenerate_docs = True

    if payload.transcript is not None:
        meeting.transcript = payload.transcript.model_dump()

    # Re-render documents if user edited MOM contents
    if regenerate_docs and meeting.mom_data:
        try:
            meeting.docx_path = document_service.generate_docx(
                meeting_id=str(meeting.id),
                title=meeting.title,
                meeting_date=meeting.meeting_date,
                participants=meeting.participants,
                context=meeting.context or "",
                mom_data=meeting.mom_data
            )
            meeting.pdf_path = document_service.generate_pdf(
                meeting_id=str(meeting.id),
                title=meeting.title,
                meeting_date=meeting.meeting_date,
                participants=meeting.participants,
                context=meeting.context or "",
                mom_data=meeting.mom_data
            )
        except Exception as doc_err:
            logger.warning(f"Could not re-render documents after MOM edit: {doc_err}")

    meeting.bump_version()

    log_entry = ProcessingLog(
        meeting_id=meeting.id,
        stage="edit",
        level="info",
        message=f"Meeting updated by user (version incremented to {meeting.version})."
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(meeting)

    return meeting


@router.post("/{meeting_id}/retry", response_model=MeetingResponse)
async def retry_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Re-enqueues a failed or pending meeting for processing.
    """
    query = select(Meeting).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    meeting.status = MeetingStatus.QUEUED.value
    meeting.error_message = None

    log_entry = ProcessingLog(
        meeting_id=meeting.id,
        stage="retry",
        level="info",
        message="Job retry initiated by user."
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(meeting)

    try:
        redis = await get_arq_redis()
        await redis.enqueue_job("process_meeting", str(meeting.id))
        await redis.close()
        logger.info(f"Re-enqueued meeting {meeting.id} for processing.")
    except Exception as q_err:
        logger.error(f"Failed to re-enqueue meeting: {q_err}")

    return meeting


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes meeting record from DB and deletes associated audio/document files.
    """
    query = select(Meeting).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    # Remove storage files
    upload_meeting_dir = os.path.join(settings.UPLOAD_DIR, str(meeting_id))
    if os.path.exists(upload_meeting_dir):
        shutil.rmtree(upload_meeting_dir, ignore_errors=True)

    output_meeting_dir = os.path.join(settings.OUTPUT_DIR, str(meeting_id))
    if os.path.exists(output_meeting_dir):
        shutil.rmtree(output_meeting_dir, ignore_errors=True)

    await db.delete(meeting)
    await db.commit()
    return None


@router.get("/{meeting_id}/download/docx")
async def download_docx(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Downloads generated DOCX meeting minutes.
    """
    query = select(Meeting).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting or not meeting.docx_path or not os.path.exists(meeting.docx_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DOCX file not generated or not found")

    filename = f"{meeting.title.replace(' ', '_')}_Minutes.docx"
    return FileResponse(
        meeting.docx_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename
    )


@router.get("/{meeting_id}/download/pdf")
async def download_pdf(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Downloads generated PDF meeting minutes.
    """
    query = select(Meeting).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting or not meeting.pdf_path or not os.path.exists(meeting.pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not generated or not found")

    filename = f"{meeting.title.replace(' ', '_')}_Minutes.pdf"
    return FileResponse(
        meeting.pdf_path,
        media_type="application/pdf",
        filename=filename
    )
