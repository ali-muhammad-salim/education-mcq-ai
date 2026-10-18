"""
Stage 8 – Diagram/Figure Extraction.

For every FIGURE-type region:
1. Crops the bounding box from the full page image
2. Saves it to media/diagrams/<doc_hash>/p<N>_r<M>.png
3. Populates DiagramRegion with media_path, caption, labels, description

The `description`, `labels`, and `associated_concept` fields are only
populated when the vision model was called for this region.

No fake labels are generated if the page does not contain them.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from PIL import Image

from services.ingestion.schemas import (
    BoundingBox,
    DiagramRegion,
    PageRegion,
    RegionType,
)
from services.ingestion.config import settings

logger = logging.getLogger(__name__)


def extract_diagram(
    region: PageRegion,
    page_image: Image.Image,
    doc_hash: str,
    page_number: int,
    vision_data: Optional[dict] = None,
) -> DiagramRegion:
    """
    Extract and save a diagram region from the page image.

    Parameters
    ----------
    region:
        The PageRegion with type FIGURE.
    page_image:
        The full rendered page PIL image.
    doc_hash:
        SHA-256 hex of the source document (used for directory naming).
    page_number:
        1-based page number.
    vision_data:
        Parsed vision model output dict (may be empty/None if not called).

    Returns
    -------
    DiagramRegion with media_path set.
    """
    bbox = region.bbox
    vision = vision_data or {}

    # Crop
    cropped = _crop_safe(page_image, bbox)

    # Save
    save_path = _save_diagram(cropped, doc_hash, page_number, region.region_id)

    # Populate from vision output — no fabrication
    description = vision.get("description", "")
    labels = vision.get("labels", [])          # empty list if not provided
    concept = vision.get("concept", "")

    # Validate: labels must be actual strings from the model
    if not isinstance(labels, list):
        labels = []
    labels = [str(lbl) for lbl in labels if lbl and isinstance(lbl, (str, int, float))]

    return DiagramRegion(
        region_id=region.region_id,
        type=RegionType.FIGURE,
        bbox=bbox,
        text=region.text,
        confidence=region.confidence,
        confidence_level=region.confidence_level,
        vision_used=region.vision_used,
        media_path=str(save_path) if save_path else None,
        caption=_find_caption(region),
        detected_labels=labels,
        description=description,
        associated_concept=concept,
    )


def _crop_safe(image: Image.Image, bbox: BoundingBox) -> Image.Image:
    """Crop with safe clamping to image bounds."""
    x0 = max(0, int(bbox.x0))
    y0 = max(0, int(bbox.y0))
    x1 = min(image.width, int(bbox.x1))
    y1 = min(image.height, int(bbox.y1))
    if x1 <= x0 or y1 <= y0:
        # Degenerate bbox — return a 1×1 white pixel
        return Image.new("RGB", (1, 1), (255, 255, 255))
    return image.crop((x0, y0, x1, y1))


def _save_diagram(
    image: Image.Image,
    doc_hash: str,
    page_number: int,
    region_id: str,
) -> Optional[Path]:
    """Save cropped diagram to the configured media directory."""
    try:
        out_dir = settings.media_root / settings.diagram_subdir / doc_hash[:16]
        out_dir.mkdir(parents=True, exist_ok=True)
        filename = f"p{page_number:04d}_{region_id}.png"
        out_path = out_dir / filename
        image.save(str(out_path), "PNG")
        return out_path
    except Exception as exc:
        logger.warning("Failed to save diagram image: %s", exc)
        return None


def _find_caption(region: PageRegion) -> str:
    """Extract caption text from the region text if it looks like a figure caption."""
    text = region.text.strip()
    if text.lower().startswith(("fig", "figure", "diagram", "image", "photo")):
        return text
    return ""
