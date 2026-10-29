"""
Pydantic v2 schemas for the Multi-Board Educational Knowledge Layer.

Design principles
-----------------
* Source priority is a structural guarantee — AI content cannot reach
  priority 1–4 without explicit human verification.
* Every retrieval result carries full provenance metadata.
* Curriculum version mismatch is surfaced, never silently ignored.
* Adding a new board requires only data (YAML), not code changes.
"""

from __future__ import annotations

from enum import IntEnum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ===========================================================================
# Source Priority
# ===========================================================================

class SourcePriority(IntEnum):
    """
    Evidence authority level. Lower integer = higher authority.

    This is a structural guarantee: AI-generated content is fixed at 5.
    No code path can assign it a lower integer without human verification.
    """
    VERIFIED_CURRICULUM = 1
    VERIFIED_TEXTBOOK = 2
    VERIFIED_PAST_PAPER = 3
    APPROVED_TEACHER_CONTENT = 4
    AI_GENERATED = 5

    @property
    def label(self) -> str:
        return {
            1: "Verified Official Curriculum",
            2: "Verified Textbook",
            3: "Verified Past Paper",
            4: "Approved Teacher / Reviewer Content",
            5: "AI-Generated Content (not authoritative)",
        }[self.value]


# ===========================================================================
# Evidence Source — one piece of provenance
# ===========================================================================

class EvidenceSource(BaseModel):
    """
    A single piece of provenance evidence attached to a RetrievalResult.

    Every field that is not applicable must be explicitly None — there are
    no defaults that could mask missing provenance.
    """

    source_type: str                        # CURRICULUM | TEXTBOOK | PAST_PAPER | AI_GENERATED | …
    source_id: str                          # UUID of the originating DB record
    priority: SourcePriority

    # Where it came from
    board: Optional[str] = None
    curriculum_version: Optional[str] = None   # e.g. "2022", "2025"
    year: Optional[int] = None
    page: Optional[int] = None
    question_number: Optional[str] = None   # e.g. "Q3(b)"

    # What it covers
    chapter: Optional[str] = None
    topic: Optional[str] = None
    concept: Optional[str] = None
    learning_objective: Optional[str] = None

    # How it was linked
    relationship: Optional[str] = None     # e.g. "SAME_CONCEPT", "SEMANTICALLY_EQUIVALENT"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)

    # The actual content snippet
    text_snippet: str = ""                  # first 200 chars of the source text

    @property
    def priority_label(self) -> str:
        return self.priority.label


# ===========================================================================
# Retrieval Result — full explainable result
# ===========================================================================

class CurriculumVersionNote(BaseModel):
    """
    Warning emitted when evidence spans incompatible curriculum versions.

    Callers must surface this to the user — never silently discard it.
    """
    versions_mixed: list[str]
    message: str = (
        "Evidence comes from multiple curriculum versions. "
        "Verify that comparisons are valid across these versions."
    )


class RetrievalResult(BaseModel):
    """
    A single explainable retrieval result.

    Every result identifies its source, board, year (if applicable), page,
    question number (if applicable), concept, relationship, and confidence.

    Results are NEVER ranked by AI confidence alone — source priority
    (human-verified > AI-generated) governs the ordering.
    """

    # Query context
    query: str
    board: Optional[str] = None
    class_level: Optional[str] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None
    concept: Optional[str] = None

    # The retrieved content
    text: str
    text_source: str = ""                       # human-readable source label

    # All evidence backing this result, sorted by priority
    sources: list[EvidenceSource] = Field(default_factory=list)

    # Retrieval metadata
    top_priority: SourcePriority = SourcePriority.AI_GENERATED
    retrieval_strategy: str = ""                # "metadata" | "keyword" | "semantic" | "hybrid"
    similarity_score: Optional[float] = None    # set for semantic results

    # Version integrity
    curriculum_version_note: Optional[CurriculumVersionNote] = None

    @property
    def is_ai_only(self) -> bool:
        """True if every evidence source is AI-generated."""
        return all(s.priority == SourcePriority.AI_GENERATED for s in self.sources)

    @property
    def highest_authority_source(self) -> Optional[EvidenceSource]:
        """The source with the lowest priority integer (highest authority)."""
        if not self.sources:
            return None
        return min(self.sources, key=lambda s: s.priority.value)

    def provenance_summary(self) -> str:
        """One-line human-readable provenance."""
        top = self.highest_authority_source
        if top is None:
            return "No provenance"
        parts = [top.source_type]
        if top.board:
            parts.append(top.board)
        if top.year:
            parts.append(str(top.year))
        if top.question_number:
            parts.append(top.question_number)
        if top.page:
            parts.append(f"p.{top.page}")
        parts.append(f"[{top.priority.label}]")
        return " | ".join(parts)


# ===========================================================================
# Board Profile — data-driven, no code needed to add a new board
# ===========================================================================

class ExamStyle(BaseModel):
    """Board-specific examination style descriptor."""
    mcq_paper: bool = True
    subjective_paper: bool = True
    practical_component: bool = False
    negative_marking: bool = False
    allowed_question_types: list[str] = Field(default_factory=list)
    marks_per_mcq: float = 1.0
    total_mcq_count: Optional[int] = None
    exam_duration_minutes: Optional[int] = None
    notes: str = ""


class BoardProfile(BaseModel):
    """
    Complete profile of a single education board.

    New boards are added by creating a YAML/JSON data file and calling
    BoardRegistry.from_yaml(). No application code changes required.
    """
    id: str
    name: str
    short_code: str                 # e.g. "FBISE", "BISE-Lahore"
    country: str = "Pakistan"
    description: str = ""
    status: str = "ACTIVE"

    # Board-specific terminology overrides
    # e.g. {"chapter": "unit"} if the board uses "unit" instead of "chapter"
    terminology: dict[str, str] = Field(default_factory=dict)

    # Class levels offered by this board
    class_levels: list[str] = Field(default_factory=list)  # e.g. ["9", "10", "11", "12"]

    # Subjects per class (nested dict: class_level → list of subjects)
    subjects_by_class: dict[str, list[str]] = Field(default_factory=dict)

    # Exam style configuration
    exam_style: ExamStyle = Field(default_factory=ExamStyle)

    # Textbook associations: subject → list of associated textbook titles
    textbook_associations: dict[str, list[str]] = Field(default_factory=dict)

    # Additional metadata
    website: str = ""
    established_year: Optional[int] = None
    headquarters: str = ""
    extra: dict[str, Any] = Field(default_factory=dict)

    def get_term(self, standard_term: str) -> str:
        """Return the board-specific term for a standard curriculum term."""
        return self.terminology.get(standard_term, standard_term)

    def subjects_for_class(self, class_level: str) -> list[str]:
        return self.subjects_by_class.get(class_level, [])


# ===========================================================================
# Curriculum Versioning
# ===========================================================================

class CurriculumVersion(BaseModel):
    """
    A specific version of a board's curriculum.

    Evidence from different curriculum versions must not be mixed without
    surfacing a CurriculumVersionNote in the RetrievalResult.
    """
    id: str
    board_id: str                       # matches BoardProfile.short_code
    version_name: str                   # e.g. "2022", "2025", "2006-SNC"
    year_from: int
    year_to: Optional[int] = None       # None = still active

    description: str = ""
    major_changes: list[str] = Field(default_factory=list)

    def is_active_for_year(self, year: int) -> bool:
        if year < self.year_from:
            return False
        if self.year_to is not None and year > self.year_to:
            return False
        return True


class CurriculumItem(BaseModel):
    """
    One item in a curriculum version — a chapter/topic/concept triple
    that is officially mandated for examination.
    """
    id: str
    curriculum_version_id: str

    class_level: str
    subject: str
    chapter: str
    chapter_number: Optional[int] = None
    topic: str
    concept: str
    learning_objective: str = ""

    is_compulsory: bool = True
    marks_weightage: Optional[float] = None    # % of total marks
    source_priority: SourcePriority = SourcePriority.VERIFIED_CURRICULUM

    notes: str = ""


# ===========================================================================
# Textbook Mapping — TEXTBOOK ↕ CONCEPT edge
# ===========================================================================

class TextbookMapping(BaseModel):
    """
    Maps a textbook chapter / page range to the concept graph.

    This creates the TEXTBOOK ↕ CONCEPT edge.

    `is_human_verified` starts False for AI-inferred mappings.
    Human verification sets it to True and raises the effective source priority.
    """
    id: str
    book_id: str                    # matches Book.id in Prisma
    book_title: str
    book_edition: str = ""

    # Source location in the textbook
    chapter_title: str
    chapter_number: Optional[int] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    section_title: str = ""

    # Concept graph target
    board_short_code: str
    curriculum_version_id: str
    class_level: str
    subject: str
    chapter: str
    topic: str
    concept: str

    # Confidence and verification
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    is_human_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None

    text_snippet: str = ""          # representative excerpt

    @property
    def effective_priority(self) -> SourcePriority:
        return (
            SourcePriority.VERIFIED_TEXTBOOK
            if self.is_human_verified
            else SourcePriority.AI_GENERATED
        )
