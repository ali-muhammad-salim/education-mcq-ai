from fastapi import APIRouter
from typing import List

router = APIRouter(prefix="/api/mcqs", tags=["MCQs"])

@router.get("/")
def get_mcqs():
    """
    Mock endpoint to get generated MCQs with their provenance.
    """
    return [
        {
            "id": "mcq-1",
            "questionText": "What is the capital of France?",
            "options": [
                {"id": "o1", "text": "Paris", "isCorrect": True},
                {"id": "o2", "text": "London", "isCorrect": False},
                {"id": "o3", "text": "Berlin", "isCorrect": False},
                {"id": "o4", "text": "Madrid", "isCorrect": False}
            ],
            "explanation": "Paris is the capital and most populous city of France.",
            "status": "DRAFT",
            "provenance": {
                "board": "Federal Board",
                "class": "Class 9",
                "subject": "Geography",
                "chapter": "Chapter 2",
                "topic": "European Capitals",
                "concept": "Capital Cities",
                "sourceBook": "Geography Grade 9",
                "sourcePage": 45,
                "relatedPastPaperYear": 2023,
                "relatedQuestionNumber": "Q2(a)"
            }
        },
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
                "concept": "Force",
                "sourceBook": "Physics Grade 10",
                "sourcePage": 62,
                "relatedPastPaperYear": 2022,
                "relatedQuestionNumber": "Q5"
            }
        }
    ]
