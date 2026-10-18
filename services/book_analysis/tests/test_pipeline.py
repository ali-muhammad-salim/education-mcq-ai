"""
Tests for the Book Historical Analysis Engine (all 7 stages + pipeline).

Each test targets a specific stage responsibility:
1. Stage 1: concept extraction from a seeded IngestionResult
2. Stage 2: curriculum mapping (exact + NOT_FOUND)
3. Stage 3: historical search finds real past-paper records by concept
4. Stage 4: evidence labels are correct (HIGH / NEW_CONCEPT)
5. Stage 5: edition diff (NEW / REMOVED / UNCHANGED / MODIFIED)
6. Stage 6: priority plan is sorted and all scores in 0–1
7. Stage 7: candidates carry full provenance + no forbidden language
8. Full pipeline: produces a valid BookAnalysisReport with no LLM (PENDING_GENERATION)
9. Language enforcement: CandidateWithProvenance rejects forbidden predictive language
10. Edition diff: no previous edition → graceful UNCHANGED with note
"""

import asyncio
import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock, patch

from services.ingestion.schemas import (
    IngestionResult,
    StructuredPage,
    PageRegion,
    RegionType,
    BoundingBox,
    DocumentType,
    FormulaRegion,
)
from services.past_paper.schemas import (
    PaperMetadata,
    MetadataField,
    ExtractedQuestion,
    QuestionClassification,
    ClassifiedField,
    ConceptOccurrence,
    EvidenceLabel,
)
from services.past_paper.store import PastPaperStore
from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.concept_graph import ConceptGraph
from services.knowledge.textbook_mapper import TextbookMapper
from services.generation.schemas import (
    MCQCandidate,
    Option,
    Evidence,
    EvidenceStatus,
    CurriculumEvidence,
    Difficulty,
    CognitiveLevel,
    QuestionType,
)
from services.validation.schemas import ValidationStatus

from services.book_analysis.schemas import (
    ExtractedConcept,
    ConceptType,
    ExtractedChapterContent,
    ConceptHistoricalEvidence,
    CurriculumMappingResult,
    MCQPriorityEntry,
    CandidateWithProvenance,
    ChangeType,
    ReviewStatus,
)
from services.book_analysis.stage1_extractor import BookUnderstandingExtractor
from services.book_analysis.stage2_mapper import CurriculumMapper
from services.book_analysis.stage3_searcher import HistoricalSearcher
from services.book_analysis.stage4_comparator import EvidenceComparator
from services.book_analysis.stage5_diff import EditionDiffAnalyzer
from services.book_analysis.stage6_planner import MCQPriorityPlanner
from services.book_analysis.stage7_generator import MCQCandidateGenerator
from services.book_analysis.pipeline import BookAnalysisPipeline


# ===========================================================================
# Fixtures
# ===========================================================================

def make_bbox():
    return BoundingBox(x0=0, y0=0, x1=100, y1=20)


def make_region(text: str, rtype=RegionType.PARAGRAPH, page=1) -> PageRegion:
    return PageRegion(
        region_id=f"r_{uuid.uuid4().hex[:6]}",
        type=rtype,
        bbox=make_bbox(),
        text=text,
        confidence=0.95,
    )


def make_heading(text: str) -> PageRegion:
    return make_region(text, rtype=RegionType.HEADING)


def make_formula_region(display_form: str, latex: str = "") -> FormulaRegion:
    return FormulaRegion(
        region_id=f"f_{uuid.uuid4().hex[:6]}",
        bbox=make_bbox(),
        text=display_form,
        confidence=0.90,
        display_form=display_form,
        latex=latex or display_form,
    )


def make_structured_page(page_number: int, regions: list) -> StructuredPage:
    return StructuredPage(page_number=page_number, regions=regions)


def make_ingestion_result(pages: list[StructuredPage]) -> IngestionResult:
    return IngestionResult(
        file_path="test_book.pdf",
        doc_type=DocumentType.BOOK,
        sha256="abc123",
        total_pages=len(pages),
        pages_processed=len(pages),
        pages=pages,
    )


def make_past_paper_store() -> PastPaperStore:
    store = PastPaperStore()
    meta = PaperMetadata()
    meta.board.value = "FBISE"
    meta.class_level.value = "10"
    meta.subject.value = "Physics"
    meta.year.value = "2023"
    pid = store.add_paper(meta, raw_text="Physics paper 2023")

    q = ExtractedQuestion(
        paper_id=pid,
        year=2023,
        board="FBISE",
        class_level="10",
        subject="Physics",
        question_number="3",
        sub_question_number="b",
        text="Define acceleration and state its SI unit.",
        question_type="SHORT",
        marks=2,
        page=4,
    )
    qid = str(uuid.uuid4())
    store.add_question(q, question_id=qid)

    cls = QuestionClassification(
        question_id=qid,
        chapter=ClassifiedField(value="Kinematics", confidence=0.95),
        topic=ClassifiedField(value="Motion", confidence=0.90),
        concept=ClassifiedField(value="Acceleration", confidence=0.92),
    )
    store.add_classification(qid, cls)

    # Add a 2022 question for the same concept
    meta2 = PaperMetadata()
    meta2.board.value = "FBISE"
    meta2.class_level.value = "10"
    meta2.subject.value = "Physics"
    meta2.year.value = "2022"
    pid2 = store.add_paper(meta2, raw_text="Physics paper 2022")

    q2 = ExtractedQuestion(
        paper_id=pid2,
        year=2022,
        board="FBISE",
        class_level="10",
        subject="Physics",
        question_number="7",
        text="What is the acceleration of a body when its velocity does not change?",
        question_type="MCQ",
        marks=1,
        page=2,
    )
    qid2 = str(uuid.uuid4())
    store.add_question(q2, question_id=qid2)
    cls2 = QuestionClassification(
        question_id=qid2,
        chapter=ClassifiedField(value="Kinematics", confidence=0.90),
        topic=ClassifiedField(value="Motion", confidence=0.88),
        concept=ClassifiedField(value="Acceleration", confidence=0.91),
    )
    store.add_classification(qid2, cls2)
    return store


def make_curriculum_store() -> CurriculumStore:
    cs = CurriculumStore()
    version = cs.create_version(
        board_id="FBISE", version_name="2022",
        year_from=2022, description="FBISE 2022 curriculum"
    )
    cs.create_item(
        curriculum_version_id=version.id,
        class_level="10",
        subject="Physics",
        chapter="Kinematics",
        topic="Motion",
        concept="Acceleration",
        learning_objective="Define and calculate acceleration.",
        is_compulsory=True,
    )
    return cs


def make_knowledge_deps():
    cs = make_curriculum_store()
    mapper = TextbookMapper()
    graph = ConceptGraph(curriculum_store=cs, textbook_mapper=mapper)
    return cs, mapper, graph


def make_physics_ingestion_result() -> IngestionResult:
    pages = [
        make_structured_page(1, [
            make_heading("Chapter 1 Kinematics"),
            make_region("This chapter covers motion, velocity and acceleration."),
            make_heading("Motion"),
            make_region("Motion is defined as the change in position of an object."),
            make_region("Acceleration is defined as the rate of change of velocity."),
        ]),
        make_structured_page(2, [
            make_formula_region("a = Δv / Δt", latex="a = \\frac{\\Delta v}{\\Delta t}"),
            make_region("Example 1.1: A car increases its speed from 10 m/s to 30 m/s in 5 s."),
            make_region("Exercise 1.1: Calculate the acceleration if velocity changes from 20 to 60 m/s in 4 s."),
        ]),
    ]
    return make_ingestion_result(pages)


# ===========================================================================
# Test 1: Stage 1 — concept extraction
# ===========================================================================

def test_stage1_extracts_chapters_and_concepts():
    extractor = BookUnderstandingExtractor()
    ingestion = make_physics_ingestion_result()
    metadata, chapters = extractor.extract(
        ingestion,
        board_hint="FBISE",
        class_hint="10",
        subject_hint="Physics",
    )

    assert len(chapters) >= 1, "Should detect at least one chapter"
    ch = chapters[0]
    assert "kinematics" in ch.chapter_title.lower()
    assert ch.formula_count >= 1, "Should count the a = Δv/Δt formula"
    assert ch.example_count >= 1
    assert ch.exercise_count >= 1
    assert any(c.name.lower() == "acceleration" for c in ch.concepts), \
        "Should extract 'Acceleration' from 'Acceleration is defined as...'"


def test_stage1_metadata_verified_from_hints():
    extractor = BookUnderstandingExtractor()
    ingestion = make_physics_ingestion_result()
    metadata, _ = extractor.extract(ingestion, board_hint="FBISE", class_hint="10", subject_hint="Physics")

    assert metadata.board.value == "FBISE"
    assert metadata.board.is_inferred is False
    assert metadata.class_level.value == "10"
    assert metadata.subject.value == "Physics"
    assert metadata.subject.is_inferred is False


# ===========================================================================
# Test 2: Stage 2 — curriculum mapping
# ===========================================================================

def test_stage2_maps_exact_concept():
    cs, mapper, graph = make_knowledge_deps()
    stage2 = CurriculumMapper(cs, graph, mapper)

    # Create chapter with "Acceleration" concept
    chapter = ExtractedChapterContent(
        chapter_title="Chapter 1 Kinematics",
        page_start=1, page_end=2,
    )
    concept = ExtractedConcept(
        name="Acceleration",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Chapter 1 Kinematics",
        topic="Motion",
    )
    chapter.concepts.append(concept)

    results = stage2.map_chapter(
        chapter=chapter,
        book_id="book-1",
        book_title="Physics Class 10",
        book_edition="2024",
        board_short_code="FBISE",
        curriculum_version_id="any",
        class_level="10",
        subject="Physics",
    )
    assert len(results) == 1
    r = results[0]
    assert r.concept == "Acceleration"
    assert r.match_type == "EXACT"
    assert r.confidence >= 0.90
    assert r.is_compulsory is True
    # TextbookMapper should have registered the edge
    assert len(mapper._mappings) == 1


def test_stage2_not_found_for_unknown_concept():
    cs, mapper, graph = make_knowledge_deps()
    stage2 = CurriculumMapper(cs, graph, mapper)

    chapter = ExtractedChapterContent(chapter_title="Chapter 1 Kinematics")
    chapter.concepts.append(ExtractedConcept(
        name="Quantum Entanglement",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Chapter 1 Kinematics",
        topic="Weird Physics",
    ))

    results = stage2.map_chapter(
        chapter=chapter,
        book_id="book-1", book_title="Physics Class 10",
        book_edition="2024", board_short_code="FBISE",
        curriculum_version_id="any", class_level="10", subject="Physics",
    )
    assert results[0].match_type == "NOT_FOUND"
    assert results[0].confidence == 0.0


# ===========================================================================
# Test 3: Stage 3 — historical search
# ===========================================================================

def test_stage3_finds_past_paper_records():
    store = make_past_paper_store()
    stage3 = HistoricalSearcher(store)

    concept = ExtractedConcept(
        name="Acceleration",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Kinematics",
        topic="Motion",
    )
    evidence = stage3.search_concept(
        concept=concept,
        board="FBISE",
        class_level="10",
        subject="Physics",
    )

    assert evidence.concept == "Acceleration"
    assert len(evidence.past_paper_matches) >= 2, "Should find 2023 and 2022 questions"
    assert 2023 in evidence.years_appeared
    assert 2022 in evidence.years_appeared
    assert evidence.recurrence_count >= 2


def test_stage3_labels_new_concept_correctly():
    store = make_past_paper_store()
    stage3 = HistoricalSearcher(store)

    concept = ExtractedConcept(
        name="Quantum Tunneling",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Modern Physics",
        topic="Quantum Mechanics",
    )
    evidence = stage3.search_concept(
        concept=concept, board="FBISE", class_level="10", subject="Physics",
    )
    assert evidence.evidence_label == EvidenceLabel.NEW_CONCEPT
    assert "NEW CONCEPT" in evidence.new_concept_note


# ===========================================================================
# Test 4: Stage 4 — evidence comparison
# ===========================================================================

def test_stage4_high_evidence_label():
    comparator = EvidenceComparator()
    concept = ExtractedConcept(
        name="Acceleration",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Kinematics",
        topic="Motion",
    )
    evidence = ConceptHistoricalEvidence(
        concept="Acceleration",
        chapter="Kinematics",
        topic="Motion",
        recurrence_count=5,
        evidence_label=EvidenceLabel.HIGH_HISTORICAL_EVIDENCE,
        years_appeared=[2020, 2021, 2022, 2023, 2024],
    )
    table, new_concepts = comparator.compare([concept], [evidence])
    assert len(table) == 1
    assert table[0].evidence_strength == EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
    assert len(new_concepts) == 0


def test_stage4_new_concept_flagged():
    comparator = EvidenceComparator()
    concept = ExtractedConcept(
        name="Quantum Gravity",
        concept_type=ConceptType.CONCEPTUAL,
        chapter="Modern Physics",
        topic="Quantum Mechanics",
    )
    evidence = ConceptHistoricalEvidence(
        concept="Quantum Gravity",
        chapter="Modern Physics",
        topic="Quantum Mechanics",
        recurrence_count=0,
        evidence_label=EvidenceLabel.NEW_CONCEPT,
        new_concept_note="NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE",
    )
    table, new_concepts = comparator.compare([concept], [evidence])
    assert len(new_concepts) == 1
    assert table[0].new_concept_note == "NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE"


# ===========================================================================
# Test 5: Stage 5 — edition diff
# ===========================================================================

def test_stage5_new_concept_detected():
    diff = EditionDiffAnalyzer()

    old_chapter = ExtractedChapterContent(chapter_title="Chapter 1 Kinematics")
    old_chapter.concepts.append(ExtractedConcept(
        name="Velocity", concept_type=ConceptType.CONCEPTUAL,
        chapter="Kinematics", topic="Motion",
        text_snippet="Velocity is the rate of change of displacement.",
    ))
    diff.register_previous_edition("Physics Class 10", "2023", [old_chapter])

    new_chapter = ExtractedChapterContent(chapter_title="Chapter 1 Kinematics")
    new_chapter.concepts.extend([
        ExtractedConcept(
            name="Velocity", concept_type=ConceptType.CONCEPTUAL,
            chapter="Kinematics", topic="Motion",
            text_snippet="Velocity is the rate of change of displacement.",
        ),
        ExtractedConcept(
            name="Jerk",
            concept_type=ConceptType.CONCEPTUAL,
            chapter="Kinematics", topic="Motion",
            text_snippet="Jerk is the rate of change of acceleration.",
        ),
    ])
    changes = diff.diff_chapter(
        chapter=new_chapter,
        book_title="Physics Class 10",
        current_edition="2024",
        previous_edition="2023",
    )
    change_map = {c.concept: c.change_type for c in changes}
    assert change_map["Velocity"] == ChangeType.UNCHANGED
    assert change_map["Jerk"] == ChangeType.NEW
    jerk_change = next(c for c in changes if c.concept == "Jerk")
    assert "NEW CONCEPT" in jerk_change.new_concept_historical_note


def test_stage5_removed_concept_detected():
    diff = EditionDiffAnalyzer()

    old_chapter = ExtractedChapterContent(chapter_title="Chapter 1 Kinematics")
    for name in ["Velocity", "Speed", "OldConcept"]:
        old_chapter.concepts.append(ExtractedConcept(
            name=name, concept_type=ConceptType.CONCEPTUAL,
            chapter="Kinematics", topic="Motion",
            text_snippet=f"{name} definition.",
        ))
    diff.register_previous_edition("Physics", "2023", [old_chapter])

    new_chapter = ExtractedChapterContent(chapter_title="Chapter 1 Kinematics")
    for name in ["Velocity", "Speed"]:
        new_chapter.concepts.append(ExtractedConcept(
            name=name, concept_type=ConceptType.CONCEPTUAL,
            chapter="Kinematics", topic="Motion",
            text_snippet=f"{name} definition.",
        ))
    changes = diff.diff_chapter(
        chapter=new_chapter, book_title="Physics",
        current_edition="2024", previous_edition="2023",
    )
    change_map = {c.concept: c.change_type for c in changes}
    assert change_map["OldConcept"] == ChangeType.REMOVED


def test_stage5_no_previous_edition_graceful():
    diff = EditionDiffAnalyzer()
    chapter = ExtractedChapterContent(chapter_title="Chapter 1")
    chapter.concepts.append(ExtractedConcept(
        name="Force", concept_type=ConceptType.CONCEPTUAL,
        chapter="Chapter 1", topic="Dynamics",
    ))
    changes = diff.diff_chapter(
        chapter=chapter, book_title="Physics",
        current_edition="2024", previous_edition=None,
    )
    assert len(changes) == 1
    assert changes[0].change_type == ChangeType.UNCHANGED
    assert "No previous edition" in changes[0].note


# ===========================================================================
# Test 6: Stage 6 — priority plan
# ===========================================================================

def test_stage6_priority_sorted_and_in_range():
    planner = MCQPriorityPlanner()

    chapter = ExtractedChapterContent(chapter_title="Kinematics")
    concepts = [
        ExtractedConcept(name="Acceleration", concept_type=ConceptType.FORMULA,
                         chapter="Kinematics", topic="Motion", has_formula=True),
        ExtractedConcept(name="Distance", concept_type=ConceptType.CONCEPTUAL,
                         chapter="Kinematics", topic="Motion"),
        ExtractedConcept(name="Quantum Gravity", concept_type=ConceptType.CONCEPTUAL,
                         chapter="Kinematics", topic="Advanced"),
    ]
    chapter.concepts = concepts

    curriculum_mappings = [
        CurriculumMappingResult(concept="Acceleration", match_type="EXACT",
                                confidence=0.95, is_compulsory=True),
        CurriculumMappingResult(concept="Distance", match_type="EXACT",
                                confidence=0.80, is_compulsory=True),
        CurriculumMappingResult(concept="Quantum Gravity", match_type="NOT_FOUND",
                                confidence=0.0),
    ]
    historical_evidence = [
        ConceptHistoricalEvidence(
            concept="Acceleration", chapter="Kinematics", topic="Motion",
            evidence_label=EvidenceLabel.HIGH_HISTORICAL_EVIDENCE,
            recurrence_count=5, years_appeared=[2019, 2020, 2021, 2022, 2023],
            question_types=["SHORT", "MCQ", "NUMERICAL"],
        ),
        ConceptHistoricalEvidence(
            concept="Distance", chapter="Kinematics", topic="Motion",
            evidence_label=EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE,
            recurrence_count=2,
        ),
        ConceptHistoricalEvidence(
            concept="Quantum Gravity", chapter="Kinematics", topic="Advanced",
            evidence_label=EvidenceLabel.NEW_CONCEPT,
            new_concept_note="NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE",
        ),
    ]

    plan = planner.plan_chapter(
        chapter=chapter,
        curriculum_mappings=curriculum_mappings,
        historical_evidence=historical_evidence,
        board="FBISE",
        class_level="10",
        subject="Physics",
    )

    assert len(plan.entries) == 3
    # Sorted highest first
    for i in range(len(plan.entries) - 1):
        assert plan.entries[i].priority_score >= plan.entries[i + 1].priority_score

    # All scores in [0, 1]
    for entry in plan.entries:
        for field_name in ("curriculum_support", "textbook_support", "historical_evidence",
                           "pattern_evidence", "difficulty_coverage_gap",
                           "content_opportunity", "priority_score"):
            val = getattr(entry, field_name)
            assert 0.0 <= val <= 1.0, f"{field_name}={val} out of range"

    # "Acceleration" should have the highest score (high evidence + formula + compulsory)
    assert plan.entries[0].concept == "Acceleration"


# ===========================================================================
# Test 7: Stage 7 — candidates carry provenance + no forbidden language
# ===========================================================================

def make_valid_mcq_candidate() -> MCQCandidate:
    return MCQCandidate(
        question="What is acceleration?",
        options=[
            Option(text="Rate of change of velocity", isCorrect=True),
            Option(text="Rate of change of displacement", isCorrect=False),
            Option(text="Distance covered per second", isCorrect=False),
            Option(text="Product of mass and velocity", isCorrect=False),
        ],
        correctAnswer="Rate of change of velocity",
        explanation="Acceleration is defined as the rate of change of velocity.",
        board="FBISE",
        **{"class": "10"},
        subject="Physics",
        chapter="Kinematics",
        topic="Motion",
        concept="Acceleration",
        learningObjective="Define acceleration.",
        difficulty=Difficulty.MEDIUM,
        cognitiveLevel=CognitiveLevel.KNOWLEDGE,
        questionType=QuestionType.MCQ_SINGLE,
        contentMode="TEXT",
        evidence=Evidence(
            historicalEvidenceStatus=EvidenceStatus.STRONG_EVIDENCE,
            curriculumEvidence=[CurriculumEvidence(
                curriculumId="c-1",
                description="Define and calculate acceleration.",
            )],
            textbookEvidence=[],
            pastPaperEvidence=[{
                "board": "FBISE",
                "year": 2023,
                "questionNumber": "3",
                "relationshipType": "SAME_CONCEPT",
                "reason": "Tests acceleration definition."
            }],
        ),
        generationRationale="Based on evidence.",
    )


def test_stage7_candidate_with_provenance_valid_rationale():
    """CandidateWithProvenance with valid evidence-grounding rationale must be accepted."""
    from services.book_analysis.schemas import CandidateWithProvenance
    candidate = make_valid_mcq_candidate()
    cwp = CandidateWithProvenance(
        candidate=candidate,
        validation_status=ValidationStatus.PASS,
        rationale="This candidate is supported by available curriculum, textbook and historical evidence.",
        uncertainty="Historical evidence is not a guarantee of future examination content.",
    )
    assert cwp.validation_status == ValidationStatus.PASS


def test_stage7_candidate_with_provenance_rejects_forbidden_language():
    """CandidateWithProvenance must reject forbidden predictive language in rationale."""
    from services.book_analysis.schemas import CandidateWithProvenance
    from pydantic import ValidationError
    candidate = make_valid_mcq_candidate()
    with pytest.raises(ValidationError, match="forbidden predictive language"):
        CandidateWithProvenance(
            candidate=candidate,
            validation_status=ValidationStatus.PASS,
            rationale="This will appear in the exam — guarantee it comes in 2025.",
            uncertainty="None.",
        )


def test_stage7_candidate_must_contain_evidence_language():
    """Rationale must reference evidence; vague rationale is rejected."""
    from services.book_analysis.schemas import CandidateWithProvenance
    from pydantic import ValidationError
    candidate = make_valid_mcq_candidate()
    with pytest.raises(ValidationError, match="evidence"):
        CandidateWithProvenance(
            candidate=candidate,
            validation_status=ValidationStatus.PASS,
            rationale="This is a good question about acceleration.",
            uncertainty="Not sure.",
        )


# ===========================================================================
# Test 8: Full pipeline — no LLM produces PENDING_GENERATION report
# ===========================================================================

@pytest.mark.asyncio
async def test_pipeline_no_llm_returns_pending_generation():
    store = make_past_paper_store()
    cs, mapper, graph = make_knowledge_deps()
    ingestion = make_physics_ingestion_result()

    pipeline = BookAnalysisPipeline(
        past_paper_store=store,
        curriculum_store=cs,
        concept_graph=graph,
        textbook_mapper=mapper,
        llm_callable=None,  # No LLM → graceful degradation
    )

    report = await pipeline.analyze(
        ingestion_result=ingestion,
        board="FBISE",
        class_level="10",
        subject="Physics",
        book_id="physics-10",
        book_title="Physics Class 10",
        book_edition="2024",
        board_hint="FBISE",
        class_hint="10",
        subject_hint="Physics",
    )

    assert report.board == "FBISE"
    assert report.class_level == "10"
    assert len(report.chapters) >= 1

    # Stage 7 should have degraded gracefully
    assert report.review_status == ReviewStatus.PENDING_GENERATION
    for ch_report in report.chapters:
        assert ch_report.review_status == ReviewStatus.PENDING_GENERATION
        # No candidates generated (LLM unavailable)
        assert ch_report.generated_mcq_candidates == []


# ===========================================================================
# Test 9: Pipeline with mock LLM produces candidates
# ===========================================================================

@pytest.mark.asyncio
async def test_pipeline_with_mock_llm_produces_candidates():
    store = make_past_paper_store()
    cs, mapper, graph = make_knowledge_deps()
    ingestion = make_physics_ingestion_result()

    # Mock LLM that returns a valid MCQ candidate
    async def mock_llm(**kwargs):
        return make_valid_mcq_candidate()

    pipeline = BookAnalysisPipeline(
        past_paper_store=store,
        curriculum_store=cs,
        concept_graph=graph,
        textbook_mapper=mapper,
        llm_callable=mock_llm,
    )

    report = await pipeline.analyze(
        ingestion_result=ingestion,
        board="FBISE",
        class_level="10",
        subject="Physics",
        book_id="physics-10",
        book_title="Physics Class 10",
        book_edition="2024",
        board_hint="FBISE",
        class_hint="10",
        subject_hint="Physics",
    )

    # Candidates should be generated
    total_candidates = sum(len(r.generated_mcq_candidates) for r in report.chapters)
    assert total_candidates > 0, "Expected candidates with mock LLM"
    assert report.total_candidates_generated > 0


# ===========================================================================
# Test 10: BookAnalysisReport disclaimer is always present
# ===========================================================================

@pytest.mark.asyncio
async def test_pipeline_report_always_contains_disclaimer():
    store = make_past_paper_store()
    cs, mapper, graph = make_knowledge_deps()
    ingestion = make_physics_ingestion_result()

    pipeline = BookAnalysisPipeline(
        past_paper_store=store,
        curriculum_store=cs,
        concept_graph=graph,
        textbook_mapper=mapper,
        llm_callable=None,
    )
    report = await pipeline.analyze(
        ingestion_result=ingestion, board="FBISE", class_level="10",
    )
    assert "historical" in report.disclaimer.lower()
    assert "not" in report.disclaimer.lower()
    for ch_report in report.chapters:
        assert "historical" in ch_report.disclaimer.lower()
