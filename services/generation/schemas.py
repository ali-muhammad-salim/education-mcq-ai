"""
Pydantic schemas for the MCQ Generation Engine.

Enforces strict validation of all LLM outputs before they can be staged
in the database. This ensures evidence grounding and structural integrity.
"""

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class QuestionType(str, Enum):
    """Corresponds to the database QuestionType enum."""
    MCQ_SINGLE = "MCQ_SINGLE"
    MCQ_MULTIPLE = "MCQ_MULTIPLE"
    TRUE_FALSE = "TRUE_FALSE"
    ASSERTION_REASON = "ASSERTION_REASON"
    STATEMENT_BASED = "STATEMENT_BASED"
    NEGATIVE_STEM = "NEGATIVE_STEM"
    IMAGE_BASED = "IMAGE_BASED"
    DIAGRAM_BASED = "DIAGRAM_BASED"
    GRAPH_BASED = "GRAPH_BASED"
    TABLE_BASED = "TABLE_BASED"
    EQUATION_BASED = "EQUATION_BASED"
    NUMERICAL = "NUMERICAL"
    CASE_BASED = "CASE_BASED"
    PASSAGE_BASED = "PASSAGE_BASED"
    MATCHING = "MATCHING"
    SEQUENCE = "SEQUENCE"
    CLASSIFICATION = "CLASSIFICATION"
    CHEMISTRY_EQUATION = "CHEMISTRY_EQUATION"
    SCIENTIFIC_FIGURE = "SCIENTIFIC_FIGURE"


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class CognitiveLevel(str, Enum):
    KNOWLEDGE = "KNOWLEDGE"
    COMPREHENSION = "COMPREHENSION"
    APPLICATION = "APPLICATION"
    ANALYSIS = "ANALYSIS"
    SYNTHESIS = "SYNTHESIS"
    EVALUATION = "EVALUATION"


class RelationshipType(str, Enum):
    DIRECT_CONCEPT = "DIRECT_CONCEPT"
    SAME_CONCEPT = "SAME_CONCEPT"
    SAME_PATTERN = "SAME_PATTERN"
    SAME_FORMULA = "SAME_FORMULA"
    SAME_NUMERICAL_METHOD = "SAME_NUMERICAL_METHOD"
    SAME_DIAGRAM_PATTERN = "SAME_DIAGRAM_PATTERN"
    RELATED_CONCEPT = "RELATED_CONCEPT"
    SEMANTICALLY_SIMILAR = "SEMANTICALLY_SIMILAR"


class EvidenceStatus(str, Enum):
    STRONG_EVIDENCE = "STRONG_EVIDENCE"
    MODERATE_EVIDENCE = "MODERATE_EVIDENCE"
    WEAK_EVIDENCE = "WEAK_EVIDENCE"
    NO_DIRECT_EVIDENCE = "NO_DIRECT_EVIDENCE"


# ---------------------------------------------------------------------------
# Evidence Schemas
# ---------------------------------------------------------------------------

class CurriculumEvidence(BaseModel):
    curriculumId: str = Field(description="ID of the curriculum item")
    description: str = Field(description="Description of what this curriculum mandates")


class TextbookEvidence(BaseModel):
    textbookId: str = Field(description="ID of the textbook mapping")
    description: str = Field(description="How this textbook supports the question")


class PastPaperEvidenceItem(BaseModel):
    board: str
    year: int
    paper: Optional[str] = None
    questionNumber: str
    subQuestionNumber: Optional[str] = None
    page: Optional[int] = None
    relationshipType: RelationshipType
    reason: str = Field(description="Explanation of how this past paper relates to the generated question")


class Evidence(BaseModel):
    """The complete evidence backing a generated question."""
    historicalEvidenceStatus: EvidenceStatus
    curriculumEvidence: List[CurriculumEvidence]
    textbookEvidence: List[TextbookEvidence]
    pastPaperEvidence: List[PastPaperEvidenceItem]

    @field_validator("pastPaperEvidence")
    @classmethod
    def check_past_paper_status(cls, v: List[PastPaperEvidenceItem], info: Any) -> List[PastPaperEvidenceItem]:
        # Pydantic v2: use info.data to access previously validated fields
        status = info.data.get("historicalEvidenceStatus")
        if status == EvidenceStatus.NO_DIRECT_EVIDENCE and len(v) > 0:
            raise ValueError("NO_DIRECT_EVIDENCE must have an empty pastPaperEvidence list")
        if status != EvidenceStatus.NO_DIRECT_EVIDENCE and len(v) == 0:
            raise ValueError(f"Status {status} requires at least one item in pastPaperEvidence")
        return v


# ---------------------------------------------------------------------------
# Question Schemas
# ---------------------------------------------------------------------------

class Option(BaseModel):
    text: str
    isCorrect: bool


class MCQCandidate(BaseModel):
    """
    A generated MCQ candidate that must pass validation before staging.
    """
    question: str
    options: List[Option]
    correctAnswer: str
    explanation: str

    board: str
    class_level: str = Field(alias="class")
    subject: str
    chapter: str
    topic: str
    concept: str
    learningObjective: str
    
    difficulty: Difficulty
    cognitiveLevel: CognitiveLevel
    questionType: QuestionType
    contentMode: str = Field(description="E.g. TEXT, IMAGE, LATEX")

    evidence: Evidence

    # Reason why the LLM decided to generate this question, based on planner
    generationRationale: str

    @field_validator("options")
    @classmethod
    def check_options(cls, v: List[Option]) -> List[Option]:
        if len(v) < 2:
            raise ValueError("MCQ must have at least 2 options")
        correct_count = sum(1 for opt in v if opt.isCorrect)
        if correct_count == 0:
            raise ValueError("MCQ must have at least 1 correct option")
        return v


# ---------------------------------------------------------------------------
# Planner & Candidate Schemas
# ---------------------------------------------------------------------------

class QuestionOpportunity(BaseModel):
    """A specific opportunity for a question identified by the planner."""
    concept: str
    questionType: QuestionType
    cognitiveLevel: CognitiveLevel
    rationale: str = Field(description="Why this question is needed (e.g. historical pattern, numerical opportunity)")
    relatedPastPaperIds: List[str] = Field(default_factory=list)


class ContentPlan(BaseModel):
    """
    Output of the MCQContentPlanner. Not a list of questions, but a plan
    of what *should* be generated based on evidence.
    """
    board: str
    subject: str
    chapter: str
    coreConcepts: List[str]
    prerequisiteConcepts: List[str]
    historicallyRepresentedConcepts: List[str]
    
    # Specific opportunities to fulfill
    opportunities: List[QuestionOpportunity]

    # Global analysis
    questionPatternsDetected: List[str]
    misconceptionsToTarget: List[str]


class ExamPatternCandidate(BaseModel):
    """
    Output of the ExamPatternCandidateGenerator.
    Identifies high-value candidates without guaranteeing exam appearance.
    """
    concept: str
    historicalEvidence: EvidenceStatus
    supportingSources: List[str] = Field(description="List of source IDs or descriptions")
    relatedPastPaperQuestions: List[str] = Field(description="IDs of related past paper questions")
    rationale: str = Field(description="Why this is a high-value candidate")
    uncertainty: str = Field(description="What is uncertain about this candidate")
    suggestedQuestionType: QuestionType

    @field_validator("rationale")
    @classmethod
    def check_no_guarantees(cls, v: str) -> str:
        forbidden = ["will come", "guarantee", "certain to appear", "100%", "definitely"]
        v_lower = v.lower()
        if any(f in v_lower for f in forbidden):
            raise ValueError("Rationale contains forbidden predictive language.")
        return v
