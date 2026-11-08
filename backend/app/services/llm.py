import json
import re
from typing import Dict, Any, Optional
import httpx
from loguru import logger
from app.config import get_settings
from app.schemas.meeting import MOMData

settings = get_settings()

SYSTEM_PROMPT = """You are an expert meeting analyst. Your task is to analyze meeting transcripts and generate structured Minutes of Meeting (MOM).

STRICT RULES YOU MUST NEVER VIOLATE:
1. Do NOT hallucinate or invent action item owners, people names, or deadlines.
2. If an owner is not explicitly stated in the transcript, set "owner" to null.
3. If a deadline or date is not explicitly stated in the transcript, set "deadline" to null.
4. "confidence" must be "explicit" if directly stated, or "inferred" if deduced from conversation context.
5. Return ONLY a single raw JSON object matching the schema below. No markdown backticks, no explanations.

REQUIRED JSON SCHEMA:
{
  "summary": "<Concise 2-4 sentence overview of the meeting>",
  "discussion_topics": ["<Key topic 1>", "<Key topic 2>"],
  "decisions": [
    {
      "description": "<What was agreed upon or decided>",
      "confidence": "explicit"
    }
  ],
  "action_items": [
    {
      "task": "<Actionable task description>",
      "owner": "<Full Name or null>",
      "deadline": "<YYYY-MM-DD or null>",
      "confidence": "explicit"
    }
  ],
  "open_questions": ["<Unresolved question or topic deferred for later>"]
}
"""


class LLMService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.model = settings.OLLAMA_MODEL

    async def analyse_transcript(
        self,
        transcript_text: str,
        title: str = "Meeting",
        context: Optional[str] = None,
        participants: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Sends the transcript to Ollama and returns structured MOM data.
        """
        if not transcript_text.strip():
            logger.warning("Empty transcript provided to LLM analysis.")
            return MOMData(summary="No spoken content detected in the recording.").model_dump()

        user_content = f"Meeting Title: {title}\n"
        if participants:
            user_content += f"Participants: {', '.join(participants)}\n"
        if context:
            user_content += f"Meeting Agenda / Context: {context}\n"
        user_content += f"\nFull Transcript:\n{transcript_text}\n\nGenerate the structured MOM JSON now:"

        payload = {
            "model": self.model,
            "system": SYSTEM_PROMPT,
            "prompt": user_content,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,  # Low temperature for factual precision
                "top_p": 0.9,
            }
        }

        url = f"{self.base_url}/api/generate"
        logger.info(f"Dispatching transcript to Ollama ({self.model}) at {url}...")

        async with httpx.AsyncClient(timeout=300.0) as client:
            try:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                raw_response = result.get("response", "").strip()
            except httpx.HTTPError as e:
                logger.error(f"HTTP error communicating with Ollama: {e}")
                raise RuntimeError(f"Ollama API request failed: {e}")

        logger.debug(f"Raw Ollama output: {raw_response[:200]}...")

        # Parse JSON and validate
        try:
            parsed = self._extract_json(raw_response)
            # Validate through Pydantic schema
            mom_data = MOMData.model_validate(parsed)
            logger.info("Successfully validated MOM structure from Ollama response.")
            return mom_data.model_dump()
        except Exception as err:
            logger.error(f"Failed to validate MOM JSON: {err}. Raw output was: {raw_response[:500]}")
            # Resilient fallback: return partial summary
            return MOMData(
                summary="Summary generated with parsing warnings. Please review manually.",
                discussion_topics=["Review needed"],
                decisions=[],
                action_items=[],
                open_questions=["Automatic JSON parsing required manual review"]
            ).model_dump()

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extracts JSON object from text even if model wrapped it in codeblocks.
        """
        text = text.strip()
        # Remove markdown code fences if present
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        # Direct JSON load
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Match first { to last }
            match = re.search(r"(\{.*\})", text, re.DOTALL)
            if match:
                return json.loads(match.group(1))
            raise


llm_service = LLMService()
