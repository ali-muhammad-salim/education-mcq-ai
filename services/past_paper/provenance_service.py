"""
Provenance Service.

Builds ProvenanceReport objects for generated MCQs using the in-memory
PastPaperStore and HistoricalTracer.

In production this would query the database via Prisma/SQLAlchemy.
Here we provide a clean interface that the API layer can call.
"""

from __future__ import annotations

import logging
from typing import Optional

from services.past_paper.historical_tracer import (
    HistoricalTracer,
    HistoricalTraceResult,
    PastPaperEvidenceItem,
    HistoricalSummary,
)
from services.past_paper.provenance_schemas import (
    ProvenanceReport,
    PastPaperSourceRef,
    HistoricalSummaryRef,
    ValidationSummaryRef,
    CurriculumSourceRef,
    TextbookSourceRef,
)
from services.past_paper.store import PastPaperStore
from services.generation.schemas import MCQCandidate
from services.validation.schemas import FullValidationReport

logger = logging.getLogger(__name__)


class ProvenanceService:
    """
    Builds provenance reports for generated questions.
    """

    def __init__(self, store: PastPaperStore):
        self._tracer = HistoricalTracer(store)

    def build_report(
        self,
        question_id: str,
        candidate: MCQCandidate,
        validation_report: Optional[FullValidationReport] = None,
        generation_model: Optional[str] = None,
        prompt_version: Optional[str] = None,
    ) -> ProvenanceReport:
        """
        Build a complete provenance report for a generated MCQ.
        """
        # 1. Run historical tracing
        trace: HistoricalTraceResult = self._tracer.trace(candidate)

        # 2. Convert evidence items to API schema
        past_paper_sources = [
            _evidence_to_ref(e) for e in trace.pastPaperEvidence
        ]

        # 3. Convert candidate evidence (curriculum + textbook) to API schema
        curriculum_sources = [
            CurriculumSourceRef(
                curriculumId=ce.curriculumId,
                board=candidate.board,
                version="CURRENT",
                description=ce.description,
            )
            for ce in candidate.evidence.curriculumEvidence
        ]

        textbook_sources = [
            TextbookSourceRef(
                textbookId=te.textbookId,
                title=te.textbookId,  # In production: join to Book table
                evidenceText=te.description,
            )
            for te in candidate.evidence.textbookEvidence
        ]

        # 4. Validation summary
        val_summary = None
        if validation_report:
            val_summary = ValidationSummaryRef(
                overallStatus=validation_report.overall_status.value,
                answerCheck=validation_report.answer_check.status.value
                if validation_report.answer_check else None,
                faithfulnessCheck=validation_report.faithfulness_check.status.value
                if validation_report.faithfulness_check else None,
                qualityCheck=validation_report.quality_check.status.value
                if validation_report.quality_check else None,
                mathChemCheck=validation_report.math_chem_check.status.value
                if validation_report.math_chem_check else None,
                duplicateCheck=validation_report.duplicate_check.status.value
                if validation_report.duplicate_check else None,
            )

        # 5. Build historical summary
        hist = trace.summary
        hist_ref = HistoricalSummaryRef(
            yearsRelated=hist.yearsRelated,
            numberOfRelatedQuestions=hist.numberOfRelatedQuestions,
            mostRecentRelatedYear=hist.mostRecentRelatedYear,
            historicalEvidenceStrength=hist.historicalEvidenceStrength,
            relationshipDistribution=hist.relationshipDistribution,
        )

        return ProvenanceReport(
            questionId=question_id,
            textbookSources=textbook_sources,
            curriculumSources=curriculum_sources,
            pastPaperSources=past_paper_sources,
            generationModel=generation_model,
            promptVersion=prompt_version,
            validationResults=val_summary,
            reviewHistory=[],
            historicalSummary=hist_ref,
            noEvidenceMessage=trace.noEvidenceMessage,
        )


def _evidence_to_ref(e: PastPaperEvidenceItem) -> PastPaperSourceRef:
    return PastPaperSourceRef(
        year=e.year,
        board=e.board,
        questionNumber=e.questionNumber,
        subQuestionNumber=e.subQuestionNumber,
        paperId=e.paperId,
        pastPaperQuestionId=e.pastPaperQuestionId,
        relationType=e.relationType,
        evidenceStrength=e.evidenceStrength,
        reason=e.reason,
        sourceFile=e.sourceFile,
        pageNumber=e.pageNumber,
        ocrText=e.ocrText,
        verifiedText=e.verifiedText,
        boundingBox=e.boundingBox,
    )
