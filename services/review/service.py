"""
Review Service for MCQs.
Handles the approval, editing, and rejection of generated MCQs, and prepares them for the training pipeline.
"""

from typing import Optional, List
import logging

from services.review.schemas import (
    MCQReviewRecord,
    ReviewAction,
    RejectionReason,
    TrainingDataStatus,
    SourceReference
)
from services.book_analysis.schemas import CandidateWithProvenance
from services.generation.schemas import MCQCandidate

logger = logging.getLogger(__name__)


class MCQReviewService:
    """
    Service for reviewing generated MCQs.
    
    Production implementation would persist these records to a database table
    (e.g., `mcq_review_records`). This serves as the boundary between generated
    content and verified training/production data.
    """

    def __init__(self):
        self._records: dict[str, MCQReviewRecord] = {}

    def _extract_source_references(self, candidate: CandidateWithProvenance) -> SourceReference:
        """
        Extracts source references from a candidate to present in the review UI.
        """
        ref = SourceReference()
        
        # Add past paper references if any
        for pp in candidate.related_past_papers:
            ref.past_paper_references.append(pp.reference())
            if pp.page and pp.page not in ref.textbook_pages: # Assuming pp.page might be relevant
                pass # Usually we separate textbook page from PP page, but keeping simple here
        
        # In a full implementation, we'd extract textbook pages, images, and regions
        # from the candidate's evidence and origin metadata.
        
        return ref

    def submit_review(
        self,
        candidate: CandidateWithProvenance,
        action: ReviewAction,
        reviewer_id: str,
        rejection_reason: Optional[RejectionReason] = None,
        edit_reason: Optional[str] = None,
        final_human_question: Optional[MCQCandidate] = None
    ) -> MCQReviewRecord:
        """
        Submit a review for an MCQ.
        """
        
        if action == ReviewAction.REJECT and not rejection_reason:
            raise ValueError("A rejection reason must be provided when rejecting an MCQ.")
            
        if action == ReviewAction.EDIT and not final_human_question:
            raise ValueError("The final edited question must be provided when editing an MCQ.")

        # Determine training data status
        training_status = TrainingDataStatus.PENDING
        if action == ReviewAction.APPROVE:
            training_status = TrainingDataStatus.ELIGIBLE_FOR_TRAINING
        elif action == ReviewAction.REJECT:
            training_status = TrainingDataStatus.NEGATIVE_EXAMPLE
        elif action == ReviewAction.EDIT:
            training_status = TrainingDataStatus.HIGH_VALUE_TRAINING

        # Build record
        record = MCQReviewRecord(
            original_candidate=candidate,
            action=action,
            reviewer_id=reviewer_id,
            rejection_reason=rejection_reason,
            edit_reason=edit_reason,
            final_human_question=final_human_question,
            training_data_status=training_status,
            source_reference=self._extract_source_references(candidate)
        )

        # Store record (in memory for now)
        self._records[record.id] = record
        
        logger.info(f"MCQ Reviewed by {reviewer_id}. Action: {action.value}. Training Status: {training_status.value}")
        
        return record

    def get_record(self, record_id: str) -> Optional[MCQReviewRecord]:
        return self._records.get(record_id)
        
    def get_all_records(self) -> List[MCQReviewRecord]:
        return list(self._records.values())

