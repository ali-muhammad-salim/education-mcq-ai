"""
Historical Traceability for Generated MCQs.

When an MCQ is generated, this module automatically searches all available
verified past papers for related historical questions and establishes typed
database relationships (QuestionPastPaperReference).

Relationship types are granular — never collapsed into a generic "similar" label.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from services.past_paper.schemas import (
    ConceptOccurrence,
    ExtractedQuestion,
    RelationshipType,
    SimilarQuestion,
)
from services.past_paper.search import PastPaperSearch
from services.past_paper.store import PastPaperStore
from services.generation.schemas import MCQCandidate, QuestionType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Evidence strength
# ---------------------------------------------------------------------------

class EvidenceStrength(str, Enum):
    HIGH = "HIGH"       # ≥3 related past-paper questions found
    MEDIUM = "MEDIUM"   # 1-2 related past-paper questions found
    LOW = "LOW"         # Only semantically similar (no direct concept match)
    NONE = "NONE"       # No related past-paper question found


# ---------------------------------------------------------------------------
# Resolved relationship (one entry per past-paper question found)
# ---------------------------------------------------------------------------

@dataclass
class PastPaperEvidenceItem:
    """
    Represents ONE past-paper reference for a generated MCQ.
    This becomes a QuestionPastPaperReference row in the database.
    """
    year: int
    board: str
    questionNumber: str
    subQuestionNumber: str
    paperId: str
    pastPaperQuestionId: str
    relationType: str              # One of the RelationshipType enum values
    evidenceStrength: str          # EvidenceStrength value
    reason: str                    # Mandatory explanation

    # Exact source fields for click-through navigation
    sourceFile: Optional[str] = None
    pageNumber: Optional[int] = None
    ocrText: Optional[str] = None     # OCR-extracted text
    verifiedText: Optional[str] = None
    boundingBox: Optional[dict] = None

    def display(self) -> str:
        ref = f"Q{self.questionNumber}"
        if self.subQuestionNumber:
            ref += f"({self.subQuestionNumber})"
        return f"{self.board} {self.year} — {ref}"


# ---------------------------------------------------------------------------
# Summary computed from all found references
# ---------------------------------------------------------------------------

@dataclass
class HistoricalSummary:
    """
    Derived from actual PastPaperQuestion records — never invented.
    """
    yearsRelated: list[int] = field(default_factory=list)
    numberOfRelatedQuestions: int = 0
    mostRecentRelatedYear: Optional[int] = None
    historicalEvidenceStrength: str = EvidenceStrength.NONE
    relationshipDistribution: dict[str, int] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Full traceability result
# ---------------------------------------------------------------------------

@dataclass
class HistoricalTraceResult:
    """
    The complete historical traceability result for a generated MCQ.
    """
    pastPaperEvidence: list[PastPaperEvidenceItem] = field(default_factory=list)
    summary: HistoricalSummary = field(default_factory=HistoricalSummary)
    noEvidenceMessage: Optional[str] = None


# ---------------------------------------------------------------------------
# The Tracer
# ---------------------------------------------------------------------------

class HistoricalTracer:
    """
    Automatically searches all available verified past papers for a generated
    MCQ candidate and builds a typed HistoricalTraceResult.

    This is called immediately after generation, before validation.
    """

    def __init__(self, store: PastPaperStore):
        self._store = store
        self._search = PastPaperSearch(store)

    def trace(self, candidate: MCQCandidate) -> HistoricalTraceResult:
        """
        Search all past papers for related questions and return a complete
        HistoricalTraceResult with real database relationships.
        """
        evidence: list[PastPaperEvidenceItem] = []

        # ---- Step 1: Direct concept match ----
        concept_occurrences = self._search.findPastQuestionsForConcept(
            concept=candidate.concept,
            board=candidate.board,
            class_level=candidate.class_level,
            subject=candidate.subject,
        )
        for occ in concept_occurrences:
            rel_type = self._classify_relation(candidate, occ)
            evidence.append(PastPaperEvidenceItem(
                year=occ.year,
                board=occ.board,
                questionNumber=occ.question_number,
                subQuestionNumber=occ.sub_question_number or "",
                paperId=occ.question_id,  # paper_id via store lookup
                pastPaperQuestionId=occ.question_id,
                relationType=rel_type,
                evidenceStrength=EvidenceStrength.HIGH,
                reason=f"Tests the same concept of '{candidate.concept}'. "
                       f"Appeared in {occ.board} {occ.year} as {occ.reference}.",
                pageNumber=occ.page,
                ocrText=occ.text_snippet,
            ))

        # ---- Step 2: Semantic similarity fallback ----
        if len(evidence) < 5:
            similar = self._search.findSimilarPastQuestions(
                question_text=candidate.question,
                top_k=5,
                min_similarity=0.55,
            )
            existing_ids = {e.pastPaperQuestionId for e in evidence}
            for sim in similar:
                qid = self._qid_for_question(sim.question)
                if not qid or qid in existing_ids:
                    continue
                strength = (
                    EvidenceStrength.MEDIUM
                    if sim.similarity_score >= 0.70
                    else EvidenceStrength.LOW
                )
                evidence.append(PastPaperEvidenceItem(
                    year=sim.question.year,
                    board=sim.question.board,
                    questionNumber=sim.question.question_number,
                    subQuestionNumber=sim.question.sub_question_number or "",
                    paperId=sim.question.paper_id,
                    pastPaperQuestionId=qid,
                    relationType=sim.relationship_type.value,
                    evidenceStrength=strength,
                    reason=sim.reason,
                    pageNumber=sim.question.page,
                    ocrText=sim.question.text[:200],
                ))
                existing_ids.add(qid)

        # Sort by year descending
        evidence.sort(key=lambda e: e.year, reverse=True)

        # ---- Build Summary ----
        summary = self._build_summary(evidence)

        # ---- No evidence message ----
        no_evidence_msg = None
        if not evidence:
            no_evidence_msg = (
                "No verified related past-paper question found for this concept "
                f"({candidate.concept}) in the available {candidate.board} "
                f"Class {candidate.class_level} {candidate.subject} past papers."
            )

        result = HistoricalTraceResult(
            pastPaperEvidence=evidence,
            summary=summary,
            noEvidenceMessage=no_evidence_msg,
        )

        logger.info(
            "HistoricalTracer: Found %d related past-paper questions for concept '%s'. "
            "Strength: %s",
            len(evidence), candidate.concept, summary.historicalEvidenceStrength
        )
        return result

    def _classify_relation(
        self,
        candidate: MCQCandidate,
        occurrence: ConceptOccurrence,
    ) -> str:
        """
        Determine the most specific relationship type for a concept match.
        Never collapses to a generic label when a more specific one applies.
        """
        if candidate.questionType in (QuestionType.NUMERICAL, QuestionType.EQUATION_BASED):
            if occurrence.question_type in ("NUMERICAL", "EQUATION_BASED"):
                return RelationshipType.SAME_NUMERICAL_METHOD.value
            return RelationshipType.SAME_FORMULA.value

        if candidate.questionType in (QuestionType.DIAGRAM_BASED, QuestionType.IMAGE_BASED):
            return RelationshipType.SAME_DIAGRAM_PATTERN.value

        if candidate.questionType == QuestionType.GRAPH_BASED:
            return "SAME_GRAPH_PATTERN"

        if candidate.concept.lower() == occurrence.concept.lower():
            return RelationshipType.SAME_CONCEPT.value

        return RelationshipType.RELATED_CONCEPT.value

    def _qid_for_question(self, question: ExtractedQuestion) -> Optional[str]:
        """Reverse-lookup the question ID from the store."""
        for qid, q in self._store._questions.items():
            if q is question:
                return qid
        return None

    def _build_summary(self, evidence: list[PastPaperEvidenceItem]) -> HistoricalSummary:
        if not evidence:
            return HistoricalSummary()

        years = sorted({e.year for e in evidence}, reverse=True)
        rel_dist: dict[str, int] = {}
        for e in evidence:
            rel_dist[e.relationType] = rel_dist.get(e.relationType, 0) + 1

        count = len(evidence)
        strength = (
            EvidenceStrength.HIGH if count >= 3
            else EvidenceStrength.MEDIUM if count >= 1
            else EvidenceStrength.NONE
        )

        return HistoricalSummary(
            yearsRelated=years,
            numberOfRelatedQuestions=count,
            mostRecentRelatedYear=years[0] if years else None,
            historicalEvidenceStrength=strength,
            relationshipDistribution=rel_dist,
        )
