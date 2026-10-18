"""
Stage 3: Distractor Audit
"""

from typing import Callable, Any, Awaitable
import json

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import DistractorAuditResult, ValidationStatus


class DistractorAudit(MCQCritic[DistractorAuditResult]):
    """
    Checks if the wrong options (distractors) are actually wrong, and not inadvertently true.
    Also ensures distractors are plausible.
    """
    def __init__(self, llm_callable: Callable[[str], Awaitable[str]] = None, reference_text: str = "", examiner_comments: str = ""):
        self.llm_callable = llm_callable
        self.reference_text = reference_text
        self.examiner_comments = examiner_comments
        
    async def evaluate(self, candidate: MCQCandidate) -> DistractorAuditResult:
        if not self.llm_callable:
            return DistractorAuditResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="No LLM provided for Distractor Audit.",
                confidence=0.0
            )

        distractors = [opt.text for opt in candidate.options if not opt.isCorrect]
        
        prompt = f"""
        Analyze the following multiple choice question and its distractors (wrong options).
        Are any of these distractors inadvertently CORRECT or partially correct? 
        Do the distractors represent plausible misconceptions based on the Examiner Comments (if provided)?
        
        Question: {candidate.question}
        Correct Answer: {candidate.correctAnswer}
        Distractors: {distractors}
        Reference Context (optional): {self.reference_text}
        Examiner Comments (common student mistakes): {self.examiner_comments}
        
        Return JSON format ONLY:
        {{
            "flawed_distractors": ["list any distractors that are actually correct"],
            "plausible_count": integer,
            "misconception_alignment_score": float (0.0 to 1.0, 1.0 if distractors perfectly mimic the common mistakes in examiner comments)
        }}
        """

        try:
            ai_response = await self.llm_callable(prompt)
            data = json.loads(ai_response)
            
            flawed = data.get("flawed_distractors", [])
            plausible_count = data.get("plausible_count", 0)
            misconception_score = data.get("misconception_alignment_score", 0.0)
            
            if flawed:
                return DistractorAuditResult(
                    status=ValidationStatus.FAIL,
                    reason=f"Found {len(flawed)} flawed distractors that might be correct.",
                    confidence=0.95,
                    flawed_distractors=flawed,
                    plausible_distractors=plausible_count,
                    misconception_alignment=misconception_score
                )
            else:
                return DistractorAuditResult(
                    status=ValidationStatus.PASS,
                    reason="All distractors are properly incorrect and plausible.",
                    confidence=0.9,
                    flawed_distractors=[],
                    plausible_distractors=plausible_count,
                    misconception_alignment=misconception_score
                )
        except Exception as e:
            return DistractorAuditResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason=f"Error running distractor audit: {str(e)}",
                confidence=0.0
            )
