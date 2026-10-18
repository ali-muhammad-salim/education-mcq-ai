"""
Check 1: Answer Verifier.
"""

from typing import Callable, Any

from services.generation.schemas import MCQCandidate, QuestionType
from services.validation.base import MCQCritic
from services.validation.schemas import AnswerValidationResult, ValidationStatus


class AnswerVerifier(MCQCritic[AnswerValidationResult]):
    """
    Verifies that the answer structure is logical and matches the question type.
    """
    def __init__(self, llm_callable: Callable[[str, str], Any] = None):
        self.llm_callable = llm_callable
        
    async def evaluate(self, candidate: MCQCandidate) -> AnswerValidationResult:
        
        # Deterministic checks first
        correct_options = [opt for opt in candidate.options if opt.isCorrect]
        
        if candidate.questionType == QuestionType.MCQ_SINGLE:
            if len(correct_options) != 1:
                return AnswerValidationResult(
                    status=ValidationStatus.FAIL,
                    reason=f"MCQ_SINGLE must have exactly 1 correct answer. Found {len(correct_options)}.",
                    confidence=1.0
                )
                
            # Verify the listed correctAnswer string matches the boolean flag
            if correct_options[0].text != candidate.correctAnswer:
                return AnswerValidationResult(
                    status=ValidationStatus.FAIL,
                    reason="The marked correct option text does not match the correctAnswer field.",
                    confidence=1.0
                )
                
        elif candidate.questionType == QuestionType.MCQ_MULTIPLE:
            if len(correct_options) < 1:
                return AnswerValidationResult(
                    status=ValidationStatus.FAIL,
                    reason="MCQ_MULTIPLE must have at least 1 correct answer.",
                    confidence=1.0
                )
        
        # Check for contradictory options (e.g. "All of the above" and "None of the above" together)
        texts = [opt.text.lower() for opt in candidate.options]
        if "all of the above" in texts and "none of the above" in texts:
            return AnswerValidationResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="Contains both 'All of the above' and 'None of the above'. Often confusing.",
                confidence=0.8
            )
            
        # In a real implementation, we would call the LLM here to verify logical soundness of distractors
        if self.llm_callable:
            # mock calling LLM
            pass
            
        return AnswerValidationResult(
            status=ValidationStatus.PASS,
            reason="Answer structure is valid and logical.",
            confidence=1.0
        )
