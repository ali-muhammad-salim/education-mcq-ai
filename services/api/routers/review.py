from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from prisma import Json
from services.api.database import prisma

router = APIRouter(prefix="/api/review", tags=["Review"])

class ReviewActionPayload(BaseModel):
    action: Literal["APPROVE", "REJECT"]
    reason: str = ""

@router.post("/{record_id}")
def review_question(record_id: str, payload: ReviewActionPayload):
    record = prisma.aidoubtrecord.find_unique(where={"id": record_id})
    if not record:
        raise HTTPException(404, "Review item not found")
    status = "APPROVED" if payload.action == "APPROVE" else "DISMISSED"
    with prisma.tx() as tx:
        updated = tx.aidoubtrecord.update(where={"id": record_id}, data={"status": status})
        tx.auditlog.create(data={"action": "INTERNAL_REVIEW_" + status, "resource": "AIDoubtRecord", "resourceId": record_id, "details": Json({"reason": payload.reason})})
    return updated.model_dump(mode="json")
