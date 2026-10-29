"""
Schemas for the AI Evaluation Framework.
"""

from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from services.generation.schemas import MCQCandidate
from services.book_analysis.schemas import CandidateWithProvenance


class DatasetSplit(str, Enum):
    DEVELOPMENT = "DEVELOPMENT"
    VALIDATION = "VALIDATION"
    TEST = "TEST"


class EvaluationCategory(str, Enum):
    ANSWER_ACCURACY = "ANSWER_ACCURACY"
    FACTUAL_ACCURACY = "FACTUAL_ACCURACY"
    CURRICULUM_ALIGNMENT = "CURRICULUM_ALIGNMENT"
    BOARD_ALIGNMENT = "BOARD_ALIGNMENT"
    SOURCE_FAITHFULNESS = "SOURCE_FAITHFULNESS"
    PAST_PAPER_RELATIONSHIP_ACCURACY = "PAST_PAPER_RELATIONSHIP_ACCURACY"
    DIFFICULTY_ACCURACY = "DIFFICULTY_ACCURACY"
    MATHEMATICAL_ACCURACY = "MATHEMATICAL_ACCURACY"
    CHEMISTRY_EQUATION_ACCURACY = "CHEMISTRY_EQUATION_ACCURACY"
    DIAGRAM_ACCURACY = "DIAGRAM_ACCURACY"
    AMBIGUITY_RATE = "AMBIGUITY_RATE"
    DUPLICATE_RATE = "DUPLICATE_RATE"
    UNSUPPORTED_CLAIM_RATE = "UNSUPPORTED_CLAIM_RATE"
    INVALID_JSON_RATE = "INVALID_JSON_RATE"


class PastPaperRelationshipMatch(str, Enum):
    """
    Evaluates whether the system correctly identified the past paper relationship.
    """
    EXACT_MATCH = "EXACT_MATCH"
    SAME_CONCEPT = "SAME_CONCEPT"
    RELATED_CONCEPT = "RELATED_CONCEPT"
    UNRELATED = "UNRELATED"


class EvaluationExample(BaseModel):
    """
    A single evaluation record.
    """
    id: str
    input_context: str
    retrieved_evidence: str
    expected_output: str
    # Used for leakage prevention logic
    concept: str
    question_text_signature: str = ""


class EvaluationError(BaseModel):
    """
    A failure report for an evaluation example.
    """
    example_id: str
    input_context: str
    retrieved_evidence: str
    model_output: str
    expected_result: str
    failure_categories: List[EvaluationCategory] = Field(default_factory=list)
    human_correction: Optional[str] = None


class EvaluationMetrics(BaseModel):
    """
    Quantitative metrics for a run.
    Stores rates/accuracy (0.0 to 1.0) for each category.
    """
    total_evaluated: int = 0
    scores: Dict[EvaluationCategory, float] = Field(default_factory=dict)
    past_paper_relationship_scores: Dict[PastPaperRelationshipMatch, float] = Field(default_factory=dict)


class EvaluationRun(BaseModel):
    """
    Record of a baseline or fine-tuned evaluation run.
    """
    run_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    dataset_version: str
    dataset_split: DatasetSplit
    
    model_version: str
    prompt_version: str
    is_baseline: bool = False
    
    metrics: EvaluationMetrics = Field(default_factory=EvaluationMetrics)
    errors: List[EvaluationError] = Field(default_factory=list)


class ModelComparisonReport(BaseModel):
    """
    Mathematical comparison between baseline and fine-tuned models over the exact same test set.
    """
    report_id: str
    dataset_version: str
    dataset_split: DatasetSplit
    
    baseline_run_id: str
    baseline_model_version: str
    
    fine_tuned_run_id: str
    fine_tuned_model_version: str
    
    # Positive delta means fine-tuned is better, negative means baseline is better
    metric_deltas: Dict[EvaluationCategory, float] = Field(default_factory=dict)
    
    overall_improvement: bool = False
    recommendation: str = ""

