import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column,
    String,
    Text,
    Date,
    DateTime,
    Integer,
    SmallInteger,
    BigInteger,
    func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    meeting_date = Column(Date, nullable=False, default=date.today)
    participants = Column(JSONB, nullable=False, default=list)  # list of strings
    context = Column(Text, nullable=True)

    status = Column(String(32), nullable=False, default="uploaded", index=True)
    audio_path = Column(String(512), nullable=True)
    audio_filename = Column(String(255), nullable=True)
    audio_size_bytes = Column(BigInteger, nullable=True)

    # Transcript and MOM structured records (F6 fix)
    transcript = Column(JSONB, nullable=True)
    mom_data = Column(JSONB, nullable=True)

    # Document paths
    docx_path = Column(String(512), nullable=True)
    pdf_path = Column(String(512), nullable=True)

    # Optimistic locking counter (F7 fix)
    version = Column(Integer, nullable=False, default=1)
    retry_count = Column(SmallInteger, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    logs = relationship("ProcessingLog", back_populates="meeting", cascade="all, delete-orphan", order_by="ProcessingLog.created_at.asc()")

    def bump_version(self) -> None:
        self.version += 1
