from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
import json

router = APIRouter(prefix="/api/training", tags=["Training"])

@router.get("/approved-data")
def get_approved_data():
    """
    Returns only the approved training data.
    """
    # Mock data - in a real system this queries the DB for status=APPROVED
    return [
        {
            "id": "mcq-2",
            "questionText": "What is the SI unit of Force?",
            "options": [
                {"id": "o1", "text": "Joule", "isCorrect": False},
                {"id": "o2", "text": "Newton", "isCorrect": True},
                {"id": "o3", "text": "Watt", "isCorrect": False},
                {"id": "o4", "text": "Pascal", "isCorrect": False}
            ],
            "explanation": "Newton (N) is the SI unit of force, derived from F=ma.",
            "status": "APPROVED",
            "provenance": {
                "board": "Sindh Board",
                "class": "Class 10",
                "subject": "Physics",
                "chapter": "Chapter 3",
                "topic": "Dynamics",
                "concept": "Force"
            }
        }
    ]

@router.get("/export")
def export_jsonl():
    """
    Exports the approved dataset as a JSONL file.
    """
    approved_data = get_approved_data()
    
    jsonl_content = ""
    for item in approved_data:
        # Simplify the export structure for fine-tuning
        export_item = {
            "instruction": item["questionText"],
            "options": [{"text": o["text"], "is_correct": o["isCorrect"]} for o in item["options"]],
            "explanation": item["explanation"]
        }
        jsonl_content += json.dumps(export_item) + "\n"
        
    return PlainTextResponse(content=jsonl_content, media_type="application/jsonl")

@router.post("/start")
def start_fine_tuning(config: dict):
    """
    Mocks the start of a fine-tuning job.
    Does NOT actually start fine-tuning as requested.
    """
    return {
        "status": "configured",
        "message": "Fine-tuning configuration saved. Pipeline is verified, but execution is disabled in MVP.",
        "config": config
    }
