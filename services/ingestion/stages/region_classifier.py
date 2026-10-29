"""
Stage 6 – Region Classification.

Maps raw PaddleOCR / PP-StructureV3 block types to the project's
typed `RegionType` enum and builds typed `PageRegion` objects.

Also applies heuristics to detect:
- Page headers and footers (by vertical position)
- Page numbers (by font + position)
- MCQ options (lettered options A/B/C/D)
- Chemical equations (subscripts + reaction arrows)
"""

from __future__ import annotations

import re
import logging
import uuid
from typing import Optional
import numpy as np

from services.ingestion.schemas import (
    BoundingBox,
    PageRegion,
    RegionType,
    classify_confidence,
)
from services.ingestion.stages.ocr import RawBlock

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PaddleOCR / PP-Structure type → RegionType mapping
# ---------------------------------------------------------------------------

_PP_TYPE_MAP: dict[str, RegionType] = {
    "title":        RegionType.HEADING,
    "text":         RegionType.PARAGRAPH,
    "list":         RegionType.LIST,
    "table":        RegionType.TABLE,
    "figure":       RegionType.FIGURE,
    "figure_caption": RegionType.CAPTION,
    "formula":      RegionType.FORMULA,
    "header":       RegionType.HEADER,
    "footer":       RegionType.FOOTER,
    "reference":    RegionType.PARAGRAPH,
    "equation":     RegionType.FORMULA,
}

# Regex for chemical equations.
# Matches:
#   - Classic:  H₂ + O₂ →   (element symbol optionally preceded by coefficient)
#   - Arrow-anchored: any text containing a reaction arrow is chemical
_CHEM_PATTERN = re.compile(
    r"(?:\d*\s*[A-Z][a-z]?[\d₀₁₂₃₄₅₆₇₈₉]*\s*(?:\+|-)\s*)*"
    r"\d*\s*[A-Z][a-z]?[\d₀₁₂₃₄₅₆₇₈₉]*"
    r"\s*(?:→|->|⟶|⇌|↔)",
    re.UNICODE,
)

# Regex for MCQ options
_MCQ_OPTION_PATTERN = re.compile(
    r"^\s*(?:\(([A-Da-d])\)|([A-Da-d])[\.\)])\s+",
)

# Page number heuristic: short text at very top or bottom
_PAGE_NUMBER_PATTERN = re.compile(r"^\s*\d{1,4}\s*$")


def classify_blocks(
    blocks: list[RawBlock],
    page_height: int,
    page_width: int,
    page_index: int,
) -> list[PageRegion]:
    """
    Convert raw OCR blocks into typed PageRegion objects.

    Parameters
    ----------
    blocks:
        Raw blocks from the OCR stage.
    page_height, page_width:
        Pixel dimensions of the page (used for header/footer heuristics).
    page_index:
        0-based page index (used for region_id generation).

    Returns
    -------
    List of PageRegion objects (unsorted; reading order applied later).
    """
    regions: list[PageRegion] = []

    for block_idx, block in enumerate(blocks):
        region_id = f"p{page_index + 1}_r{block_idx + 1}"
        region_type = _determine_type(block, page_height, page_width)
        bbox = BoundingBox(
            x0=block.bbox[0],
            y0=block.bbox[1],
            x1=block.bbox[2],
            y1=block.bbox[3],
        )

        region = PageRegion(
            region_id=region_id,
            type=region_type,
            bbox=bbox,
            text=block.text,
            confidence=block.confidence,
            confidence_level=classify_confidence(block.confidence),
            raw_ocr=_clean_raw_ocr(block.raw),
        )
        
        # Aggressive junk filtering: drop paragraph regions that are just noise
        if region_type in (RegionType.PARAGRAPH, RegionType.UNKNOWN):
            cleaned_text = re.sub(r'[\W_]+', '', block.text)
            if len(cleaned_text) < 2 and not block.text.strip().isdigit():
                continue # Skip adding this region

        regions.append(region)

    return regions


def _determine_type(
    block: RawBlock,
    page_height: int,
    page_width: int,
) -> RegionType:
    """Apply type mapping + heuristic overrides."""
    # Start with the PP-Structure type
    base_type = _PP_TYPE_MAP.get(block.block_type.lower(), RegionType.UNKNOWN)
    text = block.text.strip()

    if not text and base_type not in (RegionType.TABLE, RegionType.FIGURE):
        return base_type

    # Chemical equation override (check before formula)
    if base_type in (RegionType.PARAGRAPH, RegionType.FORMULA, RegionType.UNKNOWN):
        if _CHEM_PATTERN.search(text):
            return RegionType.CHEMICAL_EQUATION

    # MCQ option override
    if base_type in (RegionType.PARAGRAPH, RegionType.UNKNOWN):
        if _MCQ_OPTION_PATTERN.match(text):
            return RegionType.MCQ_OPTION

    # Page number override: short text at very top or very bottom
    if base_type in (RegionType.PARAGRAPH, RegionType.UNKNOWN, RegionType.HEADER, RegionType.FOOTER):
        if _PAGE_NUMBER_PATTERN.match(text):
            y_center = (block.bbox[1] + block.bbox[3]) / 2
            if y_center < page_height * 0.08 or y_center > page_height * 0.92:
                return RegionType.PAGE_NUMBER

    # Header / footer by position
    if base_type in (RegionType.PARAGRAPH, RegionType.UNKNOWN):
        y_center = (block.bbox[1] + block.bbox[3]) / 2
        if y_center < page_height * 0.06:
            return RegionType.HEADER
        if y_center > page_height * 0.94:
            return RegionType.FOOTER

    return base_type

def _clean_raw_ocr(raw):
    """Recursively converts numpy arrays and scalars to standard Python types for JSON serialization."""
    if isinstance(raw, np.ndarray):
        return raw.tolist()
    elif isinstance(raw, dict):
        return {k: _clean_raw_ocr(v) for k, v in raw.items()}
    elif isinstance(raw, list):
        return [_clean_raw_ocr(x) for x in raw]
    elif isinstance(raw, tuple):
        return tuple(_clean_raw_ocr(x) for x in raw)
    elif isinstance(raw, np.generic):
        return raw.item()
    return raw

