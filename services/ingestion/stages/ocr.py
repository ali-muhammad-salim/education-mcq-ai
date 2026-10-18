"""
Stage 4 – OCR and Layout Analysis via PaddleOCR + PP-StructureV3.

This is the primary document processing stage.  It performs:

1. Layout detection  – identifies bounding boxes and region types
   (title, text, table, figure, formula)
2. OCR              – extracts text from each region
3. Table parsing    – converts table regions to HTML/Markdown
4. Formula parsing  – extracts mathematical expressions

All raw PaddleOCR / PP-Structure output is normalised into a list of
``RawBlock`` objects that the downstream classifiers and extractors consume.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class RawBlock:
    """
    A single block returned by PaddleOCR / PP-StructureV3.

    Fields map as closely as possible to the PaddleOCR output dicts
    so we can pass them to downstream stages without loss.
    """

    block_type: str                 # "text", "title", "table", "figure", "formula"
    bbox: list[float]               # [x0, y0, x1, y1]
    text: str = ""
    confidence: float = 0.0
    html: str = ""                  # for table blocks
    cells: list[dict] = field(default_factory=list)  # parsed table cells
    raw: dict[str, Any] = field(default_factory=dict)  # original PP-Structure dict


def run_ocr(
    pil_image: Image.Image,
    use_gpu: bool = False,
    lang: str = "en",
) -> list[RawBlock]:
    """
    Run PP-StructureV3 layout + OCR on a rendered page image.

    Returns a list of RawBlock objects in the order returned by PaddleOCR.
    If PaddleOCR is not installed, falls back to an empty list so the
    pipeline continues (vision fallback will pick up the slack).
    """
    try:
        from paddleocr import PPStructureV3 as PPStructureClass
    except ImportError:
        try:
            from paddleocr import PPStructure as PPStructureClass
        except ImportError:
            logger.warning(
                "PaddleOCR not installed; OCR stage skipped. "
                "Install with: pip install paddleocr paddlepaddle"
            )
            return []

    global _GLOBAL_PP_STRUCTURE_ENGINE
    if '_GLOBAL_PP_STRUCTURE_ENGINE' not in globals() or _GLOBAL_PP_STRUCTURE_ENGINE is None:
        try:
            _GLOBAL_PP_STRUCTURE_ENGINE = PPStructureClass(
                show_log=False,
            )
        except Exception as exc:
            logger.error("PP-Structure Initialization failed: %s", exc)
            return []

    try:
        engine = _GLOBAL_PP_STRUCTURE_ENGINE

        img_array = np.array(pil_image)
        # PPStructure in older versions uses __call__
        if hasattr(engine, 'predict'):
            results = engine.predict(img_array)
        else:
            results = engine(img_array)
        
        # Depending on PaddleX version, results might be a list or a single result object.
        if hasattr(results, 'keys') or hasattr(results, 'json'):
            results = [results]
        elif not isinstance(results, list):
            results = list(results)

        blocks: list[RawBlock] = []
        for item in results:
            if hasattr(item, 'json'):
                item_dict = item.json
                res_data = item_dict.get('res', {})
                if 'parsing_res_list' in res_data:
                    for block_data in res_data['parsing_res_list']:
                        b_type = block_data.get('block_label', 'text').lower()
                        b_bbox = block_data.get('block_bbox', [0, 0, 0, 0])
                        b_text = block_data.get('block_content', '')
                        
                        html = ""
                        cells = []
                        if b_type == 'table':
                            if isinstance(b_text, str) and (b_text.strip().startswith('<html') or b_text.strip().startswith('<table')):
                                html = b_text
                                b_text = ""
                        
                        blocks.append(RawBlock(
                            block_type=b_type,
                            bbox=[float(x) for x in b_bbox],
                            text=b_text.strip(),
                            confidence=1.0,  # PaddleX doesn't give block-level scores in parsing_res_list
                            html=html,
                            cells=cells,
                            raw=block_data
                        ))
                    continue
                # If no parsing_res_list, fallback to dict parsing
                item = item_dict
                
            block = _parse_pp_structure_item(item)
            blocks.append(block)

        return blocks

    except Exception as exc:
        logger.error("PP-StructureV3 OCR failed: %s", exc, exc_info=True)
        return []


def _parse_pp_structure_item(item: dict[str, Any]) -> RawBlock:
    """Convert a PP-StructureV3 result dict into a RawBlock."""
    block_type = item.get("type", "text").lower()
    bbox_raw = item.get("bbox", [0, 0, 0, 0])

    # PP-Structure bbox can be [x0, y0, x1, y1] directly
    if len(bbox_raw) == 4:
        bbox = [float(v) for v in bbox_raw]
    else:
        bbox = [0.0, 0.0, 0.0, 0.0]

    # Extract text and confidence from nested OCR result
    text = ""
    confidence = 0.0
    res = item.get("res", {})

    if block_type in ("text", "title", "formula"):
        if isinstance(res, list):
            # List of (text, score) tuples from PP-OCR
            texts = []
            scores = []
            for entry in res:
                if isinstance(entry, (list, tuple)) and len(entry) >= 2:
                    t, s = entry[0], entry[1]
                    if isinstance(t, str):
                        texts.append(t)
                    if isinstance(s, (int, float)):
                        scores.append(float(s))
            text = " ".join(texts)
            confidence = float(np.mean(scores)) if scores else 0.0
        elif isinstance(res, dict):
            text = res.get("text", "")
            confidence = float(res.get("score", 0.0))

    # Table: PP-Structure gives HTML
    html = ""
    cells: list[dict] = []
    if block_type == "table":
        if isinstance(res, dict):
            html = res.get("html", "")
            cells = res.get("cells", [])

    return RawBlock(
        block_type=block_type,
        bbox=bbox,
        text=text.strip(),
        confidence=confidence,
        html=html,
        cells=cells,
        raw=item,
    )


# ---------------------------------------------------------------------------
# Fallback: plain PaddleOCR text extraction (no layout)
# Used when PP-StructureV3 is not available or fails
# ---------------------------------------------------------------------------

def run_plain_ocr(
    pil_image: Image.Image,
    use_gpu: bool = False,
    lang: str = "en",
) -> list[RawBlock]:
    """
    Fallback plain OCR using PaddleOCR (no layout segmentation).

    Returns each detected text line as a ``RawBlock`` with type="text".
    """
    try:
        from paddleocr import PaddleOCR
    except ImportError:
        return []

    global _GLOBAL_PLAIN_OCR
    if '_GLOBAL_PLAIN_OCR' not in globals() or _GLOBAL_PLAIN_OCR is None:
        try:
            _GLOBAL_PLAIN_OCR = PaddleOCR(use_angle_cls=False, lang=lang)
        except Exception as exc:
            logger.error("PaddleOCR plain Initialization failed: %s", exc)
            return []

    try:
        ocr = _GLOBAL_PLAIN_OCR
        img_array = np.array(pil_image)
        result = ocr.ocr(img_array, cls=False)

        if not result:
            return []

        blocks: list[RawBlock] = []
        for line in result[0] or []:
            # line: [[[x0,y0],[x1,y0],[x1,y1],[x0,y1]], (text, score)]
            quad, (text, score) = line
            xs = [p[0] for p in quad]
            ys = [p[1] for p in quad]
            bbox = [min(xs), min(ys), max(xs), max(ys)]
            blocks.append(
                RawBlock(
                    block_type="text",
                    bbox=bbox,
                    text=text,
                    confidence=float(score),
                )
            )
        return blocks

    except Exception as exc:
        logger.error("Plain OCR fallback failed: %s", exc)
        return []
