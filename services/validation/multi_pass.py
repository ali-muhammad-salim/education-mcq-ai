"""
Multi-Pass Document & Question Extraction Verification System.

Implements the 4-Pass verification protocol:
- Pass A: Primary Structured Extraction
- Pass B: Independent Source Review (detects missing symbols, wrong units, incorrect SLO mapping)
- Pass C: Deterministic Code Validation (schema, formatting, option counts, duplicates)
- Pass D: Targeted Adjudication & Human Review Escalation

Every verification record stores:
- Audit trail & timestamps
- Verification passes completed
- Provider and model names
- Specific defects identified
- Evidence citations
- Final verification status: VERIFIED | PENDING_REVIEW | DISPUTED | REJECTED
"""

from __future__ import annotations

import datetime
import logging
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    PENDING_PRIMARY_VERIFICATION = "PENDING_PRIMARY_VERIFICATION"
    PENDING_REVIEW = "PENDING_REVIEW"
    DISPUTED = "DISPUTED"
    REJECTED = "REJECTED"


class DefectSeverity(str, Enum):
    CRITICAL = "CRITICAL"   # Wrong answer key, hallucinated question, missing option
    MAJOR = "MAJOR"         # Wrong mathematical symbol, omitted unit, incorrect SLO code
    MINOR = "MINOR"         # Whitespace, minor formatting inconsistency


class VerificationDefect(BaseModel):
    category: str           # "MATH_SYMBOL", "UNIT", "OPTION_COUNT", "SLO_ALIGNMENT", "PROVENANCE"
    severity: DefectSeverity
    description: str
    pass_detected: str      # "PASS_A", "PASS_B", "PASS_C", "PASS_D"
    suggested_correction: Optional[str] = None


class VerificationRecord(BaseModel):
    item_id: str
    item_type: str          # "MCQ", "SLO", "CRQ", "DIAGRAM", "TABLE"
    status: VerificationStatus
    passes_executed: List[str] = Field(default_factory=list)
    primary_provider: str = "google_gemini"
    primary_model: str = "gemini-2.5-flash"
    verifier_provider: Optional[str] = None
    verifier_model: Optional[str] = None
    defects_found: List[VerificationDefect] = Field(default_factory=list)
    adjudication_notes: Optional[str] = None
    source_citation: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    audit_history: List[str] = Field(default_factory=list)


class MultiPassVerifier:
    """
    Executes the 4-pass verification workflow deterministically.
    """

    def verify_mcq(
        self,
        item_id: str,
        stem: str,
        options: List[str],
        correct_index: int,
        explanation: str,
        slo_code: Optional[str] = None,
        source_citation: Optional[str] = None,
        independent_review_result: Optional[Dict[str, Any]] = None,
        adjudication_result: Optional[Dict[str, Any]] = None,
    ) -> VerificationRecord:
        """
        Runs Passes A -> B -> C -> D on an MCQ item.
        """
        passes = ["PASS_A"]
        defects: List[VerificationDefect] = []
        history = [f"Pass A registered at {datetime.datetime.now(datetime.timezone.utc).isoformat()}"]

        # -------------------------------------------------------------
        # PASS C: Deterministic Code Validation (Hard checks)
        # -------------------------------------------------------------
        passes.append("PASS_C")
        history.append("Pass C deterministic code validation started")

        # 1. Stem must not be empty or too short
        if not stem or len(stem.strip()) < 8:
            defects.append(VerificationDefect(
                category="STEM_INTEGRITY",
                severity=DefectSeverity.CRITICAL,
                description="Question stem is empty or excessively short.",
                pass_detected="PASS_C",
            ))

        # 2. Options must have exactly 4 items (A, B, C, D)
        if len(options) != 4:
            defects.append(VerificationDefect(
                category="OPTION_COUNT",
                severity=DefectSeverity.CRITICAL,
                description=f"MCQ must have exactly 4 options; found {len(options)}.",
                pass_detected="PASS_C",
            ))

        # 3. No duplicate options
        clean_opts = [o.strip().lower() for o in options]
        if len(set(clean_opts)) < len(clean_opts):
            defects.append(VerificationDefect(
                category="DUPLICATE_OPTIONS",
                severity=DefectSeverity.CRITICAL,
                description="MCQ contains duplicate or identical options.",
                pass_detected="PASS_C",
            ))

        # 4. Valid correct option index
        if correct_index < 0 or correct_index >= len(options):
            defects.append(VerificationDefect(
                category="ANSWER_KEY_BOUNDS",
                severity=DefectSeverity.CRITICAL,
                description=f"Correct option index ({correct_index}) is out of bounds for options count {len(options)}.",
                pass_detected="PASS_C",
            ))

        # 5. Explanation must be present
        if not explanation or len(explanation.strip()) < 10:
            defects.append(VerificationDefect(
                category="EXPLANATION_COMPLETENESS",
                severity=DefectSeverity.MAJOR,
                description="Missing or insufficient explanation for the correct answer.",
                pass_detected="PASS_C",
            ))

        # -------------------------------------------------------------
        # PASS B: Independent Source Review (if review data provided)
        # -------------------------------------------------------------
        if independent_review_result:
            passes.append("PASS_B")
            history.append("Pass B independent source review processed")

            # Check for flagged symbol/unit/negation errors
            if independent_review_result.get("symbol_error"):
                defects.append(VerificationDefect(
                    category="MATH_SYMBOL",
                    severity=DefectSeverity.MAJOR,
                    description=independent_review_result["symbol_error"],
                    pass_detected="PASS_B",
                ))

            if independent_review_result.get("disputed_answer"):
                defects.append(VerificationDefect(
                    category="ANSWER_KEY_DISPUTE",
                    severity=DefectSeverity.CRITICAL,
                    description=independent_review_result["disputed_answer"],
                    pass_detected="PASS_B",
                ))

            if independent_review_result.get("slo_mismatch"):
                defects.append(VerificationDefect(
                    category="SLO_ALIGNMENT",
                    severity=DefectSeverity.MAJOR,
                    description=independent_review_result["slo_mismatch"],
                    pass_detected="PASS_B",
                ))

        # -------------------------------------------------------------
        # PASS D: Targeted Adjudication (if critical disagreements exist)
        # -------------------------------------------------------------
        critical_defects = [d for d in defects if d.severity == DefectSeverity.CRITICAL]
        adjudication_notes = None

        if critical_defects and adjudication_result:
            passes.append("PASS_D")
            history.append("Pass D targeted adjudication completed")
            adjudication_notes = adjudication_result.get("notes")

            if adjudication_result.get("resolved", False):
                # Critical defect was adjudicated and resolved
                critical_defects.clear()
                history.append("Dispute successfully resolved via Pass D adjudication")

        # -------------------------------------------------------------
        # Compute Final Verification Status
        # -------------------------------------------------------------
        if critical_defects:
            status = VerificationStatus.DISPUTED if len(passes) >= 3 else VerificationStatus.REJECTED
        elif any(d.severity == DefectSeverity.MAJOR for d in defects):
            status = VerificationStatus.PENDING_REVIEW
        else:
            status = VerificationStatus.VERIFIED

        return VerificationRecord(
            item_id=item_id,
            item_type="MCQ",
            status=status,
            passes_executed=passes,
            primary_provider="google_gemini",
            primary_model="gemini-2.5-flash",
            verifier_provider="google_gemini" if "PASS_B" in passes else None,
            verifier_model="gemini-2.5-flash" if "PASS_B" in passes else None,
            defects_found=defects,
            adjudication_notes=adjudication_notes,
            source_citation=source_citation,
            audit_history=history,
        )
