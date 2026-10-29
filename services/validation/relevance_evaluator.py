"""
Checks 7 & 9: Relevance and Difficulty Evaluator.
"""

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import RelevanceResult, ValidationStatus


class RelevanceEvaluator(MCQCritic[RelevanceResult]):
    """
    Evaluates board relevance and difficulty.
    """
    
    async def evaluate(self, candidate: MCQCandidate) -> RelevanceResult:
        
        # Heuristic 1: If it's tagged as HARD but cognitive level is KNOWLEDGE, there's a mismatch
        if candidate.difficulty == "HARD" and candidate.cognitiveLevel == "KNOWLEDGE":
            return RelevanceResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="Difficulty marked as HARD but cognitive level is only KNOWLEDGE. Likely mismatch.",
                confidence=0.8,
                evaluated_difficulty="EASY"
            )
            
        # Ensure it maps to board specific features
        if not candidate.board or not candidate.subject:
            return RelevanceResult(
                status=ValidationStatus.FAIL,
                reason="Missing board or subject mapping.",
                confidence=1.0,
                evaluated_difficulty=candidate.difficulty.name if hasattr(candidate.difficulty, "name") else str(candidate.difficulty)
            )
            
        return RelevanceResult(
            status=ValidationStatus.PASS,
            reason="Relevance and difficulty seem appropriate.",
            confidence=0.9,
            evaluated_difficulty=candidate.difficulty.name if hasattr(candidate.difficulty, "name") else str(candidate.difficulty)
        )
