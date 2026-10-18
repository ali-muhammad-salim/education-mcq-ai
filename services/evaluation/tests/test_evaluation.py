import pytest

from services.evaluation.schemas import (
    EvaluationExample, 
    DatasetSplit, 
    EvaluationCategory,
    EvaluationRun,
    EvaluationMetrics
)
from services.evaluation.dataset_manager import DatasetManager
from services.evaluation.evaluator import Evaluator


def test_dataset_manager_prevents_concept_leakage():
    manager = DatasetManager()
    
    ex1 = EvaluationExample(
        id="1",
        input_context="context",
        retrieved_evidence="evidence",
        expected_output="output1",
        concept="Kinematics",
        question_text_signature=""
    )
    
    ex2 = EvaluationExample(
        id="2",
        input_context="context",
        retrieved_evidence="evidence",
        expected_output="output2",
        concept="Kinematics",
        question_text_signature=""
    )
    
    # Add first to DEV
    assert manager.add_example(ex1, DatasetSplit.DEVELOPMENT) is True
    
    # Try adding second (same concept) to TEST - should fail
    assert manager.add_example(ex2, DatasetSplit.TEST) is False
    
    # Try adding second to DEV - should succeed
    assert manager.add_example(ex2, DatasetSplit.DEVELOPMENT) is True


def test_dataset_manager_prevents_near_identical_leakage():
    manager = DatasetManager()
    
    ex1 = EvaluationExample(
        id="1",
        input_context="context",
        retrieved_evidence="evidence",
        expected_output="What is the acceleration due to gravity?",
        concept="Gravity1", # Different concept but identical question
        question_text_signature=""
    )
    
    ex2 = EvaluationExample(
        id="2",
        input_context="context",
        retrieved_evidence="evidence",
        expected_output="what is the acceleration due to gravity", # Near identical
        concept="Gravity2",
        question_text_signature=""
    )
    
    # Add first to VAL
    assert manager.add_example(ex1, DatasetSplit.VALIDATION) is True
    
    # Try adding second to DEV - should fail due to signature match
    assert manager.add_example(ex2, DatasetSplit.DEVELOPMENT) is False


def test_evaluator_comparison_logic():
    evaluator = Evaluator()
    
    # Mock some runs
    baseline = EvaluationRun(
        run_id="base",
        dataset_version="v1",
        dataset_split=DatasetSplit.TEST,
        model_version="v1.0",
        prompt_version="p1",
        is_baseline=True,
        metrics=EvaluationMetrics(
            total_evaluated=100,
            scores={EvaluationCategory.ANSWER_ACCURACY: 0.50}
        )
    )
    
    fine_tuned = EvaluationRun(
        run_id="ft",
        dataset_version="v1",
        dataset_split=DatasetSplit.TEST,
        model_version="v1.1",
        prompt_version="p1",
        is_baseline=False,
        metrics=EvaluationMetrics(
            total_evaluated=100,
            scores={EvaluationCategory.ANSWER_ACCURACY: 0.80}
        )
    )
    
    report = evaluator.compare_models(baseline, fine_tuned)
    
    assert report.metric_deltas[EvaluationCategory.ANSWER_ACCURACY] == pytest.approx(0.30)
    assert report.overall_improvement is False
    assert "Reject" in report.recommendation


def test_evaluator_rejects_mismatched_comparison():
    evaluator = Evaluator()
    
    baseline = EvaluationRun(
        run_id="base",
        dataset_version="v1",
        dataset_split=DatasetSplit.TEST,
        model_version="v1.0",
        prompt_version="p1",
        is_baseline=True
    )
    
    fine_tuned = EvaluationRun(
        run_id="ft",
        dataset_version="v2", # Mismatch
        dataset_split=DatasetSplit.TEST,
        model_version="v1.1",
        prompt_version="p1",
        is_baseline=False
    )
    
    with pytest.raises(ValueError, match="Cannot compare models evaluated on different dataset versions"):
        evaluator.compare_models(baseline, fine_tuned)

