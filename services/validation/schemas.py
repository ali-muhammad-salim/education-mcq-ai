"""
Schemas for the MCQ Validation System (5-Stage Pipeline).
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field

from services.generation.schemas import MCQCandidate


class ValidationStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class DuplicateStatus(str, Enum):
    UNIQUE = "UNIQUE"
    RELATED = "RELATED"
    NEAR_DUPLICATE = "NEAR_DUPLICATE"
    DUPLICATE = "DUPLICATE"


class CheckResult(BaseModel):
    """Base result for a single validation check."""
    status: ValidationStatus
    reason: str
    confidence: float = Field(ge=0.0, le=1.0, default=1.0)


# Check 1
class AnswerValidationResult(CheckResult):
    pass


# Check 2
class FaithfulnessResult(CheckResult):
    unsupported_claims: List[str] = Field(default_factory=list)


# Check 3
class QualityResult(CheckResult):
    issues: List[str] = Field(default_factory=list)


# Checks 4 & 5
class MathChemResult(CheckResult):
    pass


# Check 6
class VisualResult(CheckResult):
    pass


# Checks 7 & 9
class RelevanceResult(CheckResult):
    evaluated_difficulty: str = "MEDIUM"


# Check 8
class DuplicateResult(CheckResult):
    duplicate_status: DuplicateStatus = DuplicateStatus.UNIQUE
    similar_question_ids: List[str] = Field(default_factory=list)


# Stage 1: Blind Solver
class BlindSolverResult(CheckResult):
    ai_chosen_answer: Optional[str] = None
    matches_key: bool = False


# Stage 2: Grounding Audit
class GroundingAuditResult(CheckResult):
    unsupported_claims: List[str] = Field(default_factory=list)
    quotes_found: List[str] = Field(default_factory=list)


# Stage 3: Distractor Audit
class DistractorAuditResult(CheckResult):
    plausible_distractors: int = 0
    flawed_distractors: List[str] = Field(default_factory=list) # Distractors that are actually correct
    misconception_alignment: float = Field(default=0.0) # 0.0 to 1.0 score of how well they map to real mistakes


# Stage 4: Syntax/Format
class SyntaxFormatResult(CheckResult):
    formatting_issues: List[str] = Field(default_factory=list)


# Stage 5: SLO Alignment
class SLOAlignmentResult(CheckResult):
    evaluated_slo: Optional[str] = None
    alignment_score: float = Field(default=0.0)


class FullValidationReport(BaseModel):
    """Aggregates all checks of the MCQ validation framework."""
    overall_status: ValidationStatus
    
    # Standard 7-critics checks
    answer_check: Optional[AnswerValidationResult] = None
    faithfulness_check: Optional[FaithfulnessResult] = None
    quality_check: Optional[QualityResult] = None
    math_chem_check: Optional[MathChemResult] = None
    visual_check: Optional[VisualResult] = None
    relevance_check: Optional[RelevanceResult] = None
    duplicate_check: Optional[DuplicateResult] = None
    
    # 5-Stage Gatekeeper checks
    blind_solver: Optional[BlindSolverResult] = None
    grounding_audit: Optional[GroundingAuditResult] = None
    distractor_audit: Optional[DistractorAuditResult] = None
    syntax_format: Optional[SyntaxFormatResult] = None
    slo_alignment: Optional[SLOAlignmentResult] = None
    
    candidate: MCQCandidate
