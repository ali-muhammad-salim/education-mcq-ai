"""
Stage 5: SLO Alignment Audit
"""

from typing import Callable, Any, Awaitable
import json

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import SLOAlignmentResult, ValidationStatus


class SLOAlignmentAudit(MCQCritic[SLOAlignmentResult]):
    """
    Checks if the question accurately tests the designated Student Learning Objective (SLO).
    """
    def __init__(self, llm_callable: Callable[[str], Awaitable[str]] = None, slo_text: str = ""):
        self.llm_callable = llm_callable
        self.slo_text = slo_text
        
    async def evaluate(self, candidate: MCQCandidate) -> SLOAlignmentResult:
        if not self.llm_callable or not self.slo_text:
            return SLOAlignmentResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="No LLM or SLO text provided for alignment.",
                confidence=0.0
            )

        prompt = f"""
        Analyze the following multiple choice question. 
        Does it accurately and directly assess the provided Student Learning Objective (SLO)?
        
        SLO: {self.slo_text}
        
        Question: {candidate.question}
        Correct Answer: {candidate.correctAnswer}
        
        Return JSON format ONLY:
        {{
            "is_aligned": boolean,
            "alignment_score": float (0.0 to 1.0)
        }}
        """

        try:
            ai_response = await self.llm_callable(prompt)
            data = json.loads(ai_response)
            
            is_aligned = data.get("is_aligned", False)
            score = float(data.get("alignment_score", 0.0))
            
            if is_aligned and score >= 0.7:
                return SLOAlignmentResult(
                    status=ValidationStatus.PASS,
                    reason=f"Question is well-aligned with the SLO (Score: {score}).",
                    confidence=0.9,
                    evaluated_slo=self.slo_text,
                    alignment_score=score
                )
            else:
                return SLOAlignmentResult(
                    status=ValidationStatus.FAIL,
                    reason=f"Question fails to align with the SLO (Score: {score}).",
                    confidence=0.9,
                    evaluated_slo=self.slo_text,
                    alignment_score=score
                )
        except Exception as e:
            return SLOAlignmentResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason=f"Error running SLO alignment audit: {str(e)}",
                confidence=0.0
            )
