"""
Tests for Generation Pipeline and Pydantic validation rules.
"""

import pytest
import json

from services.generation.pipeline import (
    GenerationPipeline,
    ValidationFailureError,
    InsufficientEvidenceError,
)
from services.generation.schemas import MCQCandidate


def test_pipeline_handles_insufficient_evidence():
    pipeline = GenerationPipeline()
    
    with pytest.raises(InsufficientEvidenceError):
        pipeline.process_llm_output("INSUFFICIENT_EVIDENCE")

    with pytest.raises(InsufficientEvidenceError):
        pipeline.process_llm_output("I have reviewed the context and concluded: INSUFFICIENT_EVIDENCE")


def test_pipeline_rejects_invalid_json():
    pipeline = GenerationPipeline()
    
    with pytest.raises(ValidationFailureError) as exc:
        pipeline.process_llm_output("{ \"question\": \"incomplete\" ")
    assert "Failed to parse" in str(exc.value)


def test_pipeline_rejects_missing_schema_fields():
    pipeline = GenerationPipeline()
    
    bad_json = json.dumps({
        "question": "What is 2+2?",
        # Missing options, correctAnswer, explanation, board, etc.
    })
    
    with pytest.raises(ValidationFailureError) as exc:
        pipeline.process_llm_output(bad_json)
    assert "options" in str(exc.value)


def test_pipeline_rejects_no_direct_evidence_with_items():
    pipeline = GenerationPipeline()
    
    # Complete structure but contradictory evidence logic
    bad_evidence_json = json.dumps({
        "question": "Q",
        "options": [{"text": "A", "isCorrect": True}, {"text": "B", "isCorrect": False}],
        "correctAnswer": "A",
        "explanation": "E",
        "board": "FBISE",
        "class": "10",
        "subject": "Physics",
        "chapter": "Motion",
        "topic": "Acceleration",
        "concept": "Acceleration",
        "learningObjective": "LO",
        "difficulty": "EASY",
        "cognitiveLevel": "KNOWLEDGE",
        "questionType": "MCQ_SINGLE",
        "contentMode": "TEXT",
        "generationRationale": "Rationale",
        "evidence": {
            "historicalEvidenceStatus": "NO_DIRECT_EVIDENCE",
            "curriculumEvidence": [],
            "textbookEvidence": [],
            # ERROR: Status is NO_DIRECT_EVIDENCE but we provide pastPaperEvidence items
            "pastPaperEvidence": [
                {
                    "board": "FBISE", "year": 2022, "questionNumber": "1",
                    "relationshipType": "SAME_CONCEPT", "reason": "Test"
                }
            ]
        }
    })
    
    with pytest.raises(ValidationFailureError) as exc:
        pipeline.process_llm_output(bad_evidence_json)
    assert "NO_DIRECT_EVIDENCE must have an empty pastPaperEvidence list" in str(exc.value)


def test_pipeline_validates_correct_json():
    pipeline = GenerationPipeline()
    
    good_json = json.dumps({
        "question": "What is acceleration?",
        "options": [{"text": "Rate of change of velocity", "isCorrect": True}, {"text": "Speed", "isCorrect": False}],
        "correctAnswer": "Rate of change of velocity",
        "explanation": "Acceleration is Δv/Δt.",
        "board": "FBISE",
        "class": "10",
        "subject": "Physics",
        "chapter": "Motion",
        "topic": "Acceleration",
        "concept": "Acceleration",
        "learningObjective": "Define acceleration",
        "difficulty": "EASY",
        "cognitiveLevel": "KNOWLEDGE",
        "questionType": "MCQ_SINGLE",
        "contentMode": "TEXT",
        "generationRationale": "Coverage",
        "evidence": {
            "historicalEvidenceStatus": "NO_DIRECT_EVIDENCE",
            "curriculumEvidence": [],
            "textbookEvidence": [],
            "pastPaperEvidence": []
        }
    })
    
    candidate = pipeline.process_llm_output(good_json)
    assert isinstance(candidate, MCQCandidate)
    assert candidate.question == "What is acceleration?"
    assert candidate.options[0].isCorrect is True
    
    with pytest.raises(NotImplementedError, match="does not persist"):
        pipeline.stage_to_database(candidate)
