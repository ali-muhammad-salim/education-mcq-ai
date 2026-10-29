"""
Evaluator for the AI Evaluation Framework.
Executes models against dataset splits and generates mathematical comparisons 
between baseline and fine-tuned models.
"""

import logging
import uuid
from typing import List, Callable, Any

from services.evaluation.schemas import (
    EvaluationRun, 
    EvaluationError, 
    EvaluationMetrics, 
    EvaluationExample,
    EvaluationCategory,
    ModelComparisonReport,
    DatasetSplit
)

logger = logging.getLogger(__name__)


class Evaluator:
    """
    Core engine for running evaluations and generating comparison reports.
    """
    
    def run_evaluation(
        self, 
        dataset_split: DatasetSplit,
        examples: List[EvaluationExample],
        model_version: str,
        prompt_version: str,
        dataset_version: str,
        eval_callable: Callable[[EvaluationExample], dict],
        is_baseline: bool = False
    ) -> EvaluationRun:
        """
        Executes the evaluation. The eval_callable should return a dictionary
        mapping EvaluationCategory to a score (0.0 to 1.0) and a list of failure 
        categories if any.
        """
        logger.info(f"Starting evaluation run. Model: {model_version}, Split: {dataset_split.value}")
        
        run_id = str(uuid.uuid4())
        errors = []
        metrics = EvaluationMetrics(total_evaluated=len(examples))
        
        # Initialize scores to 0
        sum_scores = {cat: 0.0 for cat in EvaluationCategory}
        
        for ex in examples:
            # Note: eval_callable simulates the model execution and grading logic.
            # In a real system, this would call the LLM, parse the output, 
            # and run deterministic + LLM-as-a-judge grading.
            result = eval_callable(ex)
            
            # Aggregate scores
            for cat, score in result.get("scores", {}).items():
                sum_scores[cat] += score
                
            # Track errors
            failures = result.get("failures", [])
            if failures:
                err = EvaluationError(
                    example_id=ex.id,
                    input_context=ex.input_context,
                    retrieved_evidence=ex.retrieved_evidence,
                    model_output=result.get("model_output", ""),
                    expected_result=ex.expected_output,
                    failure_categories=failures
                )
                errors.append(err)
        
        # Calculate averages
        if examples:
            metrics.scores = {cat: total / len(examples) for cat, total in sum_scores.items()}
            
        run = EvaluationRun(
            run_id=run_id,
            dataset_version=dataset_version,
            dataset_split=dataset_split,
            model_version=model_version,
            prompt_version=prompt_version,
            is_baseline=is_baseline,
            metrics=metrics,
            errors=errors
        )
        
        logger.info(f"Evaluation run {run_id} complete. Errors: {len(errors)}/{len(examples)}")
        return run

    def compare_models(self, baseline: EvaluationRun, fine_tuned: EvaluationRun) -> ModelComparisonReport:
        """
        Compares a baseline run to a fine-tuned run mathematically.
        Throws ValueError if comparing across different dataset versions or splits.
        """
        if baseline.dataset_split != fine_tuned.dataset_split:
            raise ValueError("Cannot compare models evaluated on different dataset splits.")
        if baseline.dataset_version != fine_tuned.dataset_version:
            raise ValueError("Cannot compare models evaluated on different dataset versions.")
            
        deltas = {}
        improved_count = 0
        total_categories = len(EvaluationCategory)
        
        for cat in EvaluationCategory:
            b_score = baseline.metrics.scores.get(cat, 0.0)
            f_score = fine_tuned.metrics.scores.get(cat, 0.0)
            delta = f_score - b_score
            deltas[cat] = delta
            
            if delta > 0:
                improved_count += 1
                
        # Define overall improvement (e.g. if more than half the metrics improved and none degraded significantly)
        # simplified for this logic
        overall_improvement = improved_count > (total_categories / 2)
        
        rec = "Proceed with Fine-Tuned Model" if overall_improvement else "Reject Fine-Tuned Model - No measurable improvement"
        
        return ModelComparisonReport(
            report_id=str(uuid.uuid4()),
            dataset_version=baseline.dataset_version,
            dataset_split=baseline.dataset_split,
            baseline_run_id=baseline.run_id,
            baseline_model_version=baseline.model_version,
            fine_tuned_run_id=fine_tuned.run_id,
            fine_tuned_model_version=fine_tuned.model_version,
            metric_deltas=deltas,
            overall_improvement=overall_improvement,
            recommendation=rec
        )

