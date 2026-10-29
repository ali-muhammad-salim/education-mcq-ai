"""
MCQ Content Planner.

The planner queries the Knowledge Layer for a specific chapter or concept,
analyzes the evidence (curriculum weight, past paper frequency), and generates
a ContentPlan. The ContentPlan identifies specific QuestionOpportunities that
are justified by evidence, rather than a naive "generate N questions".
"""

from typing import List, Optional, Set
import logging

from services.knowledge.retrieval import KnowledgeRetriever
from services.generation.schemas import (
    CognitiveLevel,
    ContentPlan,
    QuestionOpportunity,
    QuestionType,
)
from services.knowledge.schemas import SourcePriority

logger = logging.getLogger(__name__)


class MCQContentPlanner:
    """
    Analyzes knowledge layer evidence to plan question generation.
    """

    def __init__(self, retriever: KnowledgeRetriever):
        self.retriever = retriever

    async def plan_chapter(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
    ) -> ContentPlan:
        """
        Create a generation plan for an entire chapter.
        """
        # We query the concept graph via the retriever for the whole chapter
        # We can do this by using a broad retrieval or accessing the graph directly.
        # Since retrieve() returns top K, we might miss things if we just search.
        # However, for the planner, we really want to inspect the ConceptGraph nodes.
        # Let's instantiate the graph to get all nodes for the chapter.
        
        # Accessing the concept graph requires the underlying stores from the retriever
        graph_nodes = self.retriever._curriculum.find_items(
            board_id=board, class_level=class_level, subject=subject, chapter=chapter
        )
        
        core_concepts: Set[str] = set()
        represented_concepts: Set[str] = set()
        opportunities: List[QuestionOpportunity] = []
        
        # In a full implementation, the planner would use an LLM or heuristics
        # to analyze the raw graph nodes. Here we use heuristics based on evidence.
        
        for item in graph_nodes:
            core_concepts.add(item.concept)
            
            # Check historical representation by querying the retriever
            # for past papers related to this concept
            historical_results = await self.retriever.retrieve(
                query=item.concept,
                board=board,
                class_level=class_level,
                subject=subject,
                concept=item.concept,
                chapter=chapter,
                top_k=50
            )
            
            past_papers = [
                src for r in historical_results for src in r.sources
                if src.source_type == "PAST_PAPER"
            ]
            
            if past_papers:
                represented_concepts.add(item.concept)
                
                # Opportunity 1: Historically tested concept (Standard MCQ)
                opportunities.append(QuestionOpportunity(
                    concept=item.concept,
                    questionType=QuestionType.MCQ_SINGLE,
                    cognitiveLevel=CognitiveLevel.APPLICATION,
                    rationale=f"Historically tested in {len(past_papers)} past papers.",
                    relatedPastPaperIds=list({p.source_id for p in past_papers})[:3]
                ))
                
                # Opportunity 2: If many past papers, suggest a harder variant
                if len(past_papers) >= 2:
                    opportunities.append(QuestionOpportunity(
                        concept=item.concept,
                        questionType=QuestionType.STATEMENT_BASED,
                        cognitiveLevel=CognitiveLevel.ANALYSIS,
                        rationale="Frequently tested; good candidate for deeper analytical testing.",
                        relatedPastPaperIds=list({p.source_id for p in past_papers})[:3]
                    ))
            
            # Opportunity 3: Curriculum mandated but not historically tested
            if not past_papers and item.learning_objective:
                opportunities.append(QuestionOpportunity(
                    concept=item.concept,
                    questionType=QuestionType.MCQ_SINGLE,
                    cognitiveLevel=CognitiveLevel.KNOWLEDGE,
                    rationale="Curriculum mandated but lacking historical representation. Need baseline coverage.",
                    relatedPastPaperIds=[]
                ))

            # Heuristic for numerical/equation opportunities
            text_lower = (item.learning_objective or "").lower()
            if "calculate" in text_lower or "equation" in text_lower or "formula" in text_lower:
                opportunities.append(QuestionOpportunity(
                    concept=item.concept,
                    questionType=QuestionType.NUMERICAL,
                    cognitiveLevel=CognitiveLevel.APPLICATION,
                    rationale="Learning objective suggests mathematical or numerical application.",
                    relatedPastPaperIds=[]
                ))
                
        # Generate the plan
        plan = ContentPlan(
            board=board,
            subject=subject,
            chapter=chapter,
            coreConcepts=sorted(list(core_concepts)),
            prerequisiteConcepts=[],  # Would require dependency graph
            historicallyRepresentedConcepts=sorted(list(represented_concepts)),
            opportunities=opportunities,
            questionPatternsDetected=["Standard Concept Recall", "Numerical Application"],
            misconceptionsToTarget=[]  # Would require misconception database or LLM analysis
        )
        
        logger.info("MCQContentPlanner: Generated plan for %s %s with %d opportunities.", 
                    board, chapter, len(opportunities))
        
        return plan
