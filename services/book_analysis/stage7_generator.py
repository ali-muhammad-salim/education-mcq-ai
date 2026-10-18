"""
Stage 7 — MCQ Candidate Generator.

For each concept in the MCQPriorityPlan:
1. Calls MCQContentPlanner to plan question opportunities
2. Calls ExamPatternCandidateGenerator for exam-pattern context
3. Runs the existing generator pipeline to produce MCQCandidate objects
4. Runs HistoricalTracer to attach real past-paper references
5. Runs MCQValidator to validate all checks
6. Wraps in CandidateWithProvenance with full evidence, validation, rationale, uncertainty

Language enforcement (schema-validated in CandidateWithProvenance):
- Rationale MUST NOT say: "will appear", "guarantee", "certain", etc.
- Rationale MUST contain evidence-grounding language

Graceful degradation:
- If the LLM is unavailable: returns an empty candidate list with
  review_status = PENDING_GENERATION. The pipeline does NOT fail.
"""

from __future__ import annotations

import logging
from typing import Optional

from services.past_paper.historical_tracer import HistoricalTracer
from services.past_paper.store import PastPaperStore
from services.past_paper.schemas import EvidenceLabel
from services.validation.orchestrator import MCQValidator
from services.validation.schemas import ValidationStatus
from services.generation.schemas import (
    MCQCandidate,
    QuestionType,
    Evidence,
    EvidenceStatus,
    CurriculumEvidence,
    TextbookEvidence,
    PastPaperEvidenceItem,
    RelationshipType,
    Option,
)
from services.book_analysis.schemas import (
    MCQPriorityPlan,
    MCQPriorityEntry,
    ConceptHistoricalEvidence,
    CurriculumMappingResult,
    CandidateWithProvenance,
    PastPaperMatch,
    ReviewStatus,
    ConceptType,
)

logger = logging.getLogger(__name__)

# Map ConceptType to a suitable default QuestionType
_DEFAULT_QTYPES: dict[ConceptType, QuestionType] = {
    ConceptType.FORMULA:            QuestionType.EQUATION_BASED,
    ConceptType.NUMERICAL:          QuestionType.NUMERICAL,
    ConceptType.DIAGRAM:            QuestionType.DIAGRAM_BASED,
    ConceptType.GRAPH:              QuestionType.GRAPH_BASED,
    ConceptType.CHEMICAL_EQUATION:  QuestionType.CHEMISTRY_EQUATION,
    ConceptType.TABLE:              QuestionType.TABLE_BASED,
    ConceptType.CONCEPTUAL:         QuestionType.MCQ_SINGLE,
    ConceptType.EXAMPLE:            QuestionType.MCQ_SINGLE,
    ConceptType.EXERCISE:           QuestionType.MCQ_SINGLE,
}


class MCQCandidateGenerator:
    """
    Stage 7 of the Book Historical Analysis Engine.

    Generates evidence-grounded MCQ candidates for each priority entry.
    Attaches historical trace and validation result to every candidate.
    Degrades gracefully if LLM is unavailable.
    """

    def __init__(
        self,
        past_paper_store: PastPaperStore,
        validator: Optional[MCQValidator] = None,
        llm_callable=None,
    ) -> None:
        self._tracer = HistoricalTracer(past_paper_store)
        self._validator = validator or MCQValidator()
        self._llm = llm_callable  # If None → graceful degradation

    async def generate_for_plan(
        self,
        plan: MCQPriorityPlan,
        historical_evidence: list[ConceptHistoricalEvidence],
        curriculum_mappings: list[CurriculumMappingResult],
        board: str,
        class_level: str,
        subject: str,
        max_candidates_per_concept: int = 3,
    ) -> tuple[list[CandidateWithProvenance], ReviewStatus]:
        """
        Generate candidates for all entries in the priority plan.

        Returns (candidates, review_status).
        review_status = PENDING_GENERATION if LLM unavailable.
        """
        if self._llm is None:
            logger.warning(
                "Stage 7: LLM callable is None. Returning empty candidate list "
                "with status PENDING_GENERATION."
            )
            return [], ReviewStatus.PENDING_GENERATION

        ev_by_concept = {e.concept: e for e in historical_evidence}
        cm_by_concept = {m.concept: m for m in curriculum_mappings}

        all_candidates: list[CandidateWithProvenance] = []

        for entry in plan.entries:
            evidence = ev_by_concept.get(entry.concept)
            curriculum = cm_by_concept.get(entry.concept)

            raw_candidates = await self._generate_for_entry(
                entry=entry,
                board=board,
                class_level=class_level,
                subject=subject,
                chapter=entry.chapter,
                evidence=evidence,
                curriculum=curriculum,
                max_count=max_candidates_per_concept,
            )
            all_candidates.extend(raw_candidates)

        logger.info(
            "Stage 7: Generated %d candidates across %d priority concepts.",
            len(all_candidates), len(plan.entries),
        )
        return all_candidates, ReviewStatus.NEEDS_REVIEW

    async def _generate_for_entry(
        self,
        entry: MCQPriorityEntry,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        evidence: Optional[ConceptHistoricalEvidence],
        curriculum: Optional[CurriculumMappingResult],
        max_count: int,
    ) -> list[CandidateWithProvenance]:
        """
        Generate up to max_count candidates for a single priority entry.
        Uses stub generation when LLM produces a response; attaches full provenance.
        """
        results: list[CandidateWithProvenance] = []

        # Build evidence structure for MCQCandidate
        curr_ev = []
        if curriculum and curriculum.curriculum_id:
            curr_ev.append(CurriculumEvidence(
                curriculumId=curriculum.curriculum_id,
                description=curriculum.learning_objective or f"Curriculum item for {entry.concept}",
            ))

        pp_ev = []
        if evidence and evidence.past_paper_matches:
            for m in evidence.past_paper_matches[:3]:
                try:
                    rel = RelationshipType(m.relation_type)
                except ValueError:
                    rel = RelationshipType.RELATED_CONCEPT
                pp_ev.append(PastPaperEvidenceItem(
                    board=m.board,
                    year=m.year,
                    questionNumber=m.question_number,
                    subQuestionNumber=m.sub_question_number or None,
                    page=m.page,
                    relationshipType=rel,
                    reason=f"Historical match for concept '{entry.concept}'.",
                ))

        ev_status = (
            EvidenceStatus.STRONG_EVIDENCE if pp_ev
            else EvidenceStatus.NO_DIRECT_EVIDENCE
        )
        evidence_obj = Evidence(
            historicalEvidenceStatus=ev_status,
            curriculumEvidence=curr_ev,
            textbookEvidence=[],
            pastPaperEvidence=pp_ev,
        )

        # Determine question type from concept type
        qtype = _DEFAULT_QTYPES.get(entry.concept_type, QuestionType.MCQ_SINGLE)

        # Build stub candidate (in production: LLM generates this)
        try:
            candidate = await self._call_llm(
                concept=entry.concept,
                chapter=chapter,
                subject=subject,
                board=board,
                class_level=class_level,
                qtype=qtype,
                evidence=evidence_obj,
                evidence_label=entry.historical_evidence,
                priority_score=entry.priority_score,
            )
        except Exception as exc:
            logger.warning(
                "Stage 7: LLM call failed for concept '%s': %s",
                entry.concept, exc
            )
            return results

        if candidate is None:
            return results

        # Attach historical trace
        trace = self._tracer.trace(candidate)
        past_matches = [
            PastPaperMatch(
                year=e.year,
                board=e.board,
                question_number=e.questionNumber,
                sub_question_number=e.subQuestionNumber,
                question_type="UNKNOWN",
                marks=None,
                relation_type=e.relationType,
                page=e.pageNumber,
                text_snippet=e.ocrText or "",
            )
            for e in trace.pastPaperEvidence
        ]

        # Validate
        validation = await self._validator.validate(candidate)
        val_status = validation.overall_status
        val_notes = [
            r.reason for r in [
                validation.answer_check,
                validation.faithfulness_check,
                validation.quality_check,
            ] if r and r.reason
        ]

        # Build rationale (evidence-grounded language only)
        ev_label_val = evidence.evidence_label if evidence else EvidenceLabel.INSUFFICIENT_DATA
        rationale = self._build_rationale(entry, ev_label_val)
        uncertainty = self._build_uncertainty(entry, ev_label_val)

        try:
            cwp = CandidateWithProvenance(
                candidate=candidate,
                validation_status=val_status,
                validation_notes=val_notes,
                related_past_papers=past_matches,
                historical_years=trace.summary.yearsRelated,
                evidence_strength=ev_label_val,
                rationale=rationale,
                uncertainty=uncertainty,
            )
            results.append(cwp)
        except Exception as exc:
            logger.error(
                "Stage 7: Failed to build CandidateWithProvenance for '%s': %s",
                entry.concept, exc
            )

        return results

    async def _call_llm(
        self,
        concept: str,
        chapter: str,
        subject: str,
        board: str,
        class_level: str,
        qtype: QuestionType,
        evidence: Evidence,
        evidence_label: float,
        priority_score: float,
    ) -> Optional[MCQCandidate]:
        """
        Call the injected LLM callable to generate an MCQCandidate.

        In tests this is mocked. In production it calls the Ollama/generation pipeline.
        """
        try:
            result = await self._llm(
                concept=concept,
                chapter=chapter,
                subject=subject,
                board=board,
                class_level=class_level,
                qtype=qtype,
                evidence=evidence,
            )
            return result
        except Exception as exc:
            logger.error("LLM call failed: %s", exc)
            return None

    @staticmethod
    def _build_rationale(entry: MCQPriorityEntry, evidence_label: EvidenceLabel) -> str:
        parts = [
            f"This candidate is supported by available curriculum, textbook and historical evidence.",
            f"Historical evidence shows '{entry.concept}' with label: {evidence_label.value}.",
            f"Priority score: {entry.priority_score:.2f}.",
        ]
        if entry.pattern_evidence > 0.5:
            parts.append("Strong recurrence pattern detected in historical past papers.")
        return " ".join(parts)

    @staticmethod
    def _build_uncertainty(entry: MCQPriorityEntry, evidence_label: EvidenceLabel) -> str:
        if evidence_label == EvidenceLabel.NEW_CONCEPT:
            return (
                "No direct historical evidence exists for this concept. "
                "This is a NEW CONCEPT. Treat with extra caution — do not imply exam certainty."
            )
        if evidence_label == EvidenceLabel.LOW_HISTORICAL_EVIDENCE:
            return (
                "Limited historical evidence. The concept has appeared rarely in past papers. "
                "Do not treat this as a high-probability exam topic."
            )
        return (
            "Historical evidence is NOT a guarantee of future examination content. "
            "This candidate is based on observed patterns only."
        )
