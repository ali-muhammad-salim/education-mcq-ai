"""
Pydantic v2 schemas for the Book Historical Analysis Engine.

Design principles
-----------------
* Evidence labels describe HISTORICAL OBSERVATIONS only — never predictions.
* Every inferred field carries an explicit is_inferred flag.
* MCQ candidate rationale is schema-validated to reject forbidden predictive
  language ("will appear", "guarantee", "certain", etc.).
* Edition changes (NEW / REMOVED / MODIFIED) are always explicitly classified.
* A NEW concept must state: "NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE"
* The 12-section ChapterAnalysisReport is the primary output contract.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator

from services.past_paper.schemas import EvidenceLabel
from services.generation.schemas import (
    MCQCandidate,
    QuestionType,
    EvidenceStatus,
)
from services.validation.schemas import ValidationStatus


# ===========================================================================
# Detected book metadata
# ===========================================================================

class InferredField(BaseModel):
    """A single metadata value that may be AI-inferred (never silently treated as fact)."""
    value: Optional[str] = None
    is_inferred: bool = False
    inference_confidence: float = Field(default=1.0, ge=0.0, le=1.0)

    def display(self) -> str:
        tag = " [INFERRED — REQUIRES VERIFICATION]" if self.is_inferred else ""
        return f"{self.value or '—'}{tag}"


class DetectedBookMetadata(BaseModel):
    """
    Book-level metadata detected from the document.
    Every field that was inferred by AI is marked is_inferred=True.
    """
    board: InferredField = Field(default_factory=InferredField)
    class_level: InferredField = Field(default_factory=InferredField)
    subject: InferredField = Field(default_factory=InferredField)
    edition: InferredField = Field(default_factory=InferredField)
    title: InferredField = Field(default_factory=InferredField)
    publisher: InferredField = Field(default_factory=InferredField)

    # Field names that still need human verification
    verification_required: list[str] = Field(default_factory=list)

    def flag_inferred(self, field_name: str, value: str, confidence: float = 0.8) -> None:
        field: InferredField = getattr(self, field_name)
        field.value = value
        field.is_inferred = True
        field.inference_confidence = confidence
        if field_name not in self.verification_required:
            self.verification_required.append(field_name)

    def set_verified(self, field_name: str, value: str) -> None:
        field: InferredField = getattr(self, field_name)
        field.value = value
        field.is_inferred = False
        if field_name in self.verification_required:
            self.verification_required.remove(field_name)


# ===========================================================================
# Extracted concept
# ===========================================================================

class ConceptType(str, Enum):
    CONCEPTUAL = "CONCEPTUAL"
    FORMULA = "FORMULA"
    DIAGRAM = "DIAGRAM"
    GRAPH = "GRAPH"
    NUMERICAL = "NUMERICAL"
    CHEMICAL_EQUATION = "CHEMICAL_EQUATION"
    TABLE = "TABLE"
    EXERCISE = "EXERCISE"
    EXAMPLE = "EXAMPLE"


class ExtractedConcept(BaseModel):
    """A single concept detected from a textbook chapter."""
    name: str
    concept_type: ConceptType = ConceptType.CONCEPTUAL
    chapter: str
    topic: str
    source_page: Optional[int] = None
    text_snippet: str = ""          # first 200 chars of surrounding text
    latex: str = ""                 # for FORMULA / CHEMICAL_EQUATION types
    has_diagram: bool = False
    has_formula: bool = False
    has_graph: bool = False
    has_table: bool = False


class ExtractedChapterContent(BaseModel):
    """All extracted content for a single textbook chapter."""
    chapter_title: str
    chapter_number: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None

    topics: list[str] = Field(default_factory=list)
    concepts: list[ExtractedConcept] = Field(default_factory=list)
    formula_count: int = 0
    diagram_count: int = 0
    graph_count: int = 0
    table_count: int = 0
    example_count: int = 0
    exercise_count: int = 0
    chemical_equation_count: int = 0


# ===========================================================================
# Stage 2: Curriculum mapping
# ===========================================================================

class CurriculumMappingResult(BaseModel):
    """Maps a textbook concept to a curriculum item."""
    concept: str
    curriculum_id: Optional[str] = None
    curriculum_version: str = ""
    learning_objective: str = ""
    is_compulsory: bool = False
    match_type: str = "EXACT"       # EXACT | RELATED | INFERRED | NOT_FOUND
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    is_human_verified: bool = False
    note: str = ""


# ===========================================================================
# Stage 3 & 4: Historical evidence
# ===========================================================================

class PastPaperMatch(BaseModel):
    """One past-paper question matching a concept."""
    year: int
    board: str
    question_number: str
    sub_question_number: str = ""
    question_type: str
    marks: Optional[float] = None
    relation_type: str              # SAME_CONCEPT | SAME_FORMULA | SAME_NUMERICAL_METHOD | etc.
    page: Optional[int] = None
    text_snippet: str = ""

    def reference(self) -> str:
        ref = f"Q{self.question_number}"
        if self.sub_question_number:
            ref += f"({self.sub_question_number})"
        return f"{self.board} {self.year} — {ref}"


class ConceptHistoricalEvidence(BaseModel):
    """
    Historical evidence for a single concept.

    IMPORTANT: These labels describe HISTORICAL DATA ONLY.
    They are NOT predictions about future examinations.
    """
    concept: str
    chapter: str
    topic: str

    past_paper_matches: list[PastPaperMatch] = Field(default_factory=list)
    years_appeared: list[int] = Field(default_factory=list)
    question_numbers: list[str] = Field(default_factory=list)
    question_types: list[str] = Field(default_factory=list)
    marks_seen: list[float] = Field(default_factory=list)
    patterns: list[str] = Field(default_factory=list)
    recurrence_count: int = 0
    evidence_label: EvidenceLabel = EvidenceLabel.INSUFFICIENT_DATA

    # For NEW concepts: related historical concepts (shown separately)
    related_historical_concepts: list[str] = Field(default_factory=list)
    new_concept_note: str = ""      # "NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE" if applicable

    disclaimer: str = (
        "Historical evidence is NOT a guarantee about future examinations. "
        "Past appearance frequency does not imply future appearance."
    )


# ===========================================================================
# Stage 5: Edition diff
# ===========================================================================

class ChangeType(str, Enum):
    UNCHANGED = "UNCHANGED"
    REMOVED = "REMOVED"
    NEW = "NEW"
    MODIFIED = "MODIFIED"


class EditionChange(BaseModel):
    """Classification of a concept's status between editions."""
    concept: str
    chapter: str
    change_type: ChangeType
    previous_edition: Optional[str] = None
    current_edition: Optional[str] = None
    note: str = ""
    # For NEW: always set this message
    new_concept_historical_note: str = ""


# ===========================================================================
# Stage 6: MCQ Priority Plan
# ===========================================================================

class MCQPriorityEntry(BaseModel):
    """Priority analysis for a single concept."""
    concept: str
    chapter: str
    topic: str
    concept_type: ConceptType

    # 6-dimension scores (0.0–1.0)
    curriculum_support: float = Field(ge=0.0, le=1.0)
    textbook_support: float = Field(ge=0.0, le=1.0)
    historical_evidence: float = Field(ge=0.0, le=1.0)
    pattern_evidence: float = Field(ge=0.0, le=1.0)
    difficulty_coverage_gap: float = Field(ge=0.0, le=1.0)
    content_opportunity: float = Field(ge=0.0, le=1.0)

    priority_score: float = Field(ge=0.0, le=1.0)
    evidence_summary: str = ""


class MCQPriorityPlan(BaseModel):
    """Chapter-level MCQ priority plan, sorted highest priority first."""
    board: str
    class_level: str
    subject: str
    chapter: str
    entries: list[MCQPriorityEntry] = Field(default_factory=list)
    generation_note: str = (
        "Candidates are prioritized by evidence strength. "
        "This is NOT a prediction about exam content."
    )


# ===========================================================================
# Stage 7: Candidate with provenance
# ===========================================================================

_FORBIDDEN_LANGUAGE = [
    "will appear", "will come", "guarantee", "guaranteed",
    "certain to appear", "100%", "definitely will", "definitely appear",
]

_REQUIRED_LANGUAGE = [
    "supported by", "historical evidence", "curriculum", "available evidence",
]


class CandidateWithProvenance(BaseModel):
    """
    A generated MCQ candidate with full evidence chain attached.

    Rationale is schema-validated to:
    - REJECT forbidden predictive language
    - REQUIRE evidence-grounding language
    """
    candidate: MCQCandidate
    validation_status: ValidationStatus
    validation_notes: list[str] = Field(default_factory=list)

    # Evidence
    related_past_papers: list[PastPaperMatch] = Field(default_factory=list)
    historical_years: list[int] = Field(default_factory=list)
    evidence_strength: EvidenceLabel = EvidenceLabel.INSUFFICIENT_DATA

    # Generation metadata
    rationale: str
    uncertainty: str = Field(
        description="What is uncertain about this candidate — must be stated honestly."
    )

    @field_validator("rationale")
    @classmethod
    def check_language(cls, v: str) -> str:
        v_lower = v.lower()
        for forbidden in _FORBIDDEN_LANGUAGE:
            if forbidden in v_lower:
                raise ValueError(
                    f"Rationale contains forbidden predictive language: '{forbidden}'. "
                    "Use evidence-grounding language instead."
                )
        if not any(req in v_lower for req in _REQUIRED_LANGUAGE):
            raise ValueError(
                "Rationale must reference evidence (e.g. 'supported by available evidence', "
                "'historical evidence shows', 'curriculum mandates')."
            )
        return v


# ===========================================================================
# Chapter Analysis Report (12 sections)
# ===========================================================================

class ReviewStatus(str, Enum):
    PENDING = "PENDING"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    READY = "READY"
    PENDING_GENERATION = "PENDING_GENERATION"   # LLM unavailable


class ChapterAnalysisReport(BaseModel):
    """
    Full analysis report for a single textbook chapter.

    All 12 sections are populated by the pipeline stages.
    """
    # Identity
    board: str
    class_level: str
    subject: str
    generated_at: str

    # 1. Chapter summary
    chapter_summary: dict = Field(default_factory=dict)

    # 2. Detected concepts
    detected_concepts: list[ExtractedConcept] = Field(default_factory=list)

    # 3. Curriculum mapping
    curriculum_mapping: list[CurriculumMappingResult] = Field(default_factory=list)

    # 4. Historical evidence
    historical_evidence: list[ConceptHistoricalEvidence] = Field(default_factory=list)

    # 5. Related past-paper questions (flat list)
    related_past_paper_questions: list[PastPaperMatch] = Field(default_factory=list)

    # 6. New concepts (no historical evidence)
    new_concepts: list[ExtractedConcept] = Field(default_factory=list)

    # 7. Changed concepts (edition diff)
    changed_concepts: list[EditionChange] = Field(default_factory=list)

    # 8. Question pattern analysis
    question_pattern_analysis: dict = Field(default_factory=dict)

    # 9. Recommended MCQ coverage
    recommended_mcq_coverage: Optional[MCQPriorityPlan] = None

    # 10. Generated MCQ candidates
    generated_mcq_candidates: list[CandidateWithProvenance] = Field(default_factory=list)

    # 11. Validation results (summary per candidate)
    validation_results: list[dict] = Field(default_factory=list)

    # 12. Review status
    review_status: ReviewStatus = ReviewStatus.PENDING

    disclaimer: str = (
        "This report contains historical observations only. "
        "No section constitutes a prediction about future examinations."
    )


# ===========================================================================
# Book Analysis Report (whole-book aggregation)
# ===========================================================================

class BookAnalysisReport(BaseModel):
    """Whole-book aggregation of all chapter reports."""
    book_title: str
    book_edition: str = ""
    board: str
    class_level: str
    subject: str
    generated_at: str

    metadata: DetectedBookMetadata = Field(default_factory=DetectedBookMetadata)
    chapters: list[ChapterAnalysisReport] = Field(default_factory=list)

    # Aggregates
    total_concepts: int = 0
    total_new_concepts: int = 0
    total_past_paper_matches: int = 0
    total_candidates_generated: int = 0
    total_candidates_passed: int = 0

    review_status: ReviewStatus = ReviewStatus.PENDING

    disclaimer: str = (
        "This report is generated from historical evidence and curriculum data. "
        "It does not predict, guarantee, or imply future examination content."
    )
