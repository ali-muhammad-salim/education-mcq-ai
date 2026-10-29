"""
Pydantic v2 schemas for the Past Paper Intelligence Engine.

Design principles
-----------------
* Inferred metadata is ALWAYS structurally marked — callers cannot
  accidentally treat an inference as verified data.
* Evidence labels describe history, NEVER predict the future.
* Every classification field carries an explicit confidence score.
* Semantic relationships require an articulated reason; they are never
  created purely on surface similarity.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ===========================================================================
# Evidence level
# ===========================================================================

class EvidenceLabel(str, Enum):
    """
    Describes how strongly a concept / topic is supported by historical
    past-paper data.

    IMPORTANT: these labels describe HISTORICAL EVIDENCE ONLY.
    They are NOT predictions about future examinations.
    """

    HIGH_HISTORICAL_EVIDENCE = "HIGH_HISTORICAL_EVIDENCE"
    MODERATE_HISTORICAL_EVIDENCE = "MODERATE_HISTORICAL_EVIDENCE"
    LOW_HISTORICAL_EVIDENCE = "LOW_HISTORICAL_EVIDENCE"
    NEW_CONCEPT = "NEW_CONCEPT"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


# ===========================================================================
# Metadata — with explicit inferred flag on every field
# ===========================================================================

class MetadataField(BaseModel):
    """
    A single metadata value that may be inferred or verified.

    If `is_inferred` is True the value was extracted via heuristics / AI and
    has NOT been verified against an authoritative source.  The caller must
    treat it as a candidate, not as fact.
    """

    value: Optional[str] = None
    is_inferred: bool = False
    inference_confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class PaperMetadata(BaseModel):
    """
    Document-level metadata for a single past paper.

    Each field is a `MetadataField` so that the inferred flag is never
    silently dropped.  `verification_required` lists the names of every field
    whose value was inferred and has not been confirmed.
    """

    board: MetadataField = Field(default_factory=MetadataField)
    class_level: MetadataField = Field(default_factory=MetadataField)   # e.g. "10"
    subject: MetadataField = Field(default_factory=MetadataField)
    year: MetadataField = Field(default_factory=MetadataField)
    session: MetadataField = Field(default_factory=MetadataField)       # Annual / Supp
    paper_type: MetadataField = Field(default_factory=MetadataField)    # MCQ / Theory
    paper_code: MetadataField = Field(default_factory=MetadataField)

    # Automatically derived list of field names that need human verification
    verification_required: list[str] = Field(default_factory=list)

    def mark_verified(self, field_name: str) -> None:
        """Mark a previously inferred field as verified by a human."""
        field: MetadataField = getattr(self, field_name)
        field.is_inferred = False
        if field_name in self.verification_required:
            self.verification_required.remove(field_name)

    def summary(self) -> dict[str, Any]:
        """Human-readable summary for logging / display."""
        out = {}
        for name in ("board", "class_level", "subject", "year", "session",
                     "paper_type", "paper_code"):
            f: MetadataField = getattr(self, name)
            tag = " [INFERRED]" if f.is_inferred else ""
            out[name] = f"{f.value}{tag}" if f.value else "—"
        return out


# ===========================================================================
# Extracted question
# ===========================================================================

class ExtractedQuestion(BaseModel):
    """
    A single question extracted from a past paper.

    Exact question numbering from the original document is preserved.
    """

    paper_id: str                                           # links back to PastPaper
    year: int
    board: str
    class_level: str
    subject: str
    session: str = ""
    question_number: str                                    # e.g. "3"
    sub_question_number: str = ""                          # e.g. "b"
    marks: Optional[float] = None
    question_type: str = "UNKNOWN"                         # MCQ | SHORT | LONG | NUMERICAL
    text: str
    page: Optional[int] = None
    section: str = ""
    has_diagram: bool = False
    has_formula: bool = False
    has_graph: bool = False
    has_table: bool = False

    @property
    def reference(self) -> str:
        """Human-readable question reference, e.g. Q3(b)."""
        ref = f"Q{self.question_number}"
        if self.sub_question_number:
            ref += f"({self.sub_question_number})"
        return ref

    @property
    def full_reference(self) -> str:
        """Year + question ref, e.g. '2025 Q3(b)'."""
        return f"{self.year} {self.reference}"


# ===========================================================================
# Classification
# ===========================================================================

class ClassifiedField(BaseModel):
    """A single classified dimension with its confidence."""
    value: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class QuestionClassification(BaseModel):
    """
    Full classification of a single past-paper question.

    Every field carries an explicit confidence score.
    Low-confidence fields should be flagged for human review.
    """

    question_id: str                    # matches ExtractedQuestion id in the store

    chapter: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    topic: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    topic_id: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    concept: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    learning_objective: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value=""))
    slo_id: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    command_word: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    question_type: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="UNKNOWN"))
    difficulty: ClassifiedField = Field(default_factory=lambda: ClassifiedField(value="MEDIUM"))
    cognitive_level: ClassifiedField = Field(
        default_factory=lambda: ClassifiedField(value="UNDERSTAND")
    )  # REMEMBER | UNDERSTAND | APPLY | ANALYSE | EVALUATE | CREATE

    # Nature flags (each with confidence)
    numerical_or_conceptual: ClassifiedField = Field(
        default_factory=lambda: ClassifiedField(value="CONCEPTUAL")
    )
    formula_based: bool = False
    formula_based_confidence: float = 0.0
    diagram_based: bool = False
    diagram_based_confidence: float = 0.0
    graph_based: bool = False
    graph_based_confidence: float = 0.0
    equation_based: bool = False
    equation_based_confidence: float = 0.0

    # Flags fields that have low confidence and need review
    needs_review: list[str] = Field(default_factory=list)

    # Source of this classification
    classified_by: str = "RULE_BASED"   # "LLM" | "RULE_BASED" | "HUMAN"
    raw_llm_output: Optional[str] = None


# ===========================================================================
# Semantic relationship
# ===========================================================================

class RelationshipType(str, Enum):
    SAME_CONCEPT = "SAME_CONCEPT"
    SEMANTICALLY_EQUIVALENT = "SEMANTICALLY_EQUIVALENT"     # e.g. "rate of change of velocity" ≡ "acceleration"
    SAME_FORMULA = "SAME_FORMULA"
    SAME_NUMERICAL_METHOD = "SAME_NUMERICAL_METHOD"
    SAME_DIAGRAM_PATTERN = "SAME_DIAGRAM_PATTERN"
    RELATED_CONCEPT = "RELATED_CONCEPT"
    NOT_RELATED = "NOT_RELATED"


class SemanticRelationship(BaseModel):
    """
    An explicit, evidence-backed relationship between two questions.

    A relationship is ONLY created when:
    1. Embedding cosine similarity exceeds a configurable threshold, AND
    2. A human-readable `reason` can be articulated.

    Questions that merely sound similar but test different concepts
    are NOT linked.
    """

    question_id_a: str
    question_id_b: str
    relationship_type: RelationshipType
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str       # mandatory — must explain WHY the relationship exists
    similarity_score: float = 0.0


# ===========================================================================
# Historical statistics
# ===========================================================================

class HistoricalStats(BaseModel):
    """
    Aggregate historical statistics for a (board, class, subject, chapter,
    topic, concept) grouping.

    ALL statistics are historical observations.
    None of them constitute a prediction about future examinations.
    """

    board: str
    class_level: str
    subject: str
    chapter: str
    topic: str
    concept: str

    years_appeared: list[int] = Field(default_factory=list)
    number_of_questions: int = 0
    number_of_appearances: int = 0   # may be > number_of_questions if one q covers concept twice

    question_type_distribution: dict[str, int] = Field(default_factory=dict)
    marks_distribution: dict[str, int] = Field(default_factory=dict)   # "1"→count, "2"→count …
    difficulty_distribution: dict[str, int] = Field(default_factory=dict)

    numerical_frequency: int = 0
    diagram_frequency: int = 0
    graph_frequency: int = 0
    equation_frequency: int = 0

    last_appeared_year: Optional[int] = None
    years_since_last_appearance: Optional[int] = None

    recurring_patterns: list[str] = Field(default_factory=list)
    evidence_label: EvidenceLabel = EvidenceLabel.INSUFFICIENT_DATA

    # The raw occurrences powering this summary
    occurrences: list["ConceptOccurrence"] = Field(default_factory=list)


# ===========================================================================
# Concept occurrence (single appearance in a past paper)
# ===========================================================================

class ConceptOccurrence(BaseModel):
    """A single appearance of a concept / question in a past paper."""

    year: int
    board: str
    class_level: str
    subject: str
    chapter: str
    topic: str
    concept: str
    question_id: str
    question_number: str
    sub_question_number: str = ""
    page: Optional[int] = None
    marks: Optional[float] = None
    question_type: str = ""
    text_snippet: str = ""          # first 120 chars of question text

    @property
    def reference(self) -> str:
        ref = f"Q{self.question_number}"
        if self.sub_question_number:
            ref += f"({self.sub_question_number})"
        return ref

    @property
    def full_reference(self) -> str:
        return f"{self.year} {self.reference}"


# ===========================================================================
# Chapter report
# ===========================================================================

class ConceptHistoryEntry(BaseModel):
    """One row in a chapter report — a concept and its past-paper history."""

    concept: str
    topic: str
    occurrences: list[ConceptOccurrence]
    recurring_patterns: list[str]
    evidence_label: EvidenceLabel
    evidence_label_note: str = (
        "This label describes historical data only. "
        "It does NOT predict future examination content."
    )


class ChapterReport(BaseModel):
    """
    Full historical-analysis report for a chapter.

    IMPORTANT: This report contains historical evidence ONLY.
    It does not predict, guarantee, or suggest what will appear
    in any future examination.
    """

    board: str
    class_level: str
    subject: str
    chapter: str
    generated_at: str

    concepts: list[ConceptHistoryEntry] = Field(default_factory=list)
    total_questions: int = 0
    years_covered: list[int] = Field(default_factory=list)
    overall_evidence_label: EvidenceLabel = EvidenceLabel.INSUFFICIENT_DATA

    disclaimer: str = (
        "Historical evidence is NOT a guarantee about future examinations. "
        "Past appearance frequency does not imply future appearance."
    )


# ===========================================================================
# Search result wrappers
# ===========================================================================

class SimilarQuestion(BaseModel):
    """A question found by semantic similarity search."""
    question: ExtractedQuestion
    similarity_score: float
    relationship_type: RelationshipType
    reason: str


class PatternReport(BaseModel):
    """Summary of recurring question patterns for a chapter."""
    board: str
    subject: str
    chapter: str
    patterns: dict[str, list[ConceptOccurrence]]  # pattern_name → occurrences
    pattern_note: str = (
        "Patterns are observed from historical data only. "
        "No inference about future examinations should be drawn from these patterns."
    )
