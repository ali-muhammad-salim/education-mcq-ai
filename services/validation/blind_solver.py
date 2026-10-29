"""
Stage 1: Blind Solver
"""

from typing import Callable, Any, Awaitable

from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import BlindSolverResult, ValidationStatus


class BlindSolver(MCQCritic[BlindSolverResult]):
    """
    Attempts to solve the MCQ without looking at the marked correct answer.
    If the AI chooses a different answer, it flags the question for review.
    """
    def __init__(self, llm_callable: Callable[[str], Awaitable[str]] = None):
        self.llm_callable = llm_callable
        
    async def evaluate(self, candidate: MCQCandidate) -> BlindSolverResult:
        if not self.llm_callable:
            # Fallback if no LLM provided (e.g. testing)
            return BlindSolverResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="No LLM provided to solve blindly.",
                confidence=0.0
            )

        # Construct prompt without the correct answer
        options_text = "\n".join([f"- {opt.text}" for opt in candidate.options])
        prompt = f"""
        Solve the following multiple choice question. 
        Return EXACTLY the text of the correct option, nothing else.
        
        Question: {candidate.question}
        Options:
        {options_text}
        """

        try:
            ai_answer = await self.llm_callable(prompt)
            ai_answer = ai_answer.strip()
            
            if ai_answer == candidate.correctAnswer:
                return BlindSolverResult(
                    status=ValidationStatus.PASS,
                    reason="Blind solver chose the same correct answer.",
                    confidence=1.0,
                    ai_chosen_answer=ai_answer,
                    matches_key=True
                )
            else:
                return BlindSolverResult(
                    status=ValidationStatus.FAIL,
                    reason=f"Blind solver chose '{ai_answer}' instead of '{candidate.correctAnswer}'.",
                    confidence=0.9,
                    ai_chosen_answer=ai_answer,
                    matches_key=False
                )
        except Exception as e:
            return BlindSolverResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason=f"Error running blind solver: {str(e)}",
                confidence=0.0
            )
