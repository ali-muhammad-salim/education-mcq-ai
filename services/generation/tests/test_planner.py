"""
Tests for MCQ Content Planner and Exam Pattern Candidates.
"""

import asyncio
import pytest

from services.knowledge.retrieval import KnowledgeRetriever
from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.textbook_mapper import TextbookMapper
from services.knowledge.pgvector_client import PgVectorClient
from services.generation.planner import MCQContentPlanner
from services.generation.exam_candidates import ExamPatternCandidateGenerator
from services.generation.schemas import QuestionType, EvidenceStatus


def _setup_retriever() -> KnowledgeRetriever:
    store = CurriculumStore()
    v1 = store.create_version("FBISE", "2025", 2025)
    store.create_item(
        v1.id, "10", "Physics", "Motion", "Acceleration", "Acceleration",
        learning_objective="Calculate acceleration from v-t graphs"
    )
    
    mapper = TextbookMapper()
    
    past_papers = [
        {
            "id": "pp1", "board": "FBISE", "class_level": "10", "verified": True, "year": 2022, "subject": "Physics",
            "chapter": "Motion", "concept": "Acceleration",
            "text": "Find acceleration...", "page": 1, "question_number": "1"
        },
        {
            "id": "pp2", "board": "FBISE", "class_level": "10", "verified": True, "year": 2023, "subject": "Physics",
            "chapter": "Motion", "concept": "Acceleration",
            "text": "Calculate acceleration...", "page": 2, "question_number": "2"
        },
        {
            "id": "pp3", "board": "FBISE", "class_level": "10", "verified": True, "year": 2024, "subject": "Physics",
            "chapter": "Motion", "concept": "Acceleration",
            "text": "What is acceleration...", "page": 3, "question_number": "3"
        }
    ]
    
    return KnowledgeRetriever(
        curriculum_store=store,
        textbook_mapper=mapper,
        pgvector_client=PgVectorClient.unavailable(),
        past_paper_questions=past_papers
    )


@pytest.mark.asyncio
async def test_planner_identifies_opportunities():
    retriever = _setup_retriever()
    planner = MCQContentPlanner(retriever)
    
    plan = await planner.plan_chapter("FBISE", "10", "Physics", "Motion")
    
    assert plan.board == "FBISE"
    assert "Acceleration" in plan.coreConcepts
    assert len(plan.opportunities) >= 2
    
    # We expect a standard MCQ opportunity because of historical representation
    # and a STATEMENT_BASED opportunity because count >= 2
    # and a NUMERICAL opportunity because "calculate" is in the learning objective
    types = [opp.questionType for opp in plan.opportunities]
    assert QuestionType.MCQ_SINGLE in types
    assert QuestionType.STATEMENT_BASED in types
    assert QuestionType.NUMERICAL in types


@pytest.mark.asyncio
async def test_exam_candidates():
    retriever = _setup_retriever()
    generator = ExamPatternCandidateGenerator(retriever)
    
    candidates = await generator.generate_candidates("FBISE", "10", "Physics", "Motion")
    
    assert len(candidates) == 1
    c = candidates[0]
    assert c.concept == "Acceleration"
    assert c.historicalEvidence == EvidenceStatus.STRONG_EVIDENCE
    assert len(c.relatedPastPaperQuestions) == 3
    # Ensure no guarantees
    assert "will come" not in c.rationale.lower()
