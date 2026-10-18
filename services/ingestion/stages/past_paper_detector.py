"""
Stage 11 – Past-Paper Structure Detection.

Scans the regions of a page to detect past-paper structure:
- Section markers (Section A, Section B, …)
- Question numbers  (Q1, Q.1, Question 1, 1.)
- Sub-question numbers  ((a), (b)(i), (ii))
- Marks  ([2], [3 marks], (4 marks))
- MCQ options (A / B / C / D)
- Associated diagrams, formulas, tables

Detected questions are promoted to QuestionRegion objects and linked to
their source PageRegion (preserving bounding box and page reference).
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from services.ingestion.schemas import (
    BoundingBox,
    MCQOption,
    PageRegion,
    QuestionRegion,
    RegionType,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

_SECTION_PATTERN = re.compile(
    r"\b(?:Section|SECTION|Part|PART)\s+([A-Z])\b",
)
_QUESTION_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:Q\.?|Question\s+)?(\d{1,3})\s*[\.\):]",
    re.IGNORECASE | re.MULTILINE,
)
_SUBQ_PATTERN = re.compile(
    r"\(\s*([a-z]{1,3}(?:\s*\([ivxIVX]+\))?)\s*\)",
)
_MARKS_PATTERN = re.compile(
    r"\[\s*(\d+)\s*(?:marks?)?\s*\]|\(\s*(\d+)\s*(?:marks?)\s*\)",
    re.IGNORECASE,
)
_MCQ_OPTION_PATTERN = re.compile(
    r"^\s*(?:\(([A-Da-d])\)|([A-Da-d])[\.\)])\s+(.+)$",
    re.MULTILINE,
)


def detect_questions(
    regions: list[PageRegion],
    page_number: int,
    doc_type: str = "PAST_PAPER",
    current_section: str = "",
    pending_question: Optional[QuestionRegion] = None,
) -> tuple[list[PageRegion], str, Optional[QuestionRegion]]:
    """
    Scan regions and promote question regions to QuestionRegion objects.

    Parameters
    ----------
    regions:
        Ordered list of PageRegion objects (after reading-order sort).
    page_number:
        1-based page number.
    doc_type:
        "PAST_PAPER" enables aggressive question detection;
        "BOOK" uses lighter touch (exercise detection only).
    current_section:
        Section carried over from the previous page (e.g. "Section B").

    Returns
    -------
    (updated_regions, current_section, pending_question)
    """
    updated: list[PageRegion] = []
    mcq_options_buffer: list[MCQOption] = []

    for region in regions:
        text = region.text.strip()

        # Detect section marker
        sec_match = _SECTION_PATTERN.search(text)
        if sec_match:
            current_section = f"Section {sec_match.group(1)}"

        # If this is an MCQ option, accumulate it
        if region.type == RegionType.MCQ_OPTION:
            opt = _parse_mcq_option(region)
            if opt:
                mcq_options_buffer.append(opt)
            updated.append(region)
            continue

        # Try to detect question number in any paragraph-like region
        if region.type in (
            RegionType.PARAGRAPH,
            RegionType.QUESTION,
            RegionType.HEADING,
        ):
            q_match = _QUESTION_PATTERN.search(text)
            if q_match and doc_type == "PAST_PAPER":
                # Flush previous pending question first
                if pending_question is not None:
                    _attach_options(pending_question, mcq_options_buffer)
                    _infer_question_type_and_space(pending_question, region)
                    mcq_options_buffer = []

                qnum = q_match.group(1)
                subq, marks = _extract_subq_marks(text)

                pending_question = QuestionRegion(
                    region_id=region.region_id,
                    type=RegionType.QUESTION,
                    bbox=region.bbox,
                    text=region.text,
                    confidence=region.confidence,
                    confidence_level=region.confidence_level,
                    question_number=qnum,
                    sub_question_number=subq,
                    section=current_section,
                    marks=marks,
                    question_text=text,
                )
                
                # Immediately append the new question to THIS page's updated list.
                # Since it's a reference, future modifications (like adding options from the next page)
                # will reflect in this object, even though it's already in the list!
                updated.append(pending_question)
                continue

        # Attach associated regions to pending question
        if pending_question is not None:
            if region.type == RegionType.FIGURE:
                pending_question.has_diagram = True
            elif region.type in (RegionType.FORMULA, RegionType.CHEMICAL_EQUATION):
                pending_question.has_formula = True
            elif region.type == RegionType.TABLE:
                pending_question.has_table = True

        updated.append(region)

    # We do NOT append the final pending question at the end of the page anymore,
    # because it was already appended when it was created! We just attach any remaining
    # MCQ options from this page to it.
    if pending_question is not None:
        if mcq_options_buffer:
            # We must extend the options if options already exist from previous pages
            if pending_question.options:
                pending_question.options.extend(mcq_options_buffer)
            else:
                _attach_options(pending_question, mcq_options_buffer)
                
        _infer_question_type_and_space(pending_question, None)

    return updated, current_section, pending_question


def _extract_subq_marks(text: str) -> tuple[str, Optional[float]]:
    """Extract sub-question identifier and marks from text."""
    subq = ""
    marks: Optional[float] = None

    subq_match = _SUBQ_PATTERN.search(text)
    if subq_match:
        subq = subq_match.group(1).strip()

    marks_match = _MARKS_PATTERN.search(text)
    if marks_match:
        raw = marks_match.group(1) or marks_match.group(2)
        if raw:
            try:
                marks = float(raw)
            except ValueError:
                pass

    return subq, marks


def _parse_mcq_option(region: PageRegion) -> Optional[MCQOption]:
    """Parse an MCQ option region into an MCQOption."""
    text = region.text.strip()
    match = _MCQ_OPTION_PATTERN.match(text)
    if not match:
        return None
    label = (match.group(1) or match.group(2) or "?").upper()
    body = match.group(3).strip()
    return MCQOption(label=label, text=body, bbox=region.bbox)


def _attach_options(
    question: QuestionRegion,
    options: list[MCQOption],
) -> None:
    """Attach collected MCQ options to the question."""
    question.options = options


def _infer_question_type_and_space(
    question: QuestionRegion,
    next_region: Optional[PageRegion] = None,
) -> None:
    """Infer the question type and calculate the answer space bounds."""
    if question.options:
        question.question_type = "MCQ_SINGLE"
    elif not question.question_type:
        if question.marks and question.marks >= 4:
            question.question_type = "ERQ"
        else:
            question.question_type = "CRQ"
            
    if next_region and question.question_type != "MCQ_SINGLE":
        question.answer_space_y0 = question.bbox.y1
        question.answer_space_y1 = next_region.bbox.y0
