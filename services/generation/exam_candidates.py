"""
Exam Pattern Candidate Generator.

Identifies high-value question candidates based on historical evidence.
Crucially, it never guarantees or predicts exact future exam questions.
"""

from typing import List, Optional
import logging

from services.knowledge.retrieval import KnowledgeRetriever
from services.generation.schemas import (
    ExamPatternCandidate,
    EvidenceStatus,
    QuestionType,
)

logger = logging.getLogger(__name__)


class ExamPatternCandidateGenerator:
    """
    Generates high-value question candidates.
    """

    def __init__(self, retriever: KnowledgeRetriever):
        self.retriever = retriever

    async def generate_candidates(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: Optional[str] = None
    ) -> List[ExamPatternCandidate]:
        """
        Analyze the knowledge graph and past papers to propose candidates.
        """
        # Get curriculum items to use as the base for candidates
        items = self.retriever._curriculum.find_items(
            board_id=board, class_level=class_level, subject=subject, chapter=chapter
        )
        
        candidates: List[ExamPatternCandidate] = []
        
        for item in items:
            # Look up historical evidence
            historical_results = await self.retriever.retrieve(
                query=item.concept,
                board=board,
                class_level=class_level,
                subject=subject,
                concept=item.concept,
                chapter=item.chapter,
                top_k=20
            )
            
            past_papers = [
                src for r in historical_results for src in r.sources
                if src.source_type == "PAST_PAPER"
            ]
            
            if len(past_papers) >= 3:
                candidates.append(ExamPatternCandidate(
                    concept=item.concept,
                    historicalEvidence=EvidenceStatus.STRONG_EVIDENCE,
                    supportingSources=[item.id],
                    relatedPastPaperQuestions=[p.source_id for p in past_papers],
                    rationale="HIGH HISTORICAL EVIDENCE. This concept appears frequently in past papers.",
                    uncertainty="Question format may vary. Exact numbers or phrasing will differ.",
                    suggestedQuestionType=QuestionType.MCQ_SINGLE
                ))
            elif len(past_papers) >= 1:
                candidates.append(ExamPatternCandidate(
                    concept=item.concept,
                    historicalEvidence=EvidenceStatus.MODERATE_EVIDENCE,
                    supportingSources=[item.id],
                    relatedPastPaperQuestions=[p.source_id for p in past_papers],
                    rationale="MODERATE HISTORICAL EVIDENCE. Concept has been tested before.",
                    uncertainty="Limited sample size to determine a consistent pattern.",
                    suggestedQuestionType=QuestionType.MCQ_SINGLE
                ))
            else:
                # Is it a new concept? Check curriculum versioning notes
                # If it's in a new curriculum but has no past papers
                candidates.append(ExamPatternCandidate(
                    concept=item.concept,
                    historicalEvidence=EvidenceStatus.NO_DIRECT_EVIDENCE,
                    supportingSources=[item.id],
                    relatedPastPaperQuestions=[],
                    rationale="NEW CONCEPT or unrepresented in historical data, but mandated by curriculum.",
                    uncertainty="INSUFFICIENT DATA on how the board will choose to test this.",
                    suggestedQuestionType=QuestionType.MCQ_SINGLE
                ))
                
        logger.info("ExamPatternCandidateGenerator: Generated %d candidates for %s %s.", 
                    len(candidates), board, chapter or subject)
        
        return candidates
