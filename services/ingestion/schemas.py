"""
Pydantic v2 schemas for the Document Intelligence Pipeline.

These are the canonical, validated Python data structures that flow through
every stage of the pipeline.  The final `StructuredPage` is what gets
persisted to the database.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


# ===========================================================================
# Primitives
# ===========================================================================

class BoundingBox(BaseModel):
    """Pixel-space bounding box [x0, y0, x1, y1] (top-left origin)."""

    x0: float
    y0: float
    x1: float
    y1: float

    @classmethod
    def from_list(cls, coords: list[float]) -> "BoundingBox":
        if len(coords) == 4:
            return cls(x0=coords[0], y0=coords[1], x1=coords[2], y1=coords[3])
        if len(coords) == 8:
            # PaddleOCR quad: [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]
            xs = [coords[i] for i in range(0, 8, 2)]
            ys = [coords[i] for i in range(1, 8, 2)]
            return cls(x0=min(xs), y0=min(ys), x1=max(xs), y1=max(ys))
        raise ValueError(f"Cannot parse bbox from {coords}")

    @classmethod
    def from_quad(cls, quad: list[list[float]]) -> "BoundingBox":
        """Accept PaddleOCR 4-point quad [[x,y], ...]."""
        xs = [p[0] for p in quad]
        ys = [p[1] for p in quad]
        return cls(x0=min(xs), y0=min(ys), x1=max(xs), y1=max(ys))

    def to_list(self) -> list[float]:
        return [self.x0, self.y0, self.x1, self.y1]

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0

    @property
    def area(self) -> float:
        return self.width * self.height


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NEEDS_REVIEW = "NEEDS_REVIEW"


def classify_confidence(score: float) -> ConfidenceLevel:
    """Map a float confidence score to a categorical level."""
    if score >= 0.90:
        return ConfidenceLevel.HIGH
    if score >= 0.75:
        return ConfidenceLevel.MEDIUM
    if score >= 0.60:
        return ConfidenceLevel.LOW
    return ConfidenceLevel.NEEDS_REVIEW


class RegionType(str, Enum):
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    LIST = "list"
    TABLE = "table"
    FIGURE = "figure"
    FORMULA = "formula"
    CAPTION = "caption"
    QUESTION = "question"
    MCQ_OPTION = "mcq_option"
    PAGE_NUMBER = "page_number"
    HEADER = "header"
    FOOTER = "footer"
    CHEMICAL_EQUATION = "chemical_equation"
    UNKNOWN = "unknown"


class DocumentType(str, Enum):
    BOOK = "BOOK"
    PAST_PAPER = "PAST_PAPER"
    CURRICULUM = "CURRICULUM"
    MODEL_PAPER = "MODEL_PAPER"


# ===========================================================================
# Region schemas
# ===========================================================================

class PageRegion(BaseModel):
    """
    A single detected and classified region on a page.

    All region types share this base.  Specialised regions (formulas, diagrams,
    tables, questions) extend it with extra fields.
    """

    region_id: str = Field(description="Unique ID within the page (e.g. p3_r7)")
    type: RegionType
    bbox: BoundingBox
    text: str = ""
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    confidence_level: ConfidenceLevel = ConfidenceLevel.NEEDS_REVIEW
    vision_used: bool = False                    # True if vision fallback was called
    raw_ocr: Optional[dict[str, Any]] = None    # raw PaddleOCR output (debug)

    @model_validator(mode="after")
    def _derive_confidence_level(self) -> "PageRegion":
        if self.confidence_level == ConfidenceLevel.NEEDS_REVIEW:
            self.confidence_level = classify_confidence(self.confidence)
        return self


class FormulaRegion(PageRegion):
    """
    Mathematical formula / equation.

    Stores both the OCR-extracted display form and the normalised LaTeX.
    If SymPy can parse the expression, `normalized_form` contains the
    canonical SymPy string representation.
    """

    type: RegionType = RegionType.FORMULA
    latex: str = ""
    display_form: str = ""
    normalized_form: str = ""               # SymPy canonical, or "" if unparseable
    is_inline: bool = False                 # True for inline $...$ formulas


class ChemicalEquation(PageRegion):
    """
    Chemical equation region.

    Preserves subscripts, coefficients, reaction arrows, and state symbols
    exactly as detected.  Never modified/normalised by SymPy.
    """

    type: RegionType = RegionType.CHEMICAL_EQUATION
    display: str = ""
    normalized: str = ""                    # e.g. "2H2 + O2 -> 2H2O"
    coefficients: list[str] = []
    arrow: str = "→"
    state_symbols: list[str] = []           # (g), (l), (aq), (s)


class DiagramRegion(PageRegion):
    """
    Figure or diagram extracted from the page.

    `media_path` points to the saved cropped image on disk.
    `description` is generated by the vision model (only if triggered).
    """

    type: RegionType = RegionType.FIGURE
    media_path: Optional[str] = None        # relative path to saved PNG
    media_id: Optional[str] = None          # DB id once stored
    caption: str = ""
    detected_labels: list[str] = []         # text labels detected inside diagram
    description: str = ""                   # vision model semantic description
    associated_concept: str = ""


class TableData(BaseModel):
    """Parsed table content."""

    headers: list[str] = []
    rows: list[list[str]] = []
    markdown: str = ""
    html: str = ""


class TableRegionSchema(PageRegion):
    """Table region with parsed structure."""

    type: RegionType = RegionType.TABLE
    table_data: Optional[TableData] = None


class MCQOption(BaseModel):
    """A single multiple-choice option (A, B, C, D …)."""

    label: str           # e.g. "A"
    text: str
    bbox: Optional[BoundingBox] = None


class QuestionRegion(PageRegion):
    """
    A detected past-paper question.

    Retains exact source linkage: section, question number, sub-question,
    marks, page, and bounding region.
    """

    type: RegionType = RegionType.QUESTION
    question_type: Optional[str] = None     # e.g., "MCQ", "CRQ", "ERQ"
    syllabus_version_id: Optional[str] = None
    question_number: str = ""               # e.g. "3"
    sub_question_number: str = ""           # e.g. "b"
    section: str = ""                       # e.g. "Section B"
    marks: Optional[float] = None
    question_text: str = ""
    options: list[MCQOption] = []
    answer_space_y0: Optional[float] = None
    answer_space_y1: Optional[float] = None
    has_diagram: bool = False
    has_formula: bool = False
    has_table: bool = False


# ===========================================================================
# Page-level schema
# ===========================================================================

class ConfidenceSummary(BaseModel):
    high: int = 0
    medium: int = 0
    low: int = 0
    needs_review: int = 0
    total: int = 0
    vision_calls: int = 0


class StructuredPage(BaseModel):
    """
    Complete structured representation of a single document page.

    This is the output contract of the pipeline for one page.
    """

    page_number: int
    image_path: Optional[str] = None        # rendered page PNG path
    width: Optional[int] = None
    height: Optional[int] = None
    orientation_angle: float = 0.0          # degrees correction applied

    regions: list[PageRegion] = []          # all regions in reading order

    # Typed shortcut lists (subsets of `regions`)
    formulas: list[FormulaRegion] = []
    chemical_equations: list[ChemicalEquation] = []
    diagrams: list[DiagramRegion] = []
    tables: list[TableRegionSchema] = []
    questions: list[QuestionRegion] = []

    confidence_summary: ConfidenceSummary = Field(default_factory=ConfidenceSummary)
    processing_time_ms: float = 0.0


# ===========================================================================
# Document-level schema
# ===========================================================================

class IngestionResult(BaseModel):
    """
    Top-level result returned after processing an entire document.
    Used by the CLI to render the summary table.
    """

    file_path: str
    doc_type: DocumentType
    sha256: str
    total_pages: int
    pages_processed: int
    doc_id: Optional[str] = None            # DB id once persisted
    pages: list[StructuredPage] = []

    # Aggregate counters
    total_regions: int = 0
    total_equations: int = 0
    total_chemical_equations: int = 0
    total_diagrams: int = 0
    total_tables: int = 0
    total_questions: int = 0
    low_confidence_regions: list[dict[str, Any]] = []   # {page, region_id, type, confidence}
    vision_fallback_pages: list[int] = []

    processing_time_seconds: float = 0.0
    errors: list[dict[str, Any]] = []


# ===========================================================================
# Curriculum Extraction Schemas
# ===========================================================================

class SectionSpecification(BaseModel):
    name: str = ""
    type: str = ""
    count: int = 0
    marksEach: float = 0.0

class ExamSpecification(BaseModel):
    paperCode: str = ""
    durationMin: int = 0
    totalMarks: float = 0
    sections: list[SectionSpecification] = []
    cognitiveSplit: dict[str, int] = {}

class SLOExtraction(BaseModel):
    sloCode: str = ""
    description: str
    commandWords: list[str] = []
    cognitiveLevel: str = ""
    practical: bool = False

class SubtopicExtraction(BaseModel):
    name: str
    subtopicNumber: str = ""
    slos: list[SLOExtraction] = []

class TopicExtraction(BaseModel):
    name: str
    topicNumber: str = ""
    subtopics: list[SubtopicExtraction] = []

class CurriculumExtraction(BaseModel):
    exam_specification: Optional[ExamSpecification] = None
    topics: list[TopicExtraction] = []
