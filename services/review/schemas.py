"""
Schemas for the MCQ Review System.
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from pydantic import BaseModel, Field

from services.generation.schemas import MCQCandidate
from services.book_analysis.schemas import CandidateWithProvenance


class ReviewAction(str, Enum):
    APPROVE = "APPROVE"
    EDIT = "EDIT"
    REJECT = "REJECT"


class RejectionReason(str, Enum):
    INCORRECT_ANSWER = "INCORRECT_ANSWER"
    AMBIGUOUS = "AMBIGUOUS"
    WRONG_CONCEPT = "WRONG_CONCEPT"
    WRONG_BOARD_STYLE = "WRONG_BOARD_STYLE"
    UNSUPPORTED_BY_SOURCE = "UNSUPPORTED_BY_SOURCE"
    BAD_DISTRACTOR = "BAD_DISTRACTOR"
    DUPLICATE = "DUPLICATE"
    WRONG_DIFFICULTY = "WRONG_DIFFICULTY"
    OCR_ERROR = "OCR_ERROR"
    MATHEMATICAL_ERROR = "MATHEMATICAL_ERROR"
    CHEMISTRY_ERROR = "CHEMISTRY_ERROR"
    OTHER = "OTHER"


class TrainingDataStatus(str, Enum):
    ELIGIBLE_FOR_TRAINING = "ELIGIBLE_FOR_TRAINING"
    NEGATIVE_EXAMPLE = "NEGATIVE_EXAMPLE"
    HIGH_VALUE_TRAINING = "HIGH_VALUE_TRAINING"
    PENDING = "PENDING"


class SourceReference(BaseModel):
    """
    References allowing the reviewer to compare against the original source.
    """
    textbook_pages: List[int] = Field(default_factory=list)
    past_paper_references: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list, description="List of bounding boxes or region identifiers")
    images: List[str] = Field(default_factory=list, description="List of relevant image/diagram paths")


class MCQReviewRecord(BaseModel):
    """
    The main record of a reviewed MCQ.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_candidate: CandidateWithProvenance = Field(
        description="The full AI-generated candidate with evidence and validation results."
    )
    action: ReviewAction
    reviewer_id: str
    reviewed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    # Optional fields depending on the action
    rejection_reason: Optional[RejectionReason] = None
    edit_reason: Optional[str] = None
    final_human_question: Optional[MCQCandidate] = Field(
        default=None, 
        description="The final edited version of the question. Only populated if action=EDIT."
    )
    
    training_data_status: TrainingDataStatus = TrainingDataStatus.PENDING
    
    # Pre-calculated references for the frontend
    source_reference: SourceReference = Field(default_factory=SourceReference)

