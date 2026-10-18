"""
Test fixtures and shared configuration for the ingestion pipeline tests.

Uses an in-memory SQLite database so tests can run without PostgreSQL.
PaddleOCR calls are patched via monkeypatch / pytest fixtures.
"""

from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest
from PIL import Image, ImageDraw, ImageFont

# Tell the ingestion service to use SQLite for tests
os.environ.setdefault(
    "INGEST_DATABASE_URL",
    "sqlite:///./test_ingestion.db",
)
os.environ.setdefault("INGEST_VISION_ENABLED", "false")  # disable Ollama in unit tests
os.environ.setdefault("INGEST_OCR_USE_GPU", "false")


# ---------------------------------------------------------------------------
# Temp dir fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def tmp_dir() -> Generator[Path, None, None]:
    with tempfile.TemporaryDirectory(prefix="ingest_test_") as d:
        yield Path(d)


# ---------------------------------------------------------------------------
# Synthetic document builders
# ---------------------------------------------------------------------------

def _make_image(
    width: int = 800,
    height: int = 1100,
    bg: tuple = (255, 255, 255),
) -> Image.Image:
    return Image.new("RGB", (width, height), bg)


def make_text_page(
    width: int = 800,
    height: int = 1100,
) -> Image.Image:
    """
    Create a synthetic page image with:
    - A heading
    - A paragraph
    - A chemical equation
    - A formula
    - A page number
    """
    img = _make_image(width, height)
    draw = ImageDraw.Draw(img)

    # Try to use a system font; fall back to default
    try:
        from PIL import ImageFont
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_normal = ImageFont.truetype("arial.ttf", 18)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font_large = ImageFont.load_default()
        font_normal = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Heading
    draw.text((60, 60), "Chapter 3: Kinematics", fill=(0, 0, 0), font=font_large)

    # Paragraph
    paragraph = (
        "When an object moves in a straight line with constant acceleration, "
        "the equations of motion can be used to describe its behaviour. "
        "These are sometimes called the SUVAT equations."
    )
    _draw_wrapped(draw, paragraph, font_normal, x=60, y=130, max_width=680)

    # Formula: v = u + at
    draw.text((60, 280), "v = u + at", fill=(20, 20, 160), font=font_large)

    # Chemical equation
    draw.text(
        (60, 360),
        "2H\u2082 + O\u2082 \u2192 2H\u2082O",
        fill=(0, 100, 0),
        font=font_large,
    )

    # Page number at bottom
    draw.text((380, 1060), "42", fill=(128, 128, 128), font=font_small)

    return img


def make_table_page(width: int = 800, height: int = 1100) -> Image.Image:
    """Synthetic page with a simple 3×3 data table."""
    img = _make_image(width, height)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        font = ImageFont.load_default()

    draw.text((60, 60), "Table 1: Velocity vs Time", fill=(0, 0, 0), font=font)

    # Draw table grid
    col_x = [60, 250, 440, 630]
    row_y = [120, 160, 200, 240]
    headers = ["Time (s)", "Velocity (m/s)", "Displacement (m)"]
    data = [
        ["0", "0", "0"],
        ["1", "10", "5"],
        ["2", "20", "20"],
    ]

    for i, h in enumerate(headers):
        draw.text((col_x[i] + 5, row_y[0] + 5), h, fill=(0, 0, 0), font=font)

    for r_idx, row in enumerate(data):
        for c_idx, cell in enumerate(row):
            draw.text(
                (col_x[c_idx] + 5, row_y[r_idx + 1] + 5),
                cell,
                fill=(40, 40, 40),
                font=font,
            )

    # Grid lines
    for y in row_y:
        draw.line([(60, y), (630, y)], fill=(0, 0, 0), width=1)
    for x in col_x:
        draw.line([(x, 120), (x, 240)], fill=(0, 0, 0), width=1)
    draw.line([(630, 120), (630, 240)], fill=(0, 0, 0), width=1)
    draw.line([(60, 240), (630, 240)], fill=(0, 0, 0), width=1)

    return img


def make_mcq_page(width: int = 800, height: int = 1100) -> Image.Image:
    """Synthetic past-paper MCQ page."""
    img = _make_image(width, height)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 18)
        font_bold = ImageFont.truetype("arialbd.ttf", 20)
    except Exception:
        font = font_bold = ImageFont.load_default()

    draw.text((60, 60), "Section B", fill=(0, 0, 0), font=font_bold)
    draw.text(
        (60, 120),
        "Q3. A car accelerates from rest at 2 m/s\u00b2 for 5 seconds.",
        fill=(0, 0, 0),
        font=font,
    )
    draw.text((60, 160), "(b) Calculate the final velocity.   [2]", fill=(0, 0, 0), font=font)
    draw.text((60, 220), "(A) 5 m/s", fill=(0, 0, 0), font=font)
    draw.text((60, 260), "(B) 10 m/s", fill=(0, 0, 0), font=font)
    draw.text((60, 300), "(C) 15 m/s", fill=(0, 0, 0), font=font)
    draw.text((60, 340), "(D) 20 m/s", fill=(0, 0, 0), font=font)

    return img


def make_diagram_page(width: int = 800, height: int = 1100) -> Image.Image:
    """Synthetic page with a simple diagram (a rectangle with label)."""
    img = _make_image(width, height)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except Exception:
        font = ImageFont.load_default()

    draw.text((60, 60), "Figure 1: Simple Circuit Diagram", fill=(0, 0, 0), font=font)

    # Draw a simple circuit-like diagram
    draw.rectangle([(200, 200), (600, 400)], outline=(0, 0, 0), width=3)
    draw.line([(200, 300), (100, 300)], fill=(0, 0, 0), width=2)
    draw.line([(600, 300), (700, 300)], fill=(0, 0, 0), width=2)

    # Labels
    draw.text((280, 420), "R\u2081 = 4\u03a9", fill=(0, 0, 0), font=font)
    draw.text((480, 420), "R\u2082 = 6\u03a9", fill=(0, 0, 0), font=font)
    draw.text((100, 280), "12V", fill=(0, 0, 0), font=font)

    return img


def make_two_column_page(width: int = 800, height: int = 1100) -> Image.Image:
    """Synthetic two-column layout page."""
    img = _make_image(width, height)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        font = ImageFont.load_default()

    # Left column
    left_text = (
        "The speed of light in a vacuum is approximately "
        "3 \u00d7 10\u2078 m/s. This is denoted by the symbol c "
        "and is a fundamental constant of the universe."
    )
    _draw_wrapped(draw, left_text, font, x=40, y=80, max_width=340)

    # Right column
    right_text = (
        "Refractive index n is defined as the ratio of the speed "
        "of light in vacuum to the speed of light in the medium. "
        "n = c / v"
    )
    _draw_wrapped(draw, right_text, font, x=420, y=80, max_width=340)

    return img


# ---------------------------------------------------------------------------
# PIL helpers
# ---------------------------------------------------------------------------

def _draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    font,
    x: int,
    y: int,
    max_width: int,
    line_height: int = 24,
) -> None:
    """Wrap text to max_width pixels and draw it."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        try:
            w = draw.textlength(test, font=font)
        except Exception:
            w = len(test) * 10  # rough fallback
        if w > max_width and current:
            lines.append(current)
            current = word
        else:
            current = test
    if current:
        lines.append(current)

    for i, line in enumerate(lines):
        draw.text((x, y + i * line_height), line, fill=(0, 0, 0), font=font)


# ---------------------------------------------------------------------------
# File-based fixtures (save images to disk)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def text_page_png(tmp_dir: Path) -> Path:
    p = tmp_dir / "text_page.png"
    make_text_page().save(str(p))
    return p


@pytest.fixture(scope="session")
def table_page_png(tmp_dir: Path) -> Path:
    p = tmp_dir / "table_page.png"
    make_table_page().save(str(p))
    return p


@pytest.fixture(scope="session")
def mcq_page_png(tmp_dir: Path) -> Path:
    p = tmp_dir / "mcq_page.png"
    make_mcq_page().save(str(p))
    return p


@pytest.fixture(scope="session")
def diagram_page_png(tmp_dir: Path) -> Path:
    p = tmp_dir / "diagram_page.png"
    make_diagram_page().save(str(p))
    return p


@pytest.fixture(scope="session")
def two_column_png(tmp_dir: Path) -> Path:
    p = tmp_dir / "two_column.png"
    make_two_column_page().save(str(p))
    return p
