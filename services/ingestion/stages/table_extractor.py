"""
Stage 9 – Table Extraction.

Converts TABLE-type PageRegion objects (which carry PP-StructureV3 HTML)
into TableRegionSchema objects with:

- Parsed header row
- Parsed data rows
- Markdown representation
- Optional vision model enhancement for unclear cell merges
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from services.ingestion.schemas import (
    PageRegion,
    RegionType,
    TableData,
    TableRegionSchema,
)
from services.ingestion.stages.ocr import RawBlock

logger = logging.getLogger(__name__)


def extract_table(
    region: PageRegion,
    raw_block: Optional[RawBlock] = None,
    vision_data: Optional[dict] = None,
) -> TableRegionSchema:
    """
    Convert a TABLE region into a structured TableRegionSchema.

    Parameters
    ----------
    region:
        The PageRegion with type TABLE.
    raw_block:
        The original OCR RawBlock (carries HTML from PP-StructureV3).
    vision_data:
        Optional dict from vision model (used if table structure is unclear).

    Returns
    -------
    TableRegionSchema with headers, rows, markdown, html.
    """
    html = ""
    if raw_block:
        html = raw_block.html

    vision = vision_data or {}

    # Vision model can provide a cleaner markdown representation
    if vision.get("table_markdown"):
        table_data = _parse_markdown_table(vision["table_markdown"])
        table_data.html = html
    elif html:
        table_data = _parse_html_table(html)
    else:
        # Fallback: treat text as a simple one-column table
        table_data = TableData(
            headers=[],
            rows=[[line] for line in region.text.splitlines() if line.strip()],
            markdown=region.text,
            html="",
        )

    return TableRegionSchema(
        region_id=region.region_id,
        type=RegionType.TABLE,
        bbox=region.bbox,
        text=region.text,
        confidence=region.confidence,
        confidence_level=region.confidence_level,
        vision_used=region.vision_used,
        table_data=table_data,
    )


# ---------------------------------------------------------------------------
# HTML → structured table parser
# ---------------------------------------------------------------------------

def _parse_html_table(html: str) -> TableData:
    """
    Parse an HTML table string into rows and headers.

    Uses a simple regex-based approach that avoids an HTML parser dependency.
    """
    try:
        # Extract all rows
        row_pattern = re.compile(r"<tr[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
        cell_pattern = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)
        tag_pattern = re.compile(r"<[^>]+>")

        rows_html = row_pattern.findall(html)
        all_rows: list[list[str]] = []

        for row_html in rows_html:
            cells = cell_pattern.findall(row_html)
            cleaned = [tag_pattern.sub("", cell).strip() for cell in cells]
            if any(cleaned):
                all_rows.append(cleaned)

        if not all_rows:
            return TableData(html=html)

        # Detect header: first row if it uses <th> tags
        headers: list[str] = []
        data_rows: list[list[str]] = all_rows

        first_row_html = rows_html[0] if rows_html else ""
        if "<th" in first_row_html.lower():
            headers = all_rows[0]
            data_rows = all_rows[1:]

        markdown = _to_markdown(headers, data_rows)

        return TableData(
            headers=headers,
            rows=data_rows,
            markdown=markdown,
            html=html,
        )

    except Exception as exc:
        logger.warning("HTML table parsing failed: %s", exc)
        return TableData(html=html)


def _parse_markdown_table(md: str) -> TableData:
    """Parse a Markdown table string into headers and rows."""
    lines = [line.strip() for line in md.strip().splitlines() if line.strip()]
    headers: list[str] = []
    rows: list[list[str]] = []

    for i, line in enumerate(lines):
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|") if c.strip()]
        if i == 0:
            headers = cells
        elif re.match(r"^[-:| ]+$", line):
            continue  # separator row
        else:
            rows.append(cells)

    return TableData(
        headers=headers,
        rows=rows,
        markdown=md,
    )


def _to_markdown(headers: list[str], rows: list[list[str]]) -> str:
    """Render headers + rows as a Markdown table string."""
    if not rows and not headers:
        return ""

    all_cols = max(
        len(headers),
        max((len(r) for r in rows), default=0),
    )

    def pad(row: list[str]) -> list[str]:
        return row + [""] * (all_cols - len(row))

    lines: list[str] = []
    if headers:
        lines.append("| " + " | ".join(pad(headers)) + " |")
        lines.append("| " + " | ".join(["---"] * all_cols) + " |")

    for row in rows:
        lines.append("| " + " | ".join(pad(row)) + " |")

    return "\n".join(lines)
