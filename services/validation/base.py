"""
Base interface for all MCQ Critics/Validators.
"""

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from services.generation.schemas import MCQCandidate
from services.validation.schemas import CheckResult

T = TypeVar('T', bound=CheckResult)


class MCQCritic(ABC, Generic[T]):
    """
    Base class for independent validators.
    """
    
    @abstractmethod
    async def evaluate(self, candidate: MCQCandidate) -> T:
        """
        Evaluate the candidate and return a strongly typed CheckResult.
        """
        pass
