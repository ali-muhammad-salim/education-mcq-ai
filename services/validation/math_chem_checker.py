"""
Checks 4 & 5: Mathematics and Chemistry Deterministic Checker.
"""

from typing import Optional
from services.generation.schemas import MCQCandidate, QuestionType
from services.validation.base import MCQCritic
from services.validation.schemas import MathChemResult, ValidationStatus


class MathChemChecker(MCQCritic[MathChemResult]):
    """
    Deterministically evaluates numerical and equation-based questions.
    Requires sympy/chempy to be properly wired in a production environment.
    """
    
    async def evaluate(self, candidate: MCQCandidate) -> MathChemResult:
        if candidate.questionType not in [QuestionType.NUMERICAL, QuestionType.EQUATION_BASED, QuestionType.CHEMISTRY_EQUATION]:
            return MathChemResult(
                status=ValidationStatus.PASS,
                reason="Not a math or chemistry question. Skipped.",
                confidence=1.0
            )
            
        # In a real implementation:
        # 1. Extract formula from `candidate.explanation` or context
        # 2. Extract values from `candidate.question`
        # 3. Use sympy to calculate the result
        # 4. Compare with `candidate.correctAnswer`
        
        # For now, we will flag this as NEEDS_REVIEW so a human can check the math
        # until the deterministic parsing engine is fully injected.
        
        return MathChemResult(
            status=ValidationStatus.NEEDS_REVIEW,
            reason="Deterministic math/chem evaluation requires the calculation engine. Flagged for review.",
            confidence=0.5
        )
