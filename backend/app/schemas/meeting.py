from datetime import date, datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class MeetingStatus(str, Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued"
    TRANSCRIBING = "transcribing"
    ANALYSING = "analysing"
    GENERATING = "generating"
    AWAITING_REVIEW = "awaiting_review"
    COMPLETED = "completed"
    FAILED = "failed"


class ConfidenceLevel(str, Enum):
    EXPLICIT = "explicit"
    INFERRED = "inferred"


class Decision(BaseModel):
    description: str
    confidence: ConfidenceLevel = ConfidenceLevel.EXPLICIT


class ActionItem(BaseModel):
    task: str
    owner: Optional[str] = None
    deadline: Optional[str] = None  # YYYY-MM-DD or None
    confidence: ConfidenceLevel = ConfidenceLevel.EXPLICIT


class MOMData(BaseModel):
    summary: str = ""
    discussion_topics: List[str] = Field(default_factory=list)
    decisions: List[Decision] = Field(default_factory=list)
    action_items: List[ActionItem] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptData(BaseModel):
    segments: List[TranscriptSegment] = Field(default_factory=list)


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_date: date = Field(default_factory=date.today)
    participants: List[str] = Field(default_factory=list)
    context: Optional[str] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[date] = None
    participants: Optional[List[str]] = None
    context: Optional[str] = None
    mom_data: Optional[MOMData] = None
    transcript: Optional[TranscriptData] = None
    status: Optional[MeetingStatus] = None
    version: int = Field(..., description="Expected current version for optimistic concurrency control")


class ProcessingLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stage: str
    level: str
    message: str
    created_at: datetime


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    meeting_date: date
    participants: List[str]
    context: Optional[str] = None
    status: MeetingStatus
    audio_filename: Optional[str] = None
    audio_size_bytes: Optional[int] = None
    transcript: Optional[Dict[str, Any]] = None
    mom_data: Optional[Dict[str, Any]] = None
    docx_path: Optional[str] = None
    pdf_path: Optional[str] = None
    version: int
    retry_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    logs: Optional[List[ProcessingLogResponse]] = []


class MeetingListResponse(BaseModel):
    items: List[MeetingResponse]
    total: int
    page: int
    page_size: int


class JobStatusResponse(BaseModel):
    meeting_id: UUID
    status: MeetingStatus
    retry_count: int
    error_message: Optional[str] = None
    logs: List[ProcessingLogResponse] = Field(default_factory=list)
