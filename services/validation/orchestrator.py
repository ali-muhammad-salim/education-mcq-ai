"""
MCQ Validator Orchestrator (5-Stage Validation Gatekeeper).
"""

from typing import Optional, List, Callable, Awaitable

from services.generation.schemas import MCQCandidate
from services.validation.schemas import (
    FullValidationReport,
    ValidationStatus,
)

# Import the 5 specific stages for ValidationGatekeeper
from services.validation.blind_solver import BlindSolver
from services.validation.grounding_audit import GroundingAudit
from services.validation.distractor_audit import DistractorAudit
from services.validation.syntax_format import SyntaxFormatAudit
from services.validation.slo_alignment import SLOAlignmentAudit

# Import the 7 critics for MCQValidator
from services.validation.answer_verifier import AnswerVerifier
from services.validation.faithfulness_checker import FaithfulnessChecker
from services.validation.quality_checker import QualityChecker
from services.validation.math_chem_checker import MathChemChecker
from services.validation.visual_checker import VisualChecker
from services.validation.relevance_evaluator import RelevanceEvaluator
from services.validation.duplicate_detector import DuplicateDetector


class ValidationGatekeeper:
    """
    Orchestrates the 5-stage automated validation pipeline logic.
    A candidate must PASS all stages to be automatically approved.
    """
    
    def __init__(
        self,
        llm_callable: Callable[[str], Awaitable[str]] = None,
        reference_text: str = "",
        slo_text: str = ""
    ):
        self.blind_solver = BlindSolver(llm_callable=llm_callable)
        self.grounding_audit = GroundingAudit(llm_callable=llm_callable, reference_text=reference_text)
        self.distractor_audit = DistractorAudit(llm_callable=llm_callable, reference_text=reference_text)
        self.syntax_format = SyntaxFormatAudit()
        self.slo_alignment = SLOAlignmentAudit(llm_callable=llm_callable, slo_text=slo_text)

    async def validate(self, candidate: MCQCandidate) -> FullValidationReport:
        blind_res = await self.blind_solver.evaluate(candidate)
        ground_res = await self.grounding_audit.evaluate(candidate)
        distract_res = await self.distractor_audit.evaluate(candidate)
        syntax_res = await self.syntax_format.evaluate(candidate)
        slo_res = await self.slo_alignment.evaluate(candidate)
        
        report = FullValidationReport(
            overall_status=ValidationStatus.NEEDS_REVIEW,
            blind_solver=blind_res,
            grounding_audit=ground_res,
            distractor_audit=distract_res,
            syntax_format=syntax_res,
            slo_alignment=slo_res,
            candidate=candidate
        )
        
        report.overall_status = self._compute_quality_gate([
            blind_res.status, 
            ground_res.status, 
            distract_res.status,
            syntax_res.status, 
            slo_res.status
        ])
        
        return report

    def _compute_quality_gate(self, statuses: List[ValidationStatus]) -> ValidationStatus:
        if ValidationStatus.FAIL in statuses:
            return ValidationStatus.FAIL
        if ValidationStatus.NEEDS_REVIEW in statuses:
            return ValidationStatus.NEEDS_REVIEW
        return ValidationStatus.PASS


class MCQValidator:
    """
    Orchestrates the independent evaluation of an MCQCandidate across multiple critics.
    Applies the Quality Gate to compute the final overall status.
    """
    
    def __init__(
        self,
        answer_verifier: Optional[AnswerVerifier] = None,
        faithfulness_checker: Optional[FaithfulnessChecker] = None,
        quality_checker: Optional[QualityChecker] = None,
        math_chem_checker: Optional[MathChemChecker] = None,
        visual_checker: Optional[VisualChecker] = None,
        relevance_evaluator: Optional[RelevanceEvaluator] = None,
        duplicate_detector: Optional[DuplicateDetector] = None,
    ):
        self.answer_verifier = answer_verifier or AnswerVerifier()
        self.faithfulness_checker = faithfulness_checker or FaithfulnessChecker()
        self.quality_checker = quality_checker or QualityChecker()
        self.math_chem_checker = math_chem_checker or MathChemChecker()
        self.visual_checker = visual_checker or VisualChecker()
        self.relevance_evaluator = relevance_evaluator or RelevanceEvaluator()
        self.duplicate_detector = duplicate_detector or DuplicateDetector()

    async def validate(self, candidate: MCQCandidate) -> FullValidationReport:
        ans_res = await self.answer_verifier.evaluate(candidate)
        faith_res = await self.faithfulness_checker.evaluate(candidate)
        qual_res = await self.quality_checker.evaluate(candidate)
        math_res = await self.math_chem_checker.evaluate(candidate)
        vis_res = await self.visual_checker.evaluate(candidate)
        rel_res = await self.relevance_evaluator.evaluate(candidate)
        dup_res = await self.duplicate_detector.evaluate(candidate)
        
        report = FullValidationReport(
            overall_status=ValidationStatus.NEEDS_REVIEW,
            answer_check=ans_res,
            faithfulness_check=faith_res,
            quality_check=qual_res,
            math_chem_check=math_res,
            visual_check=vis_res,
            relevance_check=rel_res,
            duplicate_check=dup_res,
            candidate=candidate
        )
        
        report.overall_status = self._compute_quality_gate([
            ans_res.status, faith_res.status, qual_res.status,
            math_res.status, vis_res.status, rel_res.status, dup_res.status
        ])
        
        return report

    def _compute_quality_gate(self, statuses: List[ValidationStatus]) -> ValidationStatus:
        if ValidationStatus.FAIL in statuses:
            return ValidationStatus.FAIL
        if ValidationStatus.NEEDS_REVIEW in statuses:
            return ValidationStatus.NEEDS_REVIEW
        return ValidationStatus.PASS
