from fastapi import APIRouter, Query
from services.api.database import prisma

router = APIRouter(prefix="/api/mcqs", tags=["MCQs"])

@router.get("/")
def get_mcqs(limit: int = Query(50, ge=1, le=100)):
    records = prisma.question.find_many(take=limit, include={"options": True, "explanations": True}, order={"createdAt": "desc"})
    return [record.model_dump(mode="json") for record in records]
