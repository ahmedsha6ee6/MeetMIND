import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth import require_auth
from app.models.meeting import Meeting
from app.schemas.meeting import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"], dependencies=[Depends(require_auth)])


@router.get("/{meeting_id}/status", response_model=JobStatusResponse)
async def get_job_status(
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Polling endpoint for tracking meeting processing stage and recent log entries.
    """
    query = select(Meeting).options(selectinload(Meeting.logs)).where(Meeting.id == meeting_id)
    result = await db.execute(query)
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting job not found")

    return JobStatusResponse(
        meeting_id=meeting.id,
        status=meeting.status,
        retry_count=meeting.retry_count,
        error_message=meeting.error_message,
        logs=meeting.logs
    )
