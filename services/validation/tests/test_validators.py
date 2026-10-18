"""
Unit tests for the independent Validation System.
"""

import pytest

from services.generation.schemas import (
    MCQCandidate, QuestionType, Option, Evidence, CurriculumEvidence
)
from services.validation.schemas import ValidationStatus
from services.validation.answer_verifier import AnswerVerifier
from services.validation.faithfulness_checker import FaithfulnessChecker
from services.validation.quality_checker import QualityChecker
from services.validation.orchestrator import MCQValidator
from services.validation.math_chem_checker import MathChemChecker
from services.validation.visual_checker import VisualChecker
from services.validation.relevance_evaluator import RelevanceEvaluator
from services.validation.duplicate_detector import DuplicateDetector


@pytest.fixture
def mock_candidate():
    return MCQCandidate(**{
        "question": "What is acceleration?",
        "options": [
            Option(text="Rate of change of velocity", isCorrect=True),
            Option(text="Speed", isCorrect=False)
        ],
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
        "questionType": QuestionType.MCQ_SINGLE,
        "contentMode": "TEXT",
        "generationRationale": "Coverage",
        "evidence": Evidence(
            historicalEvidenceStatus="NO_DIRECT_EVIDENCE",
            curriculumEvidence=[CurriculumEvidence(
                curriculumId="1", description="Acceleration"
            )],
            textbookEvidence=[],
            pastPaperEvidence=[]
        )
    })


@pytest.mark.asyncio
async def test_answer_verifier_validates_single_correct(mock_candidate):
    verifier = AnswerVerifier()
    res = await verifier.evaluate(mock_candidate)
    assert res.status == ValidationStatus.PASS


@pytest.mark.asyncio
async def test_answer_verifier_fails_multiple_correct_on_single_mcq(mock_candidate):
    mock_candidate.options[1].isCorrect = True
    verifier = AnswerVerifier()
    res = await verifier.evaluate(mock_candidate)
    assert res.status == ValidationStatus.FAIL
    assert "exactly 1 correct answer" in res.reason


@pytest.mark.asyncio
async def test_faithfulness_checker_fails_no_evidence(mock_candidate):
    mock_candidate.evidence.curriculumEvidence = []
    checker = FaithfulnessChecker()
    res = await checker.evaluate(mock_candidate)
    assert res.status == ValidationStatus.FAIL
    assert "No evidence provided" in res.reason


@pytest.mark.asyncio
async def test_quality_checker_detects_duplicates(mock_candidate):
    mock_candidate.options.append(Option(text="Speed", isCorrect=False)) # duplicate
    checker = QualityChecker()
    res = await checker.evaluate(mock_candidate)
    assert res.status == ValidationStatus.FAIL
    assert "Duplicate options" in res.issues[0]


@pytest.mark.asyncio
async def test_orchestrator_quality_gate(mock_candidate):
    validator = MCQValidator(
        AnswerVerifier(), FaithfulnessChecker(), QualityChecker(),
        MathChemChecker(), VisualChecker(), RelevanceEvaluator(), DuplicateDetector(None)
    )
    
    # Should pass or needs review based on checkers.
    # Duplicate checker without pgvector returns NEEDS_REVIEW
    report = await validator.validate(mock_candidate)
    assert report.overall_status == ValidationStatus.NEEDS_REVIEW
    
    # Force a fail by messing up the answer
    mock_candidate.options[1].isCorrect = True
    report = await validator.validate(mock_candidate)
    assert report.overall_status == ValidationStatus.FAIL
