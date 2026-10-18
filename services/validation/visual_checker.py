"""
Check 6: Diagram/Image Checker.
"""

from typing import Callable, Any

from services.generation.schemas import MCQCandidate, QuestionType
from services.validation.base import MCQCritic
from services.validation.schemas import VisualResult, ValidationStatus


class VisualChecker(MCQCritic[VisualResult]):
    """
    Verifies image/diagram questions.
    """
    def __init__(self, vlm_callable: Callable[[str, str], Any] = None):
        self.vlm_callable = vlm_callable
        
    async def evaluate(self, candidate: MCQCandidate) -> VisualResult:
        if candidate.questionType not in [QuestionType.IMAGE_BASED, QuestionType.DIAGRAM_BASED]:
            return VisualResult(
                status=ValidationStatus.PASS,
                reason="Not a visual question. Skipped.",
                confidence=1.0
            )
            
        # Would require VLM (Vision Language Model) or structured SVG parsing to verify
        # For now, flag as NEEDS_REVIEW
        return VisualResult(
            status=ValidationStatus.NEEDS_REVIEW,
            reason="Visual questions require VLM verification or human review.",
            confidence=0.7
        )
