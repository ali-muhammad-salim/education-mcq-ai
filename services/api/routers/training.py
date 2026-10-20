from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from services.api.database import prisma
import json

router = APIRouter(prefix="/api/training", tags=["Training"])

@router.get("/approved-data")
def get_approved_data():
    records = prisma.aidoubtrecord.find_many(where={"status": "APPROVED"}, take=1000)
    return [record.data["question"] for record in records]

@router.get("/export")
def export_training_data():
    return PlainTextResponse("\n".join(json.dumps(item, ensure_ascii=False) for item in get_approved_data()), media_type="application/x-ndjson")

@router.post("/start")
def start_fine_tuning():
    raise HTTPException(501, "Fine-tuning execution is not configured. No job was started.")
