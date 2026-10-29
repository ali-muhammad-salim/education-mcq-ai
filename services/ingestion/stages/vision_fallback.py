"""
Stage 5 – Vision Fallback via Qwen3-VL through Ollama.

This stage is called ONLY when:
  - A region's OCR confidence is below the configured threshold
  - A region is classified as a figure/diagram
  - A formula confidence is below the formula threshold
  - A table structure appears unclear (merged cells, low confidence)

The vision model is called via the Ollama HTTP API so it shares the same
VRAM management infrastructure as the rest of the project.

The stage crops the relevant bounding box from the full page image, encodes
it as base64 PNG, and sends it to the model with a structured prompt
requesting JSON output.
"""

from __future__ import annotations

import base64
import io
import json
import logging
from typing import Any, Optional

import httpx
from PIL import Image

from services.ingestion.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Trigger conditions
# ---------------------------------------------------------------------------

def needs_vision_fallback(
    region_type: str,
    confidence: float,
) -> bool:
    """
    Determine whether the vision model should be invoked for a region.

    Parameters
    ----------
    region_type:
        The PaddleOCR block type string (e.g. "figure", "formula", "table").
    confidence:
        The OCR confidence score for this region.

    Returns
    -------
    True if the vision LLM should be called.
    """
    if not settings.vision_enabled:
        return False

    # Always invoke for diagrams / figures
    if region_type in ("figure", "image", "chart", "graph", "flowchart"):
        return True

    # Low confidence for any region type
    if confidence < settings.vision_confidence_threshold:
        return True

    # Formula-specific threshold
    if region_type == "formula" and confidence < settings.vision_formula_threshold:
        return True

    return False


# ---------------------------------------------------------------------------
# Vision model call
# ---------------------------------------------------------------------------

def call_vision_model(
    page_image: Image.Image,
    bbox: list[float],
    region_type: str,
    context_text: str = "",
) -> dict[str, Any]:
    """
    Crop the region from the page image and send it to the vision model.

    Parameters
    ----------
    page_image:
        Full rendered page PIL image.
    bbox:
        [x0, y0, x1, y1] pixel coordinates of the region to crop.
    region_type:
        The detected region type (influences the prompt).
    context_text:
        Any text already extracted by OCR (sent as additional context).

    Returns
    -------
    A dict with keys like:
      - "description"   (str)
      - "latex"         (str, for formulas)
      - "labels"        (list[str], for diagrams)
      - "concept"       (str)
      - "table_markdown" (str, for tables)
    """
    if not settings.vision_enabled:
        return {}

    cropped = _crop_region(page_image, bbox)
    image_b64 = _encode_image(cropped)
    prompt = _build_prompt(region_type, context_text)

    try:
        payload = {
            "model": settings.ollama_vision_model,
            "prompt": prompt,
            "images": [image_b64],
            "stream": False,
            "format": "json",
        }

        with httpx.Client(timeout=settings.ollama_timeout_seconds) as client:
            response = client.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        raw_response = data.get("response", "{}")
        return _parse_vision_response(raw_response, region_type)

    except httpx.ConnectError:
        logger.warning(
            "Ollama is not running at %s. Vision fallback skipped.",
            settings.ollama_base_url,
        )
        return {}
    except Exception as exc:
        logger.warning("Vision model call failed: %s", exc)
        return {}


def _crop_region(image: Image.Image, bbox: list[float]) -> Image.Image:
    """Crop and return the region, with a small padding."""
    x0, y0, x1, y1 = bbox
    pad = 4
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(image.width, x1 + pad)
    y1 = min(image.height, y1 + pad)
    return image.crop((int(x0), int(y0), int(x1), int(y1)))


def _encode_image(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _build_prompt(region_type: str, context_text: str) -> str:
    base = (
        "You are an educational document analysis assistant. "
        "Analyse the image region and return a JSON object with the relevant fields.\n\n"
    )

    if region_type == "formula":
        return base + (
            "This region contains a mathematical formula or equation. "
            "Return JSON with keys: "
            "\"latex\" (LaTeX string), "
            "\"display_form\" (plain text), "
            "\"description\" (brief description). "
            f"Context from OCR: \"{context_text}\""
        )

    if region_type == "chemical_equation":
        return base + (
            "This region contains a chemical equation. "
            "Return JSON with keys: "
            "\"display\" (as written), "
            "\"normalized\" (e.g. '2H2 + O2 -> 2H2O'), "
            "\"arrow\" (the reaction arrow symbol), "
            "\"state_symbols\" (list, e.g. ['(g)', '(l)']), "
            "\"description\"."
        )

    if region_type in ("figure", "image", "chart", "graph", "flowchart"):
        return base + (
            "This region contains a diagram, figure, or graph from an educational document. "
            "Return JSON with keys: "
            "\"description\" (1-3 sentences describing what is shown), "
            "\"labels\" (list of text labels visible inside the diagram, empty list if none), "
            "\"concept\" (the scientific/mathematical concept illustrated), "
            "\"diagram_type\" (e.g. 'circuit', 'graph', 'biological diagram', 'flowchart')."
        )

    if region_type == "table":
        return base + (
            "This region contains a table. "
            "Return JSON with keys: "
            "\"table_markdown\" (the table in Markdown format), "
            "\"description\" (what the table represents)."
        )

    # Generic low-confidence region
    return base + (
        "This region contains either complex layouts or handwritten text. "
        "It may contain English, Urdu, or Sindhi text. "
        "Transcribe any printed or handwritten text as accurately as possible and return JSON with: "
        "\"text\" (transcribed text), "
        "\"description\" (what type of content this appears to be)."
        f"Partial OCR output: \"{context_text}\""
    )


def _parse_vision_response(raw: str, region_type: str) -> dict[str, Any]:
    """Parse the JSON response from the vision model."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Model may have returned text with embedded JSON
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

    logger.warning("Vision model returned non-JSON response for %s", region_type)
    return {"description": raw.strip()[:500]}
