from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/review", tags=["Review"])

class ReviewActionPayload(BaseModel):
    action: str  # "APPROVE", "EDIT", "REJECT"
    editedQuestion: Optional[dict] = None
    reason: Optional[str] = None

@router.post("/{mcq_id}")
def review_mcq(mcq_id: str, payload: ReviewActionPayload):
    """
    Mock endpoint to review an MCQ.
    Wraps the MCQReviewService.
    """
    if payload.action == "REJECT" and not payload.reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
        
    if payload.action == "EDIT" and not payload.editedQuestion:
        raise HTTPException(status_code=400, detail="Edited question data is required")
        
    # In a real system:
    # service = MCQReviewService(db)
    # service.process_review(mcq_id, payload)
    
    return {
        "status": "success",
        "mcq_id": mcq_id,
        "action_taken": payload.action,
        "message": f"Successfully processed {payload.action} for {mcq_id}"
    }
