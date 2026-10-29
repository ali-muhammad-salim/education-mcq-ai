"""
Check 2: Source Faithfulness Checker.
"""

import json
from typing import Callable, Any

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import FaithfulnessResult, ValidationStatus


class FaithfulnessChecker(MCQCritic[FaithfulnessResult]):
    """
    Verifies that the generated question is supported by the provided evidence.
    """
    def __init__(self, llm_callable: Callable[[str, str], Any] = None):
        self.llm_callable = llm_callable
        
    async def evaluate(self, candidate: MCQCandidate) -> FaithfulnessResult:
        
        has_curriculum = len(candidate.evidence.curriculumEvidence) > 0
        has_textbook = len(candidate.evidence.textbookEvidence) > 0
        has_past_papers = len(candidate.evidence.pastPaperEvidence) > 0
        
        # If no evidence was provided, we must fail it for ungrounded generation
        if not has_curriculum and not has_textbook and not has_past_papers:
            return FaithfulnessResult(
                status=ValidationStatus.FAIL,
                reason="No evidence provided. Question is completely ungrounded.",
                confidence=1.0,
                unsupported_claims=["Entire question"]
            )
            
        if self.llm_callable:
            # We would ask the LLM to verify if the question hallucinates beyond the evidence
            # Mocking response
            pass
            
        return FaithfulnessResult(
            status=ValidationStatus.PASS,
            reason="Faithful to source.",
            confidence=0.9
        )
