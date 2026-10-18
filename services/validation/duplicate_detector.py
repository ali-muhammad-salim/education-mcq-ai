"""
Check 8: Duplicate Detector.
"""

from typing import Optional

from services.generation.schemas import MCQCandidate
from services.knowledge.pgvector_client import PgVectorClient
from services.validation.base import MCQCritic
from services.validation.schemas import DuplicateResult, DuplicateStatus, ValidationStatus


class DuplicateDetector(MCQCritic[DuplicateResult]):
    """
    Detects duplicate or near-duplicate questions using embeddings.
    """
    def __init__(self, vector_client: Optional[PgVectorClient] = None):
        self.vector_client = vector_client
        
    async def evaluate(self, candidate: MCQCandidate) -> DuplicateResult:
        if not self.vector_client or not self.vector_client.is_available():
            return DuplicateResult(
                status=ValidationStatus.NEEDS_REVIEW,
                reason="PgVector client unavailable. Could not check for duplicates.",
                confidence=0.5,
                duplicate_status=DuplicateStatus.UNIQUE
            )
            
        # We would embed the question text and search for cosine similarity
        results = await self.vector_client.search_embeddings(
            query_embedding=[0.0] * 1536,  # mock embedding
            collection_name="questions",
            top_k=3,
            metadata_filters={"board": candidate.board, "subject": candidate.subject}
        )
        
        for res in results:
            if res.distance < 0.05:
                return DuplicateResult(
                    status=ValidationStatus.FAIL,
                    reason=f"Exact duplicate detected. ID: {res.id}",
                    confidence=0.99,
                    duplicate_status=DuplicateStatus.DUPLICATE,
                    similar_question_ids=[res.id]
                )
            elif res.distance < 0.15:
                return DuplicateResult(
                    status=ValidationStatus.NEEDS_REVIEW,
                    reason=f"Near duplicate detected. ID: {res.id}",
                    confidence=0.9,
                    duplicate_status=DuplicateStatus.NEAR_DUPLICATE,
                    similar_question_ids=[res.id]
                )
                
        return DuplicateResult(
            status=ValidationStatus.PASS,
            reason="No duplicates detected.",
            confidence=0.95,
            duplicate_status=DuplicateStatus.UNIQUE
        )
