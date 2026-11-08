import uuid
from typing import Dict, Any
from sqlalchemy import select
from loguru import logger
from app.database import AsyncSessionLocal
from app.models.meeting import Meeting
from app.models.log import ProcessingLog
from app.schemas.meeting import MeetingStatus
from app.services.transcription import transcription_service
from app.services.llm import llm_service
from app.services.docgen import document_service


async def add_log(session, meeting_id: uuid.UUID, stage: str, message: str, level: str = "info"):
    log = ProcessingLog(
        meeting_id=meeting_id,
        stage=stage,
        level=level,
        message=message
    )
    session.add(log)
    await session.commit()
    logger.info(f"[{meeting_id}] [{stage.upper()}] {message}")


async def process_meeting(ctx: Dict[str, Any], meeting_id_str: str) -> None:
    """
    Main asynchronous pipeline for processing an uploaded meeting:
    Transcribe -> Analyze (LLM) -> Generate Documents -> Awaiting Review
    """
    meeting_id = uuid.UUID(meeting_id_str)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Meeting).where(Meeting.id == meeting_id))
        meeting = result.scalar_one_or_none()

        if not meeting:
            logger.error(f"Meeting {meeting_id} not found in database.")
            return

        try:
            # Stage 1: Transcription
            meeting.status = MeetingStatus.TRANSCRIBING.value
            await session.commit()
            await add_log(session, meeting_id, "transcribing", f"Beginning transcription of {meeting.audio_filename or 'audio'}")

            segments = transcription_service.transcribe(meeting.audio_path)
            meeting.transcript = {"segments": segments}
            await session.commit()
            await add_log(session, meeting_id, "transcribing", f"Transcription completed with {len(segments)} segments.")

            # Stage 2: LLM Analysis
            meeting.status = MeetingStatus.ANALYSING.value
            await session.commit()
            await add_log(session, meeting_id, "analysing", "Extracting meeting summary, decisions, and action items via Ollama LLM.")

            transcript_text = "\n".join(f"[{s['start']}s - {s['end']}s]: {s['text']}" for s in segments)
            mom_data = await llm_service.analyse_transcript(
                transcript_text=transcript_text,
                title=meeting.title,
                context=meeting.context,
                participants=meeting.participants
            )
            meeting.mom_data = mom_data
            await session.commit()
            await add_log(session, meeting_id, "analysing", f"MOM analysis completed ({len(mom_data.get('action_items', []))} action items found).")

            # Stage 3: Document Generation
            meeting.status = MeetingStatus.GENERATING.value
            await session.commit()
            await add_log(session, meeting_id, "generating", "Rendering standardized DOCX and PDF documents.")

            docx_path = document_service.generate_docx(
                meeting_id=str(meeting.id),
                title=meeting.title,
                meeting_date=meeting.meeting_date,
                participants=meeting.participants,
                context=meeting.context or "",
                mom_data=mom_data
            )
            meeting.docx_path = docx_path

            try:
                pdf_path = document_service.generate_pdf(
                    meeting_id=str(meeting.id),
                    title=meeting.title,
                    meeting_date=meeting.meeting_date,
                    participants=meeting.participants,
                    context=meeting.context or "",
                    mom_data=mom_data
                )
                meeting.pdf_path = pdf_path
            except Exception as pdf_err:
                logger.warning(f"PDF generation failed, DOCX is still available: {pdf_err}")
                await add_log(session, meeting_id, "generating", f"PDF conversion notice: {pdf_err}", level="warn")

            # Stage 4: Ready for Review
            meeting.status = MeetingStatus.AWAITING_REVIEW.value
            meeting.error_message = None
            meeting.bump_version()
            await session.commit()
            await add_log(session, meeting_id, "awaiting_review", "Processing complete. Ready for human review and edit.")

        except Exception as e:
            logger.exception(f"Error occurred while processing meeting {meeting_id}: {e}")
            meeting.status = MeetingStatus.FAILED.value
            meeting.error_message = str(e)
            meeting.retry_count += 1
            await session.commit()
            await add_log(session, meeting_id, "failed", f"Processing failed: {str(e)}", level="error")
