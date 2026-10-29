import pytest

from services.generation.schemas import MCQCandidate, QuestionType, Difficulty, CognitiveLevel, Option, Evidence, EvidenceStatus
from services.book_analysis.schemas import CandidateWithProvenance, EvidenceLabel
from services.validation.schemas import ValidationStatus
from services.review.schemas import ReviewAction, RejectionReason, TrainingDataStatus
from services.review.service import MCQReviewService

@pytest.fixture
def dummy_candidate() -> CandidateWithProvenance:
    candidate = MCQCandidate(
        question="What is the capital of France?",
        options=[
            Option(text="Paris", isCorrect=True),
            Option(text="London", isCorrect=False),
            Option(text="Berlin", isCorrect=False),
            Option(text="Madrid", isCorrect=False)
        ],
        correctAnswer="Paris",
        explanation="Paris is the capital.",
        questionType=QuestionType.MCQ_SINGLE,
        difficulty=Difficulty.EASY,
        cognitiveLevel=CognitiveLevel.KNOWLEDGE,
        chapter="Geography",
        topic="Europe",
        concept="Capitals",
        board="TestBoard",
        **{"class": "10"},
        subject="Geography",
        learningObjective="Know capitals",
        contentMode="TEXT",
        evidence=Evidence(
            historicalEvidenceStatus=EvidenceStatus.NO_DIRECT_EVIDENCE,
            curriculumEvidence=[],
            textbookEvidence=[],
            pastPaperEvidence=[]
        ),
        generationRationale="Testing"
    )
    return CandidateWithProvenance(
        candidate=candidate,
        validation_status=ValidationStatus.PASS,
        validation_notes=["Looks good"],
        rationale="supported by available evidence",
        uncertainty="none",
        evidence_strength=EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
    )


def test_approve_candidate(dummy_candidate):
    service = MCQReviewService()
    record = service.submit_review(
        candidate=dummy_candidate,
        action=ReviewAction.APPROVE,
        reviewer_id="user1"
    )
    
    assert record.action == ReviewAction.APPROVE
    assert record.training_data_status == TrainingDataStatus.ELIGIBLE_FOR_TRAINING
    assert record.original_candidate == dummy_candidate
    
    # Check it was saved
    assert service.get_record(record.id) == record


def test_reject_candidate_requires_reason(dummy_candidate):
    service = MCQReviewService()
    
    with pytest.raises(ValueError, match="A rejection reason must be provided"):
        service.submit_review(
            candidate=dummy_candidate,
            action=ReviewAction.REJECT,
            reviewer_id="user1"
        )
        
    record = service.submit_review(
        candidate=dummy_candidate,
        action=ReviewAction.REJECT,
        reviewer_id="user1",
        rejection_reason=RejectionReason.INCORRECT_ANSWER
    )
    
    assert record.action == ReviewAction.REJECT
    assert record.training_data_status == TrainingDataStatus.NEGATIVE_EXAMPLE
    assert record.rejection_reason == RejectionReason.INCORRECT_ANSWER


def test_edit_candidate_requires_final_question(dummy_candidate):
    service = MCQReviewService()
    
    with pytest.raises(ValueError, match="The final edited question must be provided"):
        service.submit_review(
            candidate=dummy_candidate,
            action=ReviewAction.EDIT,
            reviewer_id="user1"
        )
        
    # Create an edited candidate
    edited = dummy_candidate.candidate.model_copy(update={"question": "What is the true capital of France?"})
    
    record = service.submit_review(
        candidate=dummy_candidate,
        action=ReviewAction.EDIT,
        reviewer_id="user1",
        final_human_question=edited,
        edit_reason="Clarification"
    )
    
    assert record.action == ReviewAction.EDIT
    assert record.training_data_status == TrainingDataStatus.HIGH_VALUE_TRAINING
    assert record.final_human_question.question == "What is the true capital of France?"
    assert record.original_candidate.candidate.question == "What is the capital of France?"

