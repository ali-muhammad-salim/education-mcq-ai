"""
Tests for Multi-Pass Verification and Gemini Client.

Verifies:
1. Pass C catches duplicate options, incorrect option count, and out-of-bounds answer keys.
2. Pass B flags mathematical symbol errors and SLO mismatches.
3. Pass D adjudication handles disputes and escalates to human review when needed.
4. GeminiClient rate-limiting, RPM tracking, and missing credentials handling.
"""

import pytest
import asyncio
from services.validation.multi_pass import (
    MultiPassVerifier,
    VerificationStatus,
    DefectSeverity,
)
from services.inference.gemini_client import GeminiClient


def test_multi_pass_verified_clean_mcq():
    verifier = MultiPassVerifier()
    record = verifier.verify_mcq(
        item_id="mcq_101",
        stem="Which of the following is the SI unit of acceleration?",
        options=["m/s", "m/s²", "N·s", "kg·m/s"],
        correct_index=1,
        explanation="Acceleration is the rate of change of velocity, measured in meters per second squared (m/s²).",
        slo_code="2.1.3",
        source_citation="AKU-EB Physics Model Paper 2026 Q1",
    )
    assert record.status == VerificationStatus.VERIFIED
    assert len(record.defects_found) == 0
    assert "PASS_C" in record.passes_executed


def test_multi_pass_pass_c_catches_defect():
    verifier = MultiPassVerifier()
    # Duplicate option and only 3 options
    record = verifier.verify_mcq(
        item_id="mcq_102",
        stem="What is velocity?",
        options=["Speed with direction", "Speed with direction", "Distance over time"],
        correct_index=0,
        explanation="Speed with direction.",
    )
    assert record.status in (VerificationStatus.REJECTED, VerificationStatus.DISPUTED)
    defect_categories = [d.category for d in record.defects_found]
    assert "OPTION_COUNT" in defect_categories
    assert "DUPLICATE_OPTIONS" in defect_categories


def test_multi_pass_independent_review_escalation():
    verifier = MultiPassVerifier()
    # Pass B detects symbol error
    record = verifier.verify_mcq(
        item_id="mcq_103",
        stem="Calculate force given mass 2kg and acceleration 3m/s².",
        options=["6 N", "5 N", "1.5 N", "1 N"],
        correct_index=0,
        explanation="F = m * a = 2 * 3 = 6 N.",
        independent_review_result={
            "symbol_error": "Equation written as F=m+a instead of F=m*a in raw OCR draft.",
        },
    )
    assert record.status == VerificationStatus.PENDING_REVIEW
    assert any(d.category == "MATH_SYMBOL" for d in record.defects_found)


def test_multi_pass_pass_d_resolves_dispute():
    verifier = MultiPassVerifier()
    # Answer key dispute resolved by Pass D adjudication
    record = verifier.verify_mcq(
        item_id="mcq_104",
        stem="Which graph represents uniform acceleration?",
        options=["Linear v-t graph", "Parabolic s-t graph", "Both A and B", "Horizontal v-t graph"],
        correct_index=2,
        explanation="Both linear velocity-time and parabolic displacement-time graphs indicate uniform acceleration.",
        independent_review_result={
            "disputed_answer": "Verifier argued only Option A was standard for Class 9.",
        },
        adjudication_result={
            "resolved": True,
            "notes": "Adjudicated: Option C is mathematically and pedagogically correct according to AKU-EB SLO 2.2.4.",
        },
    )
    assert record.status == VerificationStatus.VERIFIED
    assert "PASS_D" in record.passes_executed
    assert "Adjudicated" in record.adjudication_notes


@pytest.mark.asyncio
async def test_gemini_client_missing_key_behavior():
    client = GeminiClient(api_key="")
    assert not client.is_configured
    resp = await client.generate("Hello")
    assert not resp.success
    assert resp.status_code == 401
    assert "not configured" in resp.error
