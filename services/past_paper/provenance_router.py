"""
Provenance API Router.

GET /questions/{id}/provenance
    Returns the complete provenance report for a generated MCQ, including:
    - Textbook sources
    - Curriculum sources
    - Past-paper sources (real relationships, not invented)
    - Generation model + prompt version
    - Validation results
    - Review history
    - Historical summary statistics

This module is mounted on the main FastAPI app.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from services.past_paper.provenance_schemas import ProvenanceReport

router = APIRouter(prefix="/questions", tags=["Provenance"])

# ---------------------------------------------------------------------------
# Dependency injection: in production, wire the ProvenanceService via FastAPI
# Depends() mechanism or app state. Here we use a module-level singleton for
# simplicity while keeping the interface clean.
# ---------------------------------------------------------------------------

_provenance_service = None


def configure(provenance_service) -> None:
    """Call this at app startup with a configured ProvenanceService."""
    global _provenance_service
    _provenance_service = provenance_service


def _get_service():
    if _provenance_service is None:
        raise HTTPException(
            status_code=503,
            detail="ProvenanceService is not configured. Check server startup."
        )
    return _provenance_service


@router.get(
    "/{question_id}/provenance",
    response_model=ProvenanceReport,
    summary="Get full provenance report for a generated MCQ",
    description=(
        "Returns textbook sources, curriculum sources, past-paper sources "
        "(with real database relationships), generation metadata, validation "
        "results, review history, and historical summary statistics. "
        "Past-paper evidence is derived only from verified records. "
        "If no related past-paper questions are found, the response will contain "
        "a `noEvidenceMessage` and an empty `pastPaperSources` list."
    )
)
async def get_provenance(question_id: str) -> ProvenanceReport:
    """
    GET /questions/{question_id}/provenance

    Returns the complete MCQ provenance chain.
    """
    svc = _get_service()

    # In production: fetch the Question and MCQCandidate from the DB by question_id.
    # For now we delegate to the service which may cache or look up in the store.
    report: ProvenanceReport = await svc.get_report_by_id(question_id)

    if report is None:
        raise HTTPException(
            status_code=404,
            detail=f"No provenance record found for question '{question_id}'."
        )

    return report
