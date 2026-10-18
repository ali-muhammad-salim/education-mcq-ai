"""
Stage 4: Syntax & Format Audit
"""

import re
from services.generation.schemas import MCQCandidate
from services.validation.base import MCQCritic
from services.validation.schemas import SyntaxFormatResult, ValidationStatus


class SyntaxFormatAudit(MCQCritic[SyntaxFormatResult]):
    """
    Checks for trailing spaces, missing labels, weird formatting, or unescaped LaTeX.
    """
    def __init__(self):
        pass
        
    async def evaluate(self, candidate: MCQCandidate) -> SyntaxFormatResult:
        issues = []
        
        # Check trailing/leading spaces
        if candidate.question != candidate.question.strip():
            issues.append("Question stem has leading or trailing whitespace.")
            
        for opt in candidate.options:
            if opt.text != opt.text.strip():
                issues.append(f"Option '{opt.text}' has leading or trailing whitespace.")
        
        # Check for empty fields
        if not candidate.question:
            issues.append("Question stem is empty.")
            
        if not candidate.explanation:
            issues.append("Explanation is empty.")
            
        # Check for unescaped latex brackets if this is a latex heavy subject (heuristic)
        if "\\[" in candidate.question and "\\]" not in candidate.question:
            issues.append("Unmatched LaTeX block \\[ without \\]")

        if issues:
            return SyntaxFormatResult(
                status=ValidationStatus.FAIL,
                reason=f"Found {len(issues)} formatting issues.",
                confidence=1.0,
                formatting_issues=issues
            )
            
        return SyntaxFormatResult(
            status=ValidationStatus.PASS,
            reason="Syntax and formatting look clean.",
            confidence=1.0,
            formatting_issues=[]
        )
