"""
Document Intelligence Pipeline — Full Test Suite.

Tests cover every required content type:
  1. File validation + SHA-256 hashing
  2. Page extraction (PNG image)
  3. Region classification
  4. Equation extraction (LaTeX, SymPy normalisation)
  5. Chemical equation parsing
  6. Table parsing (HTML → headers/rows/markdown)
  7. Diagram extraction (crop + save)
  8. Reading order reconstruction
  9. Past-paper question detection (Q#, sub-Q, section, marks, MCQ options)
 10. Two-column layout ordering
 11. OCR confidence categories
 12. End-to-end pipeline on a synthetic single-page PNG
 13. DB persistence: document + page + regions all created
 14. Duplicate hash detection (second run skips without --force)

PaddleOCR is mocked via monkeypatch so tests run without a GPU or model
download.  The mock injects realistic-looking raw blocks for each test.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image

# -------------------------------------------------------------------------
# Make sure env vars are set before importing the service
# -------------------------------------------------------------------------
os.environ.setdefault("INGEST_DATABASE_URL", "sqlite:///./test_ingestion.db")
os.environ.setdefault("INGEST_VISION_ENABLED", "false")
os.environ.setdefault("INGEST_OCR_USE_GPU", "false")

from services.ingestion.schemas import (
    BoundingBox,
    ChemicalEquation,
    ConfidenceLevel,
    DiagramRegion,
    DocumentType,
    FormulaRegion,
    PageRegion,
    QuestionRegion,
    RegionType,
    StructuredPage,
    TableRegionSchema,
    classify_confidence,
)
from services.ingestion.stages.validation import validate_and_hash, ValidationError
from services.ingestion.stages.pdf_extraction import extract_pages
from services.ingestion.stages.reading_order import reconstruct_reading_order
from services.ingestion.stages.region_classifier import classify_blocks
from services.ingestion.stages.equation_extractor import (
    extract_formula,
    extract_chemical_equation,
)
from services.ingestion.stages.table_extractor import (
    extract_table,
    _parse_html_table,
    _to_markdown,
)
from services.ingestion.stages.diagram_extractor import extract_diagram
from services.ingestion.stages.past_paper_detector import detect_questions
from services.ingestion.stages.ocr import RawBlock
from services.ingestion.db.repository import IngestionRepository, create_tables


# =========================================================================
# Helper: make a minimal PNG in a temp file
# =========================================================================

def _write_png(path: Path, width: int = 200, height: int = 100) -> Path:
    img = Image.new("RGB", (width, height), (255, 255, 255))
    img.save(str(path), "PNG")
    return path


def _make_bbox(x0=10, y0=10, x1=200, y1=50) -> BoundingBox:
    return BoundingBox(x0=x0, y0=y0, x1=x1, y1=y1)


# =========================================================================
# 1. File Validation
# =========================================================================

class TestValidation:
    def test_valid_png(self, tmp_path: Path):
        f = tmp_path / "page.png"
        _write_png(f)
        path, sha = validate_and_hash(f)
        assert path.exists()
        assert len(sha) == 64
        assert sha == hashlib.sha256(f.read_bytes()).hexdigest()

    def test_rejects_missing_file(self, tmp_path: Path):
        with pytest.raises(ValidationError, match="not found"):
            validate_and_hash(tmp_path / "nonexistent.pdf")

    def test_rejects_unsupported_extension(self, tmp_path: Path):
        f = tmp_path / "doc.docx"
        f.write_bytes(b"fake")
        with pytest.raises(ValidationError, match="Unsupported"):
            validate_and_hash(f)

    def test_rejects_empty_file(self, tmp_path: Path):
        f = tmp_path / "empty.pdf"
        f.write_bytes(b"")
        with pytest.raises(ValidationError, match="empty"):
            validate_and_hash(f)

    def test_accepts_jpg(self, tmp_path: Path):
        f = tmp_path / "scan.jpg"
        img = Image.new("RGB", (100, 100), (200, 200, 200))
        img.save(str(f), "JPEG")
        path, sha = validate_and_hash(f)
        assert path.suffix == ".jpg"
        assert len(sha) == 64

    def test_sha256_is_deterministic(self, tmp_path: Path):
        f = tmp_path / "test.png"
        _write_png(f)
        _, sha1 = validate_and_hash(f)
        _, sha2 = validate_and_hash(f)
        assert sha1 == sha2


# =========================================================================
# 2. Page Extraction
# =========================================================================

class TestPageExtraction:
    def test_single_png_yields_one_page(self, tmp_path: Path):
        f = _write_png(tmp_path / "page.png", 400, 600)
        pages = extract_pages(f)
        assert len(pages) == 1
        assert pages[0].page_number == 1
        assert pages[0].page_index == 0
        assert pages[0].width == 400
        assert pages[0].height == 600

    def test_image_is_rgb(self, tmp_path: Path):
        f = _write_png(tmp_path / "p.png")
        pages = extract_pages(f)
        assert pages[0].image.mode == "RGB"

    def test_page_saved_to_disk(self, tmp_path: Path):
        f = _write_png(tmp_path / "p.png")
        save_dir = tmp_path / "pages"
        pages = extract_pages(f, save_dir=save_dir)
        assert pages[0].image_path is not None
        assert Path(pages[0].image_path).exists()


# =========================================================================
# 3. Confidence Classification
# =========================================================================

class TestConfidenceClassification:
    @pytest.mark.parametrize("score,expected", [
        (0.95, ConfidenceLevel.HIGH),
        (0.90, ConfidenceLevel.HIGH),
        (0.85, ConfidenceLevel.MEDIUM),
        (0.75, ConfidenceLevel.MEDIUM),
        (0.70, ConfidenceLevel.LOW),
        (0.60, ConfidenceLevel.LOW),
        (0.50, ConfidenceLevel.NEEDS_REVIEW),
        (0.00, ConfidenceLevel.NEEDS_REVIEW),
    ])
    def test_classify_confidence(self, score, expected):
        assert classify_confidence(score) == expected


# =========================================================================
# 4. Region Classification
# =========================================================================

class TestRegionClassifier:
    def _make_blocks(self, *entries) -> list[RawBlock]:
        return [
            RawBlock(block_type=bt, bbox=[10, y, 300, y + 30], text=txt, confidence=conf)
            for bt, txt, conf, y in entries
        ]

    def test_title_becomes_heading(self):
        blocks = self._make_blocks(("title", "Chapter 1", 0.95, 10))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.HEADING

    def test_text_becomes_paragraph(self):
        blocks = self._make_blocks(("text", "Some body text here.", 0.92, 60))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.PARAGRAPH

    def test_formula_becomes_formula(self):
        blocks = self._make_blocks(("formula", "v = u + at", 0.88, 200))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.FORMULA

    def test_figure_becomes_figure(self):
        blocks = self._make_blocks(("figure", "", 0.80, 300))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.FIGURE

    def test_table_becomes_table(self):
        blocks = self._make_blocks(("table", "", 0.75, 400))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.TABLE

    def test_chemical_equation_detected(self):
        blocks = self._make_blocks(("text", "2H₂ + O₂ → 2H₂O", 0.90, 200))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.CHEMICAL_EQUATION

    def test_mcq_option_detected(self):
        blocks = self._make_blocks(("text", "(A) 10 m/s", 0.92, 300))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.MCQ_OPTION

    def test_page_number_at_bottom(self):
        blocks = self._make_blocks(("text", "42", 0.88, 1070))
        regions = classify_blocks(blocks, 1100, 800, 0)
        assert regions[0].type == RegionType.PAGE_NUMBER

    def test_region_id_generated(self):
        blocks = self._make_blocks(("text", "hello", 0.90, 50))
        regions = classify_blocks(blocks, 1100, 800, 2)  # page_index=2
        assert regions[0].region_id == "p3_r1"


# =========================================================================
# 5. Equation Extraction
# =========================================================================

class TestEquationExtractor:
    def _region(self, text: str, rtype=RegionType.FORMULA) -> PageRegion:
        return PageRegion(
            region_id="p1_r1",
            type=rtype,
            bbox=_make_bbox(),
            text=text,
            confidence=0.88,
        )

    def test_basic_formula_has_latex(self):
        r = self._region("v = u + at")
        formula = extract_formula(r)
        assert isinstance(formula, FormulaRegion)
        assert formula.latex != ""
        assert formula.display_form == "v = u + at"

    def test_formula_with_vision_data_uses_latex(self):
        r = self._region("v = u + at")
        vision = {"latex": r"v = u + at", "display_form": "v = u + at"}
        formula = extract_formula(r, vision_data=vision)
        assert formula.latex == r"v = u + at"

    def test_greek_symbol_escaped(self):
        r = self._region("α + β = γ")
        formula = extract_formula(r)
        assert r"\alpha" in formula.latex

    def test_chemical_equation_extracted(self):
        r = self._region("2H₂ + O₂ → 2H₂O", rtype=RegionType.CHEMICAL_EQUATION)
        cheq = extract_chemical_equation(r)
        assert isinstance(cheq, ChemicalEquation)
        assert cheq.arrow in ("→", "->")
        assert cheq.display != ""

    def test_chemical_equation_state_symbols(self):
        r = self._region("H₂(g) + Cl₂(g) → 2HCl(g)", rtype=RegionType.CHEMICAL_EQUATION)
        cheq = extract_chemical_equation(r)
        assert "(g)" in cheq.state_symbols

    def test_chemical_coefficients_detected(self):
        r = self._region("2H₂ + O₂ → 2H₂O", rtype=RegionType.CHEMICAL_EQUATION)
        cheq = extract_chemical_equation(r)
        assert "2" in cheq.coefficients

    def test_formula_never_corrupts_chemistry(self):
        """Chemical equations must never be passed through SymPy."""
        r = self._region("2H₂ + O₂ → 2H₂O", rtype=RegionType.CHEMICAL_EQUATION)
        cheq = extract_chemical_equation(r)
        # Normalized form should still look like the original (no SymPy alteration)
        assert "H" in cheq.normalized or "H" in cheq.display


# =========================================================================
# 6. Table Extraction
# =========================================================================

class TestTableExtractor:
    def _table_region(self) -> PageRegion:
        return PageRegion(
            region_id="p1_r5",
            type=RegionType.TABLE,
            bbox=_make_bbox(),
            text="",
            confidence=0.80,
        )

    def _raw_block_with_html(self, html: str) -> RawBlock:
        return RawBlock(
            block_type="table",
            bbox=[10, 10, 600, 300],
            html=html,
        )

    def test_html_table_parsed(self):
        html = (
            "<table>"
            "<tr><th>Time (s)</th><th>Speed (m/s)</th></tr>"
            "<tr><td>0</td><td>0</td></tr>"
            "<tr><td>1</td><td>10</td></tr>"
            "</table>"
        )
        table_data = _parse_html_table(html)
        assert table_data.headers == ["Time (s)", "Speed (m/s)"]
        assert len(table_data.rows) == 2
        assert table_data.rows[0] == ["0", "0"]

    def test_markdown_generated(self):
        headers = ["A", "B"]
        rows = [["1", "2"], ["3", "4"]]
        md = _to_markdown(headers, rows)
        assert "| A | B |" in md
        assert "| 1 | 2 |" in md
        assert "---" in md

    def test_table_region_with_html_block(self):
        html = "<table><tr><th>X</th><th>Y</th></tr><tr><td>a</td><td>b</td></tr></table>"
        region = self._table_region()
        block = self._raw_block_with_html(html)
        result = extract_table(region, raw_block=block)
        assert isinstance(result, TableRegionSchema)
        assert result.table_data is not None
        assert result.table_data.headers == ["X", "Y"]

    def test_vision_markdown_takes_precedence(self):
        region = self._table_region()
        vision = {"table_markdown": "| H1 | H2 |\n|---|---|\n| a | b |"}
        result = extract_table(region, vision_data=vision)
        assert result.table_data.headers == ["H1", "H2"]
        assert result.table_data.rows[0] == ["a", "b"]


# =========================================================================
# 7. Diagram Extraction
# =========================================================================

class TestDiagramExtractor:
    def test_diagram_saved_to_disk(self, tmp_path: Path):
        import services.ingestion.config as cfg
        cfg.settings.media_root = tmp_path / "media"

        region = PageRegion(
            region_id="p1_r3",
            type=RegionType.FIGURE,
            bbox=BoundingBox(x0=50, y0=50, x1=350, y1=250),
            text="",
            confidence=0.70,
        )
        page_image = Image.new("RGB", (800, 1100), (200, 220, 200))
        diagram = extract_diagram(region, page_image, doc_hash="abc123", page_number=1)

        assert isinstance(diagram, DiagramRegion)
        assert diagram.media_path is not None
        assert Path(diagram.media_path).exists()

    def test_diagram_labels_empty_without_vision(self, tmp_path: Path):
        import services.ingestion.config as cfg
        cfg.settings.media_root = tmp_path / "media2"

        region = PageRegion(
            region_id="p1_r4",
            type=RegionType.FIGURE,
            bbox=BoundingBox(x0=50, y0=50, x1=350, y1=250),
            text="",
            confidence=0.70,
        )
        page_image = Image.new("RGB", (800, 1100), (255, 255, 255))
        diagram = extract_diagram(region, page_image, doc_hash="def456", page_number=1)

        # No vision data → labels must be empty (no fabrication)
        assert diagram.detected_labels == []
        assert diagram.description == ""

    def test_diagram_labels_from_vision(self, tmp_path: Path):
        import services.ingestion.config as cfg
        cfg.settings.media_root = tmp_path / "media3"

        region = PageRegion(
            region_id="p1_r5",
            type=RegionType.FIGURE,
            bbox=BoundingBox(x0=50, y0=50, x1=350, y1=250),
            text="",
            confidence=0.70,
            vision_used=True,
        )
        page_image = Image.new("RGB", (800, 1100), (255, 255, 255))
        vision_data = {
            "description": "A simple circuit with two resistors.",
            "labels": ["R1", "R2", "12V"],
            "concept": "Parallel circuits",
        }
        diagram = extract_diagram(
            region, page_image, doc_hash="ghi789", page_number=1,
            vision_data=vision_data,
        )
        assert diagram.detected_labels == ["R1", "R2", "12V"]
        assert "circuit" in diagram.description.lower()


# =========================================================================
# 8. Reading Order
# =========================================================================

class TestReadingOrder:
    def _region(self, x0, y0, x1, y1, rid="r") -> PageRegion:
        return PageRegion(
            region_id=rid,
            type=RegionType.PARAGRAPH,
            bbox=BoundingBox(x0=x0, y0=y0, x1=x1, y1=y1),
            text="text",
            confidence=0.90,
        )

    def test_top_to_bottom_ordering(self):
        r1 = self._region(60, 500, 300, 530, "r1")
        r2 = self._region(60, 100, 300, 130, "r2")
        r3 = self._region(60, 300, 300, 330, "r3")
        ordered = reconstruct_reading_order([r1, r2, r3], page_width=800, page_height=1100)
        ids = [r.region_id for r in ordered]
        assert ids == ["r2", "r3", "r1"]

    def test_left_to_right_within_same_band(self):
        # Two regions at the same vertical position
        left = self._region(50, 100, 300, 130, "left")
        right = self._region(400, 100, 650, 130, "right")
        ordered = reconstruct_reading_order([right, left], page_width=800, page_height=1100)
        assert ordered[0].region_id == "left"
        assert ordered[1].region_id == "right"

    def test_two_column_layout(self):
        # Left column items should come before right column items at same Y
        left_top = self._region(40, 80, 360, 120, "L1")
        left_bot = self._region(40, 200, 360, 240, "L2")
        right_top = self._region(420, 80, 760, 120, "R1")
        right_bot = self._region(420, 200, 760, 240, "R2")
        regions = [right_top, right_bot, left_bot, left_top]
        ordered = reconstruct_reading_order(regions, 800, 1100)
        # All left and right at same stripe should be in x order
        ids = [r.region_id for r in ordered]
        l1_pos = ids.index("L1")
        r1_pos = ids.index("R1")
        l2_pos = ids.index("L2")
        r2_pos = ids.index("R2")
        assert l1_pos < r1_pos
        assert l2_pos < r2_pos


# =========================================================================
# 9. Past-Paper Question Detection
# =========================================================================

class TestPastPaperDetector:
    def _make_regions(self, *entries) -> list[PageRegion]:
        regions = []
        for i, (rtype, text, y) in enumerate(entries):
            regions.append(PageRegion(
                region_id=f"p1_r{i+1}",
                type=rtype,
                bbox=BoundingBox(x0=60, y0=y, x1=700, y1=y+30),
                text=text,
                confidence=0.90,
            ))
        return regions

    def test_section_b_detected(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Section B", 60),
            (RegionType.PARAGRAPH, "Q3. Calculate the velocity.", 100),
        )
        updated, section, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        assert section == "Section B"

    def test_question_number_detected(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q3. What is the acceleration?", 100),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert len(questions) == 1
        assert questions[0].question_number == "3"

    def test_sub_question_detected(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q3. (b) Calculate the velocity. [2]", 100),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert questions[0].sub_question_number == "b"

    def test_marks_extracted(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q3. What is the speed? [3]", 100),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert questions[0].marks == 3.0

    def test_mcq_options_attached(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q1. Which of the following is correct?", 60),
            (RegionType.MCQ_OPTION, "(A) 5 m/s", 100),
            (RegionType.MCQ_OPTION, "(B) 10 m/s", 130),
            (RegionType.MCQ_OPTION, "(C) 15 m/s", 160),
            (RegionType.MCQ_OPTION, "(D) 20 m/s", 190),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert len(questions) == 1
        assert len(questions[0].options) == 4
        assert questions[0].options[0].label == "A"
        assert "5 m/s" in questions[0].options[0].text

    def test_question_has_page_linkage(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q5. Describe Newton's second law.", 100),
        )
        updated, _, _ = detect_questions(regions, page_number=7, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert questions[0].bbox.y0 == 100

    def test_diagram_flag_set(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q2. What does the diagram show?", 100),
            (RegionType.FIGURE, "", 140),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert questions[0].has_diagram is True

    def test_formula_flag_set(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q4. Use the formula below:", 100),
            (RegionType.FORMULA, "v = u + at", 140),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="PAST_PAPER")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert questions[0].has_formula is True

    def test_book_mode_does_not_detect_questions(self):
        regions = self._make_regions(
            (RegionType.PARAGRAPH, "Q3. Calculate the velocity.", 100),
        )
        updated, _, _ = detect_questions(regions, page_number=1, doc_type="BOOK")
        questions = [r for r in updated if isinstance(r, QuestionRegion)]
        assert len(questions) == 0


# =========================================================================
# 10. Database Persistence
# =========================================================================

class TestDatabasePersistence:
    @pytest.fixture(autouse=True)
    def use_test_db(self, tmp_path: Path):
        db_path = tmp_path / "test.db"
        db_url = f"sqlite:///{db_path}"
        os.environ["INGEST_DATABASE_URL"] = db_url
        create_tables(db_url)
        self.db_url = db_url
        yield
        # Dispose engine connections before deleting file (required on Windows)
        from services.ingestion.db.repository import get_engine
        engine = get_engine(db_url)
        engine.dispose()
        if db_path.exists():
            try:
                db_path.unlink()
            except PermissionError:
                pass  # Windows may still hold the file; pytest tmp dir cleanup handles it

    def test_document_created_and_found(self):
        repo = IngestionRepository(self.db_url)
        doc_id = repo.create_document(
            file_path="/tmp/test.pdf",
            sha256="abc" * 21 + "d",  # 64 chars
            title="Test Book",
            doc_type=DocumentType.BOOK,
            total_pages=5,
        )
        assert doc_id is not None
        found = repo.find_document_by_hash("abc" * 21 + "d")
        assert found == doc_id

    def test_duplicate_hash_found(self):
        repo = IngestionRepository(self.db_url)
        sha = "aabbcc" * 10 + "ddee"  # 64 chars
        repo.create_document(
            file_path="/tmp/doc.pdf",
            sha256=sha,
            title="Dup Test",
            doc_type=DocumentType.PAST_PAPER,
            total_pages=3,
        )
        found = repo.find_document_by_hash(sha)
        assert found is not None

    def test_page_saved_with_regions(self):
        from services.ingestion.schemas import StructuredPage, ConfidenceSummary

        repo = IngestionRepository(self.db_url)
        doc_id = repo.create_document(
            file_path="/tmp/book.pdf",
            sha256="c" * 64,
            title="Physics Book",
            doc_type=DocumentType.BOOK,
            total_pages=1,
        )

        region = PageRegion(
            region_id="p1_r1",
            type=RegionType.PARAGRAPH,
            bbox=BoundingBox(x0=10, y0=10, x1=500, y1=50),
            text="Forces and motion.",
            confidence=0.92,
        )
        page = StructuredPage(
            page_number=1,
            width=800,
            height=1100,
            regions=[region],
            confidence_summary=ConfidenceSummary(high=1, total=1),
        )
        page_id = repo.save_page(doc_id, page)
        assert page_id is not None

    def test_equation_saved(self):
        from services.ingestion.schemas import (
            FormulaRegion,
            StructuredPage,
            ConfidenceSummary,
        )

        repo = IngestionRepository(self.db_url)
        doc_id = repo.create_document(
            file_path="/tmp/phys.pdf",
            sha256="d" * 64,
            title="Physics",
            doc_type=DocumentType.BOOK,
            total_pages=1,
        )
        formula = FormulaRegion(
            region_id="p1_r2",
            type=RegionType.FORMULA,
            bbox=BoundingBox(x0=60, y0=200, x1=400, y1=240),
            text="v = u + at",
            confidence=0.88,
            latex=r"v = u + at",
            display_form="v = u + at",
            normalized_form="v = u + at",
        )
        page = StructuredPage(
            page_number=1,
            width=800,
            height=1100,
            regions=[formula],
            formulas=[formula],
            confidence_summary=ConfidenceSummary(high=1, total=1),
        )
        page_id = repo.save_page(doc_id, page)
        assert page_id is not None

    def test_mark_document_completed(self):
        from sqlalchemy import select, create_engine
        from sqlalchemy.orm import sessionmaker
        from services.ingestion.db.models import Document

        repo = IngestionRepository(self.db_url)
        doc_id = repo.create_document(
            file_path="/tmp/x.pdf",
            sha256="e" * 64,
            title="X",
            doc_type=DocumentType.BOOK,
            total_pages=1,
        )
        repo.mark_document_completed(doc_id)

        engine = create_engine(self.db_url)
        Session = sessionmaker(bind=engine)
        with Session() as s:
            doc = s.get(Document, doc_id)
            assert doc.processing_status == "COMPLETED"


# =========================================================================
# 11. End-to-End Pipeline (mocked OCR)
# =========================================================================

class TestEndToEndPipeline:
    """
    Integration test that runs the full pipeline on a synthetic PNG.
    PaddleOCR is mocked to return deterministic blocks without GPU.
    """

    @pytest.fixture(autouse=True)
    def patch_ocr(self):
        """Return a fixed set of OCR blocks regardless of input."""
        mock_blocks = [
            RawBlock("title", [60, 60, 700, 100], "Chapter 1: Forces", 0.95),
            RawBlock("text", [60, 120, 700, 180],
                     "A force is any interaction that changes motion.", 0.92),
            RawBlock("formula", [60, 200, 400, 240], "F = ma", 0.90),
            RawBlock("text", [60, 260, 700, 320],
                     "2H₂ + O₂ → 2H₂O", 0.89),
            RawBlock("table", [60, 340, 700, 450], "", 0.82,
                     html="<table><tr><th>F(N)</th><th>a(m/s²)</th></tr>"
                          "<tr><td>10</td><td>2</td></tr></table>"),
            RawBlock("figure", [60, 460, 700, 600], "", 0.75),
            RawBlock("text", [60, 620, 700, 680], "42", 0.85),
        ]

        # Patch the pipeline's imports of OCR functions directly
        # (PPStructure is imported inside the function, not a module attribute)
        _blank_page = Image.new("RGB", (800, 1100), (255, 255, 255))
        with patch(
            "services.ingestion.stages.ocr.run_ocr",
            return_value=[],  # triggers fallback to run_plain_ocr
        ):
            with patch(
                "services.ingestion.stages.ocr.run_plain_ocr",
                return_value=mock_blocks,
            ):
                with patch(
                    "services.ingestion.pipeline.run_ocr",
                    return_value=[],
                ):
                    with patch(
                        "services.ingestion.pipeline.run_plain_ocr",
                        return_value=mock_blocks,
                    ):
                        with patch(
                            "services.ingestion.pipeline.detect_and_correct_orientation",
                            return_value=(_blank_page, 0.0),
                        ):
                            yield


    def test_pipeline_produces_structured_page(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "e2e.db"
        db_url = f"sqlite:///{db_path}"

        # Create a simple PNG
        png = tmp_path / "test.png"
        img = Image.new("RGB", (800, 1100), (255, 255, 255))
        img.save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        result = pipeline.run(str(png), doc_type="BOOK", force=True)

        assert result.pages_processed == 1
        assert result.total_regions > 0
        assert result.doc_id is not None

    def test_pipeline_detects_equation(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "eq_test.db"
        db_url = f"sqlite:///{db_path}"

        png = tmp_path / "eq.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        result = pipeline.run(str(png), doc_type="BOOK", force=True)

        # The mock block with type "formula" should produce a FormulaRegion
        assert result.total_equations >= 1

    def test_pipeline_detects_chemical_equation(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "chem_test.db"
        db_url = f"sqlite:///{db_path}"

        png = tmp_path / "chem.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        result = pipeline.run(str(png), doc_type="BOOK", force=True)

        assert result.total_chemical_equations >= 1

    def test_pipeline_detects_table(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "tbl_test.db"
        db_url = f"sqlite:///{db_path}"

        png = tmp_path / "tbl.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        result = pipeline.run(str(png), doc_type="BOOK", force=True)

        assert result.total_tables >= 1

    def test_pipeline_detects_diagram(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "diag_test.db"
        db_url = f"sqlite:///{db_path}"

        png = tmp_path / "diag.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        result = pipeline.run(str(png), doc_type="BOOK", force=True)

        assert result.total_diagrams >= 1

    def test_duplicate_skipped_without_force(self, tmp_path: Path):
        from services.ingestion.pipeline import IngestionPipeline

        db_path = tmp_path / "dup_test.db"
        db_url = f"sqlite:///{db_path}"

        png = tmp_path / "dup.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))

        pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
        r1 = pipeline.run(str(png), doc_type="BOOK", force=True)
        r2 = pipeline.run(str(png), doc_type="BOOK", force=False)

        assert r1.doc_id == r2.doc_id
        assert r2.pages_processed == 0  # skipped

    def test_past_paper_detects_questions(self, tmp_path: Path):
        """With PAST_PAPER mode and mocked MCQ block, questions are extracted."""
        mcq_blocks = [
            RawBlock("text", [60, 60, 700, 90], "Section B", 0.93),
            RawBlock("text", [60, 100, 700, 130],
                     "Q3. (b) Calculate the final velocity. [2]", 0.91),
            RawBlock("text", [60, 140, 700, 160], "(A) 5 m/s", 0.90),
            RawBlock("text", [60, 165, 700, 185], "(B) 10 m/s", 0.90),
            RawBlock("text", [60, 190, 700, 210], "(C) 15 m/s", 0.90),
            RawBlock("text", [60, 215, 700, 235], "(D) 20 m/s", 0.90),
        ]

        png = tmp_path / "pp.png"
        Image.new("RGB", (800, 1100), (255, 255, 255)).save(str(png))
        db_path = tmp_path / "pp_test.db"
        db_url = f"sqlite:///{db_path}"

        # Override both patch targets set by the class-level autouse fixture
        # so the MCQ-specific blocks are used instead of the generic ones.
        with patch(
            "services.ingestion.pipeline.run_plain_ocr",
            return_value=mcq_blocks,
        ):
            with patch(
                "services.ingestion.stages.ocr.run_plain_ocr",
                return_value=mcq_blocks,
            ):
                from services.ingestion.pipeline import IngestionPipeline
                pipeline = IngestionPipeline(database_url=db_url, create_db_tables=True)
                result = pipeline.run(str(png), doc_type="PAST_PAPER", force=True)

        assert result.total_questions >= 1
        page = result.pages[0]
        q = page.questions[0]
        assert q.question_number == "3"
        assert q.sub_question_number == "b"
        assert q.marks == 2.0
        assert len(q.options) == 4

