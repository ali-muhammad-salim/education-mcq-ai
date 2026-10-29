"""
Stage 10 – Reading Order Reconstruction.

Re-sorts detected regions into natural reading order:
- Top-to-bottom as the primary sort
- Left-to-right within horizontal bands
- Multi-column detection: if two regions share a similar Y range, the
  left column comes first

This stage does NOT modify region content — it only reorders the list.
"""

from __future__ import annotations

from services.ingestion.schemas import PageRegion


_COLUMN_BAND_TOLERANCE = 0.05  # 5% of page width overlap to detect columns


def reconstruct_reading_order(
    regions: list[PageRegion],
    page_width: int,
    page_height: int,
) -> list[PageRegion]:
    """
    Sort `regions` into natural reading order for the given page.

    Parameters
    ----------
    regions:
        Classified regions (output of region_classifier stage).
    page_width, page_height:
        Pixel dimensions of the page.

    Returns
    -------
    New list of regions in reading order.
    """
    if not regions:
        return regions

    # Sort by vertical stripe first, then x within stripe
    stripe_height = max(1, page_height // 40)  # ~2.5% of page height per stripe

    def sort_key(r: PageRegion) -> tuple:
        y_mid = (r.bbox.y0 + r.bbox.y1) / 2
        x_mid = (r.bbox.x0 + r.bbox.x1) / 2
        stripe = int(y_mid / stripe_height)
        return (stripe, x_mid)

    return sorted(regions, key=sort_key)
