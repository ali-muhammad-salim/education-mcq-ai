"""
Paper Metadata Extractor.

Extracts and validates PaperMetadata from:
  - A raw text string (first few pages of a past paper)
  - A filename / path string

Rules
-----
* Fields extracted via regex / heuristics are marked is_inferred=True.
* Fields explicitly supplied by the caller (metadata_hint) are marked
  is_inferred=False.
* The caller is ALWAYS told which fields need verification.
* Never silently promote an inferred value to verified status.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional

from services.past_paper.schemas import MetadataField, PaperMetadata

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Board name patterns
# ---------------------------------------------------------------------------

_BOARD_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Federal
    (re.compile(r"\bFBISE\b|\bFederal\s+Board\b", re.IGNORECASE), "FBISE"),
    # Punjab boards
    (re.compile(r"\bBISE\s*Lahore\b|\bLahore\s+Board\b", re.IGNORECASE), "BISE-Lahore"),
    (re.compile(r"\bBISE\s*Gujranwala\b", re.IGNORECASE), "BISE-Gujranwala"),
    (re.compile(r"\bBISE\s*Rawalpindi\b", re.IGNORECASE), "BISE-Rawalpindi"),
    (re.compile(r"\bBISE\s*Faisalabad\b", re.IGNORECASE), "BISE-Faisalabad"),
    (re.compile(r"\bBISE\s*Multan\b", re.IGNORECASE), "BISE-Multan"),
    (re.compile(r"\bBISE\s*Sahiwal\b", re.IGNORECASE), "BISE-Sahiwal"),
    (re.compile(r"\bBISE\s*Bahawalpur\b", re.IGNORECASE), "BISE-Bahawalpur"),
    (re.compile(r"\bBISE\s*DG\s*Khan\b|\bBISE\s*Dera\s*Ghazi\b", re.IGNORECASE), "BISE-DGKhan"),
    (re.compile(r"\bBISE\s*Sargodha\b", re.IGNORECASE), "BISE-Sargodha"),
    # Sindh
    (re.compile(r"\bBISE\s*Karachi\b|\bKarachi\s+Board\b", re.IGNORECASE), "BISE-Karachi"),
    (re.compile(r"\bBISE\s*Hyderabad\b", re.IGNORECASE), "BISE-Hyderabad"),
    (re.compile(r"\bBISE\s*Sukkur\b", re.IGNORECASE), "BISE-Sukkur"),
    # KPK
    (re.compile(r"\bBISE\s*Peshawar\b", re.IGNORECASE), "BISE-Peshawar"),
    (re.compile(r"\bBISE\s*Mardan\b", re.IGNORECASE), "BISE-Mardan"),
    # Balochistan
    (re.compile(r"\bBISE\s*Quetta\b", re.IGNORECASE), "BISE-Quetta"),
    # International
    (re.compile(r"\bCambridge\b|\bCIE\b|\bO[\s-]?Level\b", re.IGNORECASE), "Cambridge"),
    (re.compile(r"\bAKU[\s-]?EB\b|\bAga\s+Khan\b", re.IGNORECASE), "AKU-EB"),
    # Generic BISE (fallback)
    (re.compile(r"\bBISE\b", re.IGNORECASE), "BISE"),
]

# ---------------------------------------------------------------------------
# Year pattern — 4-digit years 2000–2030
# ---------------------------------------------------------------------------

_YEAR_PATTERN = re.compile(r"\b(20[0-2]\d)\b")

# ---------------------------------------------------------------------------
# Session patterns
# ---------------------------------------------------------------------------

_SESSION_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bModel[\s_-]?Paper\b|\bSample[\s_-]?Paper\b|\bSpecimen[\s_-]?Paper\b", re.IGNORECASE), "Model Paper"),
    (re.compile(r"\bAnnual\b", re.IGNORECASE), "Annual"),
    (re.compile(r"\bSupplementar(?:y|ies)\b|\bSupp\b", re.IGNORECASE), "Supplementary"),
    (re.compile(r"\bSpring\b", re.IGNORECASE), "Spring"),
    (re.compile(r"\bWinter\b", re.IGNORECASE), "Winter"),
    (re.compile(r"\bAutumn\b", re.IGNORECASE), "Autumn"),
    (re.compile(r"\bSummer\b", re.IGNORECASE), "Summer"),
]

# ---------------------------------------------------------------------------
# Subject patterns
# ---------------------------------------------------------------------------

_SUBJECT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bPhysics\b", re.IGNORECASE), "Physics"),
    (re.compile(r"\bChemistry\b", re.IGNORECASE), "Chemistry"),
    (re.compile(r"\bBiology\b", re.IGNORECASE), "Biology"),
    (re.compile(r"\bMathematics\b|\bMaths?\b", re.IGNORECASE), "Mathematics"),
    (re.compile(r"\bComputer\s+Science\b|\bCS\b", re.IGNORECASE), "Computer Science"),
    (re.compile(r"\bEnglish\b", re.IGNORECASE), "English"),
    (re.compile(r"\bUrdu\b", re.IGNORECASE), "Urdu"),
    (re.compile(r"\bIslamiat\b|\bIslamic\s+Studies\b", re.IGNORECASE), "Islamiat"),
    (re.compile(r"\bPakistan\s+Studies\b", re.IGNORECASE), "Pakistan Studies"),
]

# ---------------------------------------------------------------------------
# Class level patterns
# ---------------------------------------------------------------------------

_CLASS_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\b(?:Class|Grade|Std\.?|Standard)\s*(9|IX)\b", re.IGNORECASE), "9"),
    (re.compile(r"\b(?:Class|Grade|Std\.?|Standard)\s*(10|X)\b", re.IGNORECASE), "10"),
    (re.compile(r"\b(?:Class|Grade|Std\.?|Standard)\s*(11|XI)\b", re.IGNORECASE), "11"),
    (re.compile(r"\b(?:Class|Grade|Std\.?|Standard)\s*(12|XII)\b", re.IGNORECASE), "12"),
    (re.compile(r"\bMatric(?:ulation)?\b", re.IGNORECASE), "10"),
    (re.compile(r"\bO[\s-]Level\b", re.IGNORECASE), "O-Level"),
    (re.compile(r"\bA[\s-]Level\b", re.IGNORECASE), "A-Level"),
]

# Paper type
_PAPER_TYPE_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bModel[\s_-]?Paper\b|\bSpecimen[\s_-]?Paper\b", re.IGNORECASE), "Model Paper"),
    (re.compile(r"\bMCQ\b|\bObjective\b", re.IGNORECASE), "MCQ"),
    (re.compile(r"\bSubjective\b|\bTheory\b|\bLong\s+Question\b", re.IGNORECASE), "Subjective"),
    (re.compile(r"\bPaper[\s-]?I\b|\bPart[\s-]?I\b", re.IGNORECASE), "Paper-I"),
    (re.compile(r"\bPaper[\s-]?II\b|\bPart[\s-]?II\b", re.IGNORECASE), "Paper-II"),
]

# Paper code
_PAPER_CODE_PATTERN = re.compile(r"\b([A-Z]{2,4}[\s-]?\d{3,5}[A-Z]?)\b")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_metadata(
    text: str = "",
    filename: str = "",
    metadata_hint: Optional[dict[str, Any]] = None,
) -> PaperMetadata:
    """
    Extract PaperMetadata from raw text and/or filename.

    Parameters
    ----------
    text:
        Raw text from the first pages of the past paper.
    filename:
        Filename or path (used as supplementary signal).
    metadata_hint:
        Caller-supplied overrides.  These are treated as VERIFIED (is_inferred=False).
        Keys: board, class_level, subject, year, session, paper_type, paper_code.

    Returns
    -------
    PaperMetadata with every field tagged is_inferred=True/False and
    `verification_required` listing all inferred fields.
    """
    hint = metadata_hint or {}
    combined = (text + " " + filename).strip()

    def _inferred(value: Optional[str], confidence: float = 0.8) -> MetadataField:
        return MetadataField(value=value, is_inferred=True, inference_confidence=confidence)

    def _verified(value: str) -> MetadataField:
        return MetadataField(value=value, is_inferred=False, inference_confidence=1.0)

    # ----- board -----
    if "board" in hint:
        board_field = _verified(str(hint["board"]))
    else:
        board_val = _match_first(combined, _BOARD_PATTERNS)
        board_field = _inferred(board_val, 0.85) if board_val else _inferred(None, 0.0)

    # ----- class_level -----
    if "class_level" in hint:
        class_field = _verified(str(hint["class_level"]))
    else:
        class_val = _match_first(combined, _CLASS_PATTERNS)
        class_field = _inferred(class_val, 0.80) if class_val else _inferred(None, 0.0)

    # ----- subject -----
    if "subject" in hint:
        subject_field = _verified(str(hint["subject"]))
    else:
        subject_val = _match_first(combined, _SUBJECT_PATTERNS)
        subject_field = _inferred(subject_val, 0.90) if subject_val else _inferred(None, 0.0)

    # ----- year -----
    if "year" in hint:
        year_field = _verified(str(hint["year"]))
    else:
        year_match = _YEAR_PATTERN.search(combined)
        year_field = (
            _inferred(year_match.group(1), 0.90)
            if year_match
            else _inferred(None, 0.0)
        )

    # ----- session -----
    if "session" in hint:
        session_field = _verified(str(hint["session"]))
    else:
        session_val = _match_first(combined, _SESSION_PATTERNS)
        session_field = _inferred(session_val, 0.75) if session_val else _inferred(None, 0.0)

    # ----- paper_type -----
    if "paper_type" in hint:
        paper_type_field = _verified(str(hint["paper_type"]))
    else:
        pt_val = _match_first(combined, _PAPER_TYPE_PATTERNS)
        paper_type_field = _inferred(pt_val, 0.75) if pt_val else _inferred(None, 0.0)

    # ----- paper_code -----
    if "paper_code" in hint:
        paper_code_field = _verified(str(hint["paper_code"]))
    else:
        pc_match = _PAPER_CODE_PATTERN.search(combined)
        paper_code_field = (
            _inferred(pc_match.group(1), 0.60)
            if pc_match
            else _inferred(None, 0.0)
        )

    # Build verification_required list
    all_fields = {
        "board": board_field,
        "class_level": class_field,
        "subject": subject_field,
        "year": year_field,
        "session": session_field,
        "paper_type": paper_type_field,
        "paper_code": paper_code_field,
    }
    verification_required = [
        name for name, f in all_fields.items()
        if f.is_inferred and f.value is not None
    ]

    if verification_required:
        logger.info(
            "Metadata extraction: the following fields are INFERRED and need verification: %s",
            verification_required,
        )

    return PaperMetadata(
        board=board_field,
        class_level=class_field,
        subject=subject_field,
        year=year_field,
        session=session_field,
        paper_type=paper_type_field,
        paper_code=paper_code_field,
        verification_required=verification_required,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _match_first(
    text: str,
    patterns: list[tuple[re.Pattern, str]],
) -> Optional[str]:
    for pattern, label in patterns:
        if pattern.search(text):
            return label
    return None
