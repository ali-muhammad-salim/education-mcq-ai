"""
Generation Pipeline.

Orchestrates the generation process:
1. Calls the LLM (Mocked or real)
2. Parses JSON
3. Validates against Pydantic MCQCandidate
4. Gracefully handles INSUFFICIENT_EVIDENCE
5. Stages valid candidates
"""

import json
import logging
from typing import Any, Dict, Optional, Tuple, Union

from pydantic import ValidationError

from services.generation.schemas import MCQCandidate

logger = logging.getLogger(__name__)


class GenerationError(Exception):
    """Base exception for generation pipeline failures."""
    pass


class InsufficientEvidenceError(GenerationError):
    """Raised when the LLM determines evidence is insufficient to generate."""
    pass


class ValidationFailureError(GenerationError):
    """Raised when the LLM output fails Pydantic validation."""
    pass


class GenerationPipeline:
    """
    Validates and stages generated MCQs.
    """

    def __init__(self, llm_callable=None):
        """
        llm_callable should be a function async def(system_prompt: str, user_prompt: str) -> str
        If None, the pipeline expects text to be passed directly to process_llm_output.
        """
        self.llm_callable = llm_callable

    async def generate_and_validate(
        self, system_prompt: str, user_prompt: str
    ) -> MCQCandidate:
        """
        End-to-end generation and validation.
        """
        if not self.llm_callable:
            raise RuntimeError("Pipeline not configured with an LLM callable.")
            
        llm_text = await self.llm_callable(system_prompt, user_prompt)
        return self.process_llm_output(llm_text)

    def process_llm_output(self, text: str) -> MCQCandidate:
        """
        Parses JSON and validates against MCQCandidate schema.
        Handles the INSUFFICIENT_EVIDENCE fallback.
        """
        text = text.strip()
        
        # Check for insufficient evidence fallback
        if "INSUFFICIENT_EVIDENCE" in text:
            raise InsufficientEvidenceError("The model determined there is insufficient evidence to generate this question.")
            
        # Strip markdown if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        try:
            data = json.loads(text.strip())
        except json.JSONDecodeError as e:
            raise ValidationFailureError(f"Failed to parse LLM output as JSON: {e}\nOutput was: {text[:200]}...")
            
        try:
            candidate = MCQCandidate.model_validate(data)
            return candidate
        except ValidationError as e:
            logger.error("Validation failed for LLM output. Errors: %s", e.errors())
            raise ValidationFailureError(f"Output failed schema validation: {e}")

    def stage_to_database(self, candidate: MCQCandidate) -> str:
        """
        Retired persistence shim. The durable website worker owns draft storage.
        """
        raise NotImplementedError("Use the durable AI generation worker and educator review queue. This offline parser does not persist drafts.")
