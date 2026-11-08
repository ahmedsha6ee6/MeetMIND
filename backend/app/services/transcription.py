import os
import threading
from typing import List, Dict, Any, Optional
from loguru import logger
from app.config import get_settings

settings = get_settings()

_model_lock = threading.Lock()
_whisper_model_instance = None


class TranscriptionService:
    def __init__(self):
        self.model_size = settings.WHISPER_MODEL_SIZE
        self.device = settings.WHISPER_DEVICE
        self.model_dir = settings.WHISPER_MODEL_DIR
        os.makedirs(self.model_dir, exist_ok=True)

    def _get_model(self):
        global _whisper_model_instance
        if _whisper_model_instance is not None:
            return _whisper_model_instance

        with _model_lock:
            if _whisper_model_instance is not None:
                return _whisper_model_instance

            from faster_whisper import WhisperModel

            compute_type = "float16" if self.device == "cuda" else "int8"
            logger.info(f"Loading Faster-Whisper model '{self.model_size}' on device '{self.device}' ({compute_type})...")

            try:
                model = WhisperModel(
                    self.model_size,
                    device=self.device,
                    compute_type=compute_type,
                    download_root=self.model_dir
                )
            except Exception as e:
                if self.device == "cuda":
                    logger.warning(f"Failed to load Faster-Whisper on CUDA ({e}). Falling back to CPU...")
                    model = WhisperModel(
                        self.model_size,
                        device="cpu",
                        compute_type="int8",
                        download_root=self.model_dir
                    )
                else:
                    raise e

            _whisper_model_instance = model
            logger.info("Faster-Whisper model loaded successfully.")
            return _whisper_model_instance

    def transcribe(self, audio_path: str) -> List[Dict[str, Any]]:
        """
        Transcribes the given audio file using Faster-Whisper.
        Returns a list of segment dicts with start, end, and text.
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found at: {audio_path}")

        model = self._get_model()
        logger.info(f"Starting audio transcription for: {audio_path}")

        # vad_filter=True removes non-speech silence, improving speed and accuracy
        segments_generator, info = model.transcribe(
            audio_path,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        logger.info(f"Detected audio language: {info.language} (probability: {info.language_probability:.2f})")

        segments = []
        for segment in segments_generator:
            text = segment.text.strip()
            if text:
                segments.append({
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text
                })

        logger.info(f"Transcription complete: extracted {len(segments)} segments.")
        return segments


transcription_service = TranscriptionService()
