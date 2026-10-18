"""
Tests for Evidence-Based Study Priority & Practice Engine.

Verifies:
1. Multi-dimensional ranking across the 5 measures.
2. Ground-truth rule: Foundational concepts with 0 past-paper appearances are NOT marked low.
3. Chronological holdouts prevent data leakage from future examinations.
4. Balanced practice blueprints maintain broad syllabus coverage.
"""

import pytest

from services.past_paper.engine import PastPaperEngine
from services.past_paper.engine import PastPaperEngine
from services.past_paper.schemas import (
    ClassifiedField,
    ExtractedQuestion,
    QuestionClassification,
)
from services.past_paper.study_priority import (
    PriorityCategory,
    PriorityWeights,
    StudyPriorityEngine,
)


def _make_dummy_question(
    paper_id: str,
    year: int,
    q_num: str,
    text: str,
    concept: str,
    numerical: bool = False,
) -> tuple[ExtractedQuestion, QuestionClassification]:
    q = ExtractedQuestion(
        paper_id=paper_id,
        year=year,
        board="AKU-EB",
        class_level="9",
        subject="Physics",
        question_number=q_num,
        text=text,
        marks=1.0,
    )
    cls = QuestionClassification(
        question_id=f"{paper_id}_{q_num}_",
        chapter=ClassifiedField(value="Motion", confidence=1.0),
        topic=ClassifiedField(value="Linear Motion", confidence=1.0),
        concept=ClassifiedField(value=concept, confidence=1.0),
        question_type=ClassifiedField(value="MCQ", confidence=1.0),
        difficulty=ClassifiedField(value="MEDIUM", confidence=1.0),
        numerical_or_conceptual=ClassifiedField(
            value="NUMERICAL" if numerical else "CONCEPTUAL", confidence=1.0
        ),
        formula_based=numerical,
        formula_based_confidence=1.0 if numerical else 0.0,
        classified_by="HUMAN",
    )
    return q, cls


def test_study_priority_foundational_concept_never_ignored():
    """An SLO absent from past papers must be categorized as IMPORTANT_FOUNDATIONAL_CONCEPT."""
    engine = StudyPriorityEngine()
    result = engine.evaluate_concept(
        board="AKU-EB",
        class_level="9",
        subject="Physics",
        chapter="Motion",
        topic="Linear Motion",
        concept="Inertia in non-inertial frames",
        stats=None,
        cognitive_level="U",
        is_curriculum_mandated=True,
    )
    assert result.category == PriorityCategory.IMPORTANT_FOUNDATIONAL_CONCEPT
    assert result.scores.curriculum_priority >= 0.7
    assert result.scores.historical_frequency == 0.0
    assert "not a prediction" in result.disclaimer.lower()


def test_study_priority_high_evidence_concept():
    """Frequently appearing concepts with model paper endorsement receive high priority."""
    engine = StudyPriorityEngine()
    p_engine = PastPaperEngine()

    # Ingest questions across 4 different years
    for y in [2021, 2022, 2023, 2024]:
        q, cls = _make_dummy_question(f"p_{y}", y, "1", "Calculate velocity...", "Velocity", numerical=True)
        qid = p_engine.store.add_question(q, question_id=f"p_{y}_1")
        cls.question_id = qid
        p_engine.store.add_classification(qid, cls)

    p_engine.compute_historical_stats()

    stats = p_engine.store.get_stats("AKU-EB", "9", "Physics", "Motion", "Linear Motion", "Velocity")
    assert stats is not None

    result = engine.evaluate_concept(
        board="AKU-EB",
        class_level="9",
        subject="Physics",
        chapter="Motion",
        topic="Linear Motion",
        concept="Velocity",
        stats=stats,
        in_model_paper=True,
        cognitive_level="A",
    )

    assert result.category == PriorityCategory.HIGH_STUDY_PRIORITY
    assert result.overall_priority_score >= 0.75


def test_chronological_holdout_prevents_leakage():
    """When cutoff_year=2022 is set, papers from 2023 and 2024 must NOT influence ranking."""
    p_engine = PastPaperEngine()

    # Add questions for 2021, 2022, 2023, 2024
    for y in [2021, 2022, 2023, 2024]:
        q, cls = _make_dummy_question(f"paper_{y}", y, "1", "Acceleration question", "Acceleration")
        qid = p_engine.store.add_question(q, question_id=f"paper_{y}_1")
        cls.question_id = qid
        p_engine.store.add_classification(qid, cls)

    p_engine.compute_historical_stats()

    # Without cutoff: 4 years
    full_priorities = p_engine.study_priorities(chapter="Motion", board="AKU-EB", subject="Physics")
    accel_full = next(p for p in full_priorities if p.concept == "Acceleration")
    assert accel_full.scores.historical_frequency == 1.0  # 4 years * 0.25 = 1.0

    # With cutoff 2022: only 2021 and 2022 allowed (2 years)
    holdout_priorities = p_engine.study_priorities(
        chapter="Motion", board="AKU-EB", subject="Physics", cutoff_year=2022
    )
    accel_holdout = next(p for p in holdout_priorities if p.concept == "Acceleration")
    assert accel_holdout.scores.historical_frequency == 0.5  # 2 years * 0.25 = 0.5
    assert accel_holdout.overall_priority_score < accel_full.overall_priority_score


def test_balanced_practice_blueprint_generation():
    """Verify that blueprint includes foundational concepts, avoiding 100% past-paper tunnel vision."""
    engine = StudyPriorityEngine()
    
    from services.past_paper.schemas import HistoricalStats
    high_stats = HistoricalStats(
        board="AKU-EB",
        class_level="9",
        subject="Physics",
        chapter="Motion",
        topic="Topic1",
        concept="Concept_High1",
        years_appeared=[2021, 2022, 2023, 2024],
        number_of_questions=4,
    )

    priorities = [
        engine.evaluate_concept("AKU-EB", "9", "Physics", "Motion", "Topic1", "Concept_High1", stats=high_stats, in_model_paper=True, is_curriculum_mandated=True, cognitive_level="A"),
        engine.evaluate_concept("AKU-EB", "9", "Physics", "Motion", "Topic1", "Concept_Foundational1", stats=None, cognitive_level="U"),
        engine.evaluate_concept("AKU-EB", "9", "Physics", "Motion", "Topic1", "Concept_Foundational2", stats=None, cognitive_level="U"),
    ]

    blueprint = engine.generate_balanced_practice_blueprint(priorities, total_mcqs=4, total_crqs=2)
    assert blueprint.mcq_count == 4
    assert blueprint.crq_count == 2
    assert len(blueprint.selected_concepts) > 0
    # Must contain both high and foundational concepts
    assert "Concept_High1" in blueprint.selected_concepts
    assert any("Foundational" in c for c in blueprint.selected_concepts)

