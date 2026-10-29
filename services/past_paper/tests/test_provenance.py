"""
Tests for complete historical traceability and provenance chain.

Verifies:
- HistoricalTracer finds real past-paper records by concept
- Relationship types are granular (not collapsed to "similar")
- No-evidence message is shown when no records exist
- HistoricalSummary is derived from actual records
- ProvenanceService builds a complete ProvenanceReport
- The provenance report correctly links all source types
"""

from __future__ import annotations

import pytest

from services.past_paper.store import PastPaperStore
from services.past_paper.schemas import (
    PaperMetadata,
    MetadataField,
    ExtractedQuestion,
    QuestionClassification,
    ClassifiedField,
)
from services.past_paper.historical_tracer import HistoricalTracer, EvidenceStrength
from services.past_paper.provenance_service import ProvenanceService
from services.generation.schemas import (
    MCQCandidate, QuestionType, Option, Evidence, CurriculumEvidence
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_candidate(**overrides):
    """Build a minimal valid MCQCandidate."""
    defaults = {
        "question": "What is acceleration?",
        "options": [
            Option(text="Rate of change of velocity", isCorrect=True),
            Option(text="Speed", isCorrect=False),
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
        "generationRationale": "Historical evidence check",
        "evidence": Evidence(
            historicalEvidenceStatus="NO_DIRECT_EVIDENCE",
            curriculumEvidence=[
                CurriculumEvidence(
                    curriculumId="cur-1", description="Acceleration in Class 10"
                )
            ],
            textbookEvidence=[],
            pastPaperEvidence=[],
        ),
    }
    defaults.update(overrides)
    return MCQCandidate(**defaults)


def _build_store_with_acceleration_papers() -> PastPaperStore:
    """
    Seed a PastPaperStore with 3 past-paper questions all classified as
    concept=Acceleration, board=FBISE, class=10, subject=Physics.
    """
    store = PastPaperStore()

    for year, qno, sub in [(2025, "3", "b"), (2024, "7", ""), (2022, "4", "a")]:
        meta = PaperMetadata(
            board=MetadataField(value="FBISE"),
            class_level=MetadataField(value="10"),
            subject=MetadataField(value="Physics"),
            year=MetadataField(value=str(year)),
        )
        pid = store.add_paper(meta, source_file=f"fbise_physics_10_{year}.pdf")

        eq = ExtractedQuestion(
            paper_id=pid,
            year=year,
            board="FBISE",
            class_level="10",
            subject="Physics",
            question_number=qno,
            sub_question_number=sub,
            text=f"Calculate the acceleration of a car. ({year})",
            page=year - 2020,
            marks=2.0,
            question_type="NUMERICAL",
        )
        qid = store.add_question(eq)

        cls = QuestionClassification(
            question_id=qid,
            chapter=ClassifiedField(value="Motion", confidence=0.99),
            topic=ClassifiedField(value="Acceleration", confidence=0.99),
            concept=ClassifiedField(value="Acceleration", confidence=0.99),
        )
        store.add_classification(qid, cls)

    return store


# ---------------------------------------------------------------------------
# Tests: HistoricalTracer
# ---------------------------------------------------------------------------

class TestHistoricalTracer:

    def test_finds_related_questions_by_concept(self):
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        candidate = _make_candidate()

        result = tracer.trace(candidate)

        assert len(result.pastPaperEvidence) >= 3
        years = {e.year for e in result.pastPaperEvidence}
        assert 2025 in years
        assert 2024 in years
        assert 2022 in years

    def test_evidence_sorted_by_year_descending(self):
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        result = tracer.trace(_make_candidate())

        years = [e.year for e in result.pastPaperEvidence]
        assert years == sorted(years, reverse=True)

    def test_relation_types_are_granular_not_generic(self):
        """Numerical questions must use SAME_NUMERICAL_METHOD, not RELATED_CONCEPT."""
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        # Numerical MCQ
        candidate = _make_candidate(**{"questionType": QuestionType.NUMERICAL})
        result = tracer.trace(candidate)

        # All matched records are NUMERICAL type in the store
        numerical_rels = [e.relationType for e in result.pastPaperEvidence
                         if e.year in (2025, 2024, 2022)]
        for rel in numerical_rels:
            assert rel == "SAME_NUMERICAL_METHOD", f"Expected SAME_NUMERICAL_METHOD, got {rel}"

    def test_no_evidence_message_when_no_records(self):
        empty_store = PastPaperStore()
        tracer = HistoricalTracer(empty_store)
        result = tracer.trace(_make_candidate())

        assert result.pastPaperEvidence == []
        assert result.noEvidenceMessage is not None
        assert "No verified related past-paper question found" in result.noEvidenceMessage

    def test_summary_is_derived_from_real_records(self):
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        result = tracer.trace(_make_candidate())

        summary = result.summary
        assert summary.numberOfRelatedQuestions >= 3
        assert summary.mostRecentRelatedYear == 2025
        assert summary.historicalEvidenceStrength == EvidenceStrength.HIGH
        # Years list contains actual years
        assert 2025 in summary.yearsRelated
        assert 2022 in summary.yearsRelated
        # Relationship distribution is populated
        assert len(summary.relationshipDistribution) >= 1

    def test_evidence_items_carry_exact_source_fields(self):
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        result = tracer.trace(_make_candidate())

        # Every item must have a question number, year, and board
        for item in result.pastPaperEvidence:
            assert item.questionNumber, "Missing questionNumber"
            assert item.year > 0
            assert item.board == "FBISE"
            # OCR text should come from the question text snippet
            assert item.ocrText, "Missing ocrText"

    def test_display_format(self):
        store = _build_store_with_acceleration_papers()
        tracer = HistoricalTracer(store)
        result = tracer.trace(_make_candidate())

        displays = [e.display() for e in result.pastPaperEvidence]
        # Should contain entries like "FBISE 2025 — Q3(b)"
        assert any("2025" in d for d in displays)
        assert any("Q3(b)" in d for d in displays)


# ---------------------------------------------------------------------------
# Tests: ProvenanceService
# ---------------------------------------------------------------------------

class TestProvenanceService:

    def test_builds_complete_report(self):
        store = _build_store_with_acceleration_papers()
        svc = ProvenanceService(store)
        candidate = _make_candidate()

        report = svc.build_report(
            question_id="test-q-001",
            candidate=candidate,
            generation_model="qwen3",
            prompt_version="v1.0",
        )

        assert report.questionId == "test-q-001"
        assert report.generationModel == "qwen3"
        assert report.promptVersion == "v1.0"
        assert len(report.pastPaperSources) >= 3
        # Curriculum source must be populated from evidence
        assert len(report.curriculumSources) == 1
        assert report.curriculumSources[0].curriculumId == "cur-1"

    def test_no_evidence_message_when_empty_store(self):
        svc = ProvenanceService(PastPaperStore())
        report = svc.build_report(
            question_id="test-q-002",
            candidate=_make_candidate(),
        )
        assert report.pastPaperSources == []
        assert report.noEvidenceMessage is not None

    def test_historical_summary_in_report(self):
        store = _build_store_with_acceleration_papers()
        svc = ProvenanceService(store)
        report = svc.build_report(
            question_id="test-q-003",
            candidate=_make_candidate(),
        )
        assert report.historicalSummary.numberOfRelatedQuestions >= 3
        assert report.historicalSummary.mostRecentRelatedYear == 2025
        assert report.historicalSummary.historicalEvidenceStrength == "HIGH"
