"""
Stage 2: Grounding Audit
"""

from typing import Callable, Any, Awaitable
import json

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import GroundingAuditResult, ValidationStatus


class GroundingAudit(MCQCritic[GroundingAuditResult]):
    """
    Checks if the AI can find quotes/evidence from the reference material that support the answer.
    """
    def __init__(self, llm_callable: Callable[[str], Awaitable[str]] = None, reference_text: str = ""):
        self.llm_callable = llm_callable
        self.reference_text = reference_text
        
    async def evaluate(self, candidate: MCQCandidate) -> GroundingAuditResult:
        if not self.llm_callable or not self.reference_text:
            return GroundingAuditResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="No LLM or reference text provided for Grounding Audit.",
                confidence=0.0
            )

        prompt = f"""
        Does the following reference text completely support the provided Question and Correct Answer?
        If yes, extract the exact quotes. If no, list the unsupported claims.
        
        Reference Text: {self.reference_text}
        
        Question: {candidate.question}
        Correct Answer: {candidate.correctAnswer}
        
        Return JSON format ONLY:
        {{
            "is_supported": boolean,
            "quotes_found": ["quote 1", "quote 2"],
            "unsupported_claims": ["claim 1"]
        }}
        """

        try:
            ai_response = await self.llm_callable(prompt)
            data = json.loads(ai_response)
            
            is_supported = data.get("is_supported", False)
            quotes = data.get("quotes_found", [])
            unsupported = data.get("unsupported_claims", [])
            
            if is_supported and not unsupported:
                return GroundingAuditResult(
                    status=ValidationStatus.PASS,
                    reason="Question is fully grounded in the reference material.",
                    confidence=1.0,
                    quotes_found=quotes,
                    unsupported_claims=[]
                )
            else:
                return GroundingAuditResult(
                    status=ValidationStatus.FAIL,
                    reason="Question contains unsupported claims.",
                    confidence=0.9,
                    quotes_found=quotes,
                    unsupported_claims=unsupported
                )
        except Exception as e:
            return GroundingAuditResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason=f"Error running grounding audit: {str(e)}",
                confidence=0.0
            )
