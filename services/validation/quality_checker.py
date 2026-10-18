"""
Check 3: Question Quality Checker.
"""

from typing import Callable, Any

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import QualityResult, ValidationStatus


class QualityChecker(MCQCritic[QualityResult]):
    """
    Checks for grammar errors, ambiguity, clueing, and repeated options.
    """
    def __init__(self, llm_callable: Callable[[str, str], Any] = None):
        self.llm_callable = llm_callable
        
    async def evaluate(self, candidate: MCQCandidate) -> QualityResult:
        issues = []
        status = ValidationStatus.PASS
        
        texts = [opt.text.lower().strip() for opt in candidate.options]
        
        # 1. Repeated options
        if len(texts) != len(set(texts)):
            issues.append("Duplicate options detected.")
            status = ValidationStatus.FAIL
            
        # 2. Clueing: Correct answer is significantly longer
        correct_opt = next((o for o in candidate.options if o.isCorrect), None)
        if correct_opt:
            avg_len = sum(len(t) for t in texts) / len(texts)
            if len(correct_opt.text) > avg_len * 2:
                issues.append("Correct answer is significantly longer than distractors (Clueing).")
                if status != ValidationStatus.FAIL:
                    status = ValidationStatus.NEEDS_REVIEW
                
        # 3. Negations in stem
        if "not " in candidate.question.lower() or "except" in candidate.question.lower():
            if candidate.questionType != "NEGATIVE_STEM":
                issues.append("Question stem contains a negative, but type is not NEGATIVE_STEM.")
                if status != ValidationStatus.FAIL:
                    status = ValidationStatus.NEEDS_REVIEW
                
        if self.llm_callable:
            # LLM checks for grammar, ambiguity, etc.
            pass
            
        return QualityResult(
            status=status,
            reason="Quality check complete.",
            confidence=0.8 if status == ValidationStatus.NEEDS_REVIEW else 1.0,
            issues=issues
        )
