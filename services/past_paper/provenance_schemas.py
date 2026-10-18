"""
Provenance Report Schemas.

Defines the ProvenanceReport returned by GET /questions/{id}/provenance.
All fields are typed and validated. No invented data.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class TextbookSourceRef(BaseModel):
    textbookId: str
    title: str
    chapter: Optional[str] = None
    pageNumber: Optional[int] = None
    evidenceText: str


class CurriculumSourceRef(BaseModel):
    curriculumId: str
    board: str
    version: str
    description: str


class PastPaperSourceRef(BaseModel):
    year: int
    board: str
    questionNumber: str
    subQuestionNumber: str = ""
    paperId: str
    pastPaperQuestionId: str
    relationType: str
    evidenceStrength: str
    reason: str
    sourceFile: Optional[str] = None
    pageNumber: Optional[int] = None
    ocrText: Optional[str] = None
    verifiedText: Optional[str] = None
    boundingBox: Optional[dict] = None


class ValidationSummaryRef(BaseModel):
    overallStatus: str
    answerCheck: Optional[str] = None
    faithfulnessCheck: Optional[str] = None
    qualityCheck: Optional[str] = None
    mathChemCheck: Optional[str] = None
    duplicateCheck: Optional[str] = None


class ReviewHistoryEntry(BaseModel):
    reviewerId: Optional[str] = None
    decision: str
    comment: Optional[str] = None
    reviewedAt: str


class HistoricalSummaryRef(BaseModel):
    yearsRelated: list[int] = Field(default_factory=list)
    numberOfRelatedQuestions: int = 0
    mostRecentRelatedYear: Optional[int] = None
    historicalEvidenceStrength: str = "NONE"
    relationshipDistribution: dict[str, int] = Field(default_factory=dict)


class ProvenanceReport(BaseModel):
    """
    Full provenance report for a generated MCQ.
    Returned by GET /questions/{id}/provenance.
    """
    questionId: str

    # Sources
    textbookSources: list[TextbookSourceRef] = Field(default_factory=list)
    curriculumSources: list[CurriculumSourceRef] = Field(default_factory=list)
    pastPaperSources: list[PastPaperSourceRef] = Field(default_factory=list)

    # Generation provenance
    generationModel: Optional[str] = None
    promptVersion: Optional[str] = None

    # Validation
    validationResults: Optional[ValidationSummaryRef] = None

    # Review history
    reviewHistory: list[ReviewHistoryEntry] = Field(default_factory=list)

    # Historical summary
    historicalSummary: HistoricalSummaryRef = Field(default_factory=HistoricalSummaryRef)

    # Human readable message when no past paper evidence exists
    noEvidenceMessage: Optional[str] = None
