"""
Stage 1 — Book Understanding Extractor.

Reads an IngestionResult from the existing document pipeline and produces
ExtractedChapterContent for every detected chapter.

Detects:
- Chapter headings (from RegionType.HEADING regions)
- Topics (sub-headings one level below chapter)
- Concepts (named entities from paragraphs + FormulaRegion + DiagramRegion)
- Formulas (FormulaRegion), Chemical equations (ChemicalEquation)
- Diagrams (DiagramRegion), Graphs (diagrams described as graphs/plots)
- Tables (TableRegionSchema), Examples, Exercises
- Book-level metadata from cover/title page

Inferred metadata fields are always marked is_inferred=True.
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from services.ingestion.schemas import (
    IngestionResult,
    StructuredPage,
    RegionType,
    FormulaRegion,
    DiagramRegion,
    ChemicalEquation,
    TableRegionSchema,
)
from services.book_analysis.schemas import (
    DetectedBookMetadata,
    ExtractedChapterContent,
    ExtractedConcept,
    ConceptType,
)

logger = logging.getLogger(__name__)

# Keywords that indicate a paragraph is an "example"
_EXAMPLE_PREFIXES = re.compile(
    r"^\s*(example|ex\.|worked example|solved example)\b",
    re.IGNORECASE,
)
# Keywords that indicate a paragraph is an "exercise"
_EXERCISE_PREFIXES = re.compile(
    r"^\s*(exercise|q\.|question|practice|problems?)\b",
    re.IGNORECASE,
)
# Keywords that indicate a diagram is actually a graph
_GRAPH_KEYWORDS = re.compile(
    r"\b(graph|plot|curve|axis|axes|x-axis|y-axis|gradient|slope)\b",
    re.IGNORECASE,
)

# Board/class/subject patterns on title pages
_CLASS_PATTERN = re.compile(r"\bclass[-\s]?(\d+)\b", re.IGNORECASE)
_SUBJECT_PATTERN = re.compile(
    r"\b(physics|chemistry|biology|mathematics|math|maths|"
    r"computer science|economics|commerce|accounts|accounting|"
    r"english|urdu|islamiat|pakistan studies)\b",
    re.IGNORECASE,
)
_BOARD_PATTERN = re.compile(
    r"\b(FBISE|BISE|Sindh Board|Punjab Board|Aga Khan|AKU-EB|"
    r"Federal Board|Lahore Board|Karachi Board)\b",
    re.IGNORECASE,
)


class BookUnderstandingExtractor:
    """
    Stage 1 of the Book Historical Analysis Engine.

    Call extract() with an IngestionResult to get:
    - DetectedBookMetadata
    - list[ExtractedChapterContent] (one per chapter)
    """

    def extract(
        self,
        ingestion_result: IngestionResult,
        board_hint: Optional[str] = None,
        class_hint: Optional[str] = None,
        subject_hint: Optional[str] = None,
        edition_hint: Optional[str] = None,
    ) -> tuple[DetectedBookMetadata, list[ExtractedChapterContent]]:
        """
        Main entry point.

        Returns (metadata, [chapters]).
        board_hint/class_hint/subject_hint are taken as verified if provided;
        otherwise detection is attempted and marked inferred.
        """
        metadata = self._extract_metadata(
            ingestion_result,
            board_hint=board_hint,
            class_hint=class_hint,
            subject_hint=subject_hint,
            edition_hint=edition_hint,
        )
        chapters = self._extract_chapters(ingestion_result)

        logger.info(
            "Stage 1: Extracted %d chapters, %d total concepts from '%s'",
            len(chapters),
            sum(len(c.concepts) for c in chapters),
            ingestion_result.file_path,
        )
        return metadata, chapters

    # ------------------------------------------------------------------
    # Metadata extraction
    # ------------------------------------------------------------------

    def _extract_metadata(
        self,
        result: IngestionResult,
        board_hint: Optional[str],
        class_hint: Optional[str],
        subject_hint: Optional[str],
        edition_hint: Optional[str],
    ) -> DetectedBookMetadata:
        meta = DetectedBookMetadata()

        # Use caller-supplied verified values first
        if board_hint:
            meta.set_verified("board", board_hint)
        if class_hint:
            meta.set_verified("class_level", class_hint)
        if subject_hint:
            meta.set_verified("subject", subject_hint)
        if edition_hint:
            meta.set_verified("edition", edition_hint)

        # Try to detect from first 3 pages (cover, title page)
        early_pages = result.pages[:3]
        for page in early_pages:
            for region in page.regions:
                text = region.text.strip()
                if not text:
                    continue

                if not board_hint:
                    m = _BOARD_PATTERN.search(text)
                    if m:
                        meta.flag_inferred("board", m.group(0), confidence=0.75)

                if not class_hint:
                    m = _CLASS_PATTERN.search(text)
                    if m:
                        meta.flag_inferred("class_level", m.group(1), confidence=0.80)

                if not subject_hint:
                    m = _SUBJECT_PATTERN.search(text)
                    if m:
                        meta.flag_inferred(
                            "subject", m.group(0).title(), confidence=0.80
                        )

        return meta

    # ------------------------------------------------------------------
    # Chapter extraction
    # ------------------------------------------------------------------

    def _extract_chapters(
        self, result: IngestionResult
    ) -> list[ExtractedChapterContent]:
        chapters: list[ExtractedChapterContent] = []
        current_chapter: Optional[ExtractedChapterContent] = None
        current_topic = ""
        chapter_number = 0

        for page in result.pages:
            for region in page.regions:
                text = region.text.strip()

                # ---- Chapter heading ----
                if region.type == RegionType.HEADING and self._is_chapter_heading(text):
                    if current_chapter:
                        chapters.append(current_chapter)
                    chapter_number += 1
                    current_chapter = ExtractedChapterContent(
                        chapter_title=text,
                        chapter_number=chapter_number,
                        page_start=page.page_number,
                    )
                    current_topic = ""
                    continue

                if current_chapter is None:
                    # Skip content before first chapter heading
                    continue

                current_chapter.page_end = page.page_number

                # ---- Topic (sub-heading) ----
                if region.type == RegionType.HEADING:
                    current_topic = text
                    if text not in current_chapter.topics:
                        current_chapter.topics.append(text)
                    continue

                # ---- Formula ----
                if isinstance(region, FormulaRegion):
                    current_chapter.formula_count += 1
                    concept = ExtractedConcept(
                        name=region.display_form or region.latex or text[:80],
                        concept_type=ConceptType.FORMULA,
                        chapter=current_chapter.chapter_title,
                        topic=current_topic,
                        source_page=page.page_number,
                        text_snippet=text[:200],
                        latex=region.latex,
                        has_formula=True,
                    )
                    current_chapter.concepts.append(concept)
                    continue

                # ---- Chemical equation ----
                if isinstance(region, ChemicalEquation):
                    current_chapter.chemical_equation_count += 1
                    concept = ExtractedConcept(
                        name=region.display or region.normalized or text[:80],
                        concept_type=ConceptType.CHEMICAL_EQUATION,
                        chapter=current_chapter.chapter_title,
                        topic=current_topic,
                        source_page=page.page_number,
                        text_snippet=text[:200],
                        has_formula=True,
                    )
                    current_chapter.concepts.append(concept)
                    continue

                # ---- Diagram / Graph ----
                if isinstance(region, DiagramRegion):
                    is_graph = bool(
                        _GRAPH_KEYWORDS.search(region.description)
                        or _GRAPH_KEYWORDS.search(region.caption)
                    )
                    if is_graph:
                        current_chapter.graph_count += 1
                        ctype = ConceptType.GRAPH
                    else:
                        current_chapter.diagram_count += 1
                        ctype = ConceptType.DIAGRAM

                    concept = ExtractedConcept(
                        name=region.associated_concept or region.caption or f"Diagram p.{page.page_number}",
                        concept_type=ctype,
                        chapter=current_chapter.chapter_title,
                        topic=current_topic,
                        source_page=page.page_number,
                        text_snippet=region.description[:200],
                        has_diagram=not is_graph,
                        has_graph=is_graph,
                    )
                    current_chapter.concepts.append(concept)
                    continue

                # ---- Table ----
                if isinstance(region, TableRegionSchema):
                    current_chapter.table_count += 1
                    concept = ExtractedConcept(
                        name=f"Table p.{page.page_number}",
                        concept_type=ConceptType.TABLE,
                        chapter=current_chapter.chapter_title,
                        topic=current_topic,
                        source_page=page.page_number,
                        text_snippet=text[:200],
                        has_table=True,
                    )
                    current_chapter.concepts.append(concept)
                    continue

                # ---- Paragraph-level concept/example/exercise detection ----
                if region.type == RegionType.PARAGRAPH and text:
                    if _EXAMPLE_PREFIXES.match(text):
                        current_chapter.example_count += 1
                        concept = ExtractedConcept(
                            name=text[:80],
                            concept_type=ConceptType.EXAMPLE,
                            chapter=current_chapter.chapter_title,
                            topic=current_topic,
                            source_page=page.page_number,
                            text_snippet=text[:200],
                        )
                        current_chapter.concepts.append(concept)
                    elif _EXERCISE_PREFIXES.match(text):
                        current_chapter.exercise_count += 1
                        concept = ExtractedConcept(
                            name=text[:80],
                            concept_type=ConceptType.EXERCISE,
                            chapter=current_chapter.chapter_title,
                            topic=current_topic,
                            source_page=page.page_number,
                            text_snippet=text[:200],
                        )
                        current_chapter.concepts.append(concept)
                    else:
                        # Extract named concepts from paragraph text
                        named = self._extract_named_concepts(
                            text, current_chapter.chapter_title, current_topic,
                            page.page_number
                        )
                        current_chapter.concepts.extend(named)

        if current_chapter:
            chapters.append(current_chapter)

        return chapters

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _is_chapter_heading(text: str) -> bool:
        """Heuristic: a heading starting with 'Chapter N' or 'Unit N'."""
        return bool(re.match(r"^\s*(chapter|unit)\s+\d+", text, re.IGNORECASE))

    @staticmethod
    def _extract_named_concepts(
        text: str, chapter: str, topic: str, page: int
    ) -> list[ExtractedConcept]:
        """
        Very light heuristic concept extraction from paragraph text.

        Extracts bold/italic-style terms (words in ALL CAPS or Title Case
        followed by a definition marker). In production this would use an LLM.
        """
        concepts: list[ExtractedConcept] = []
        # Match terms like: "Acceleration is defined as..."
        # or "ACCELERATION: rate of change..."
        pattern = re.compile(
            r"\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})\s+"
            r"(?:is defined as|refers to|is the|is a|can be defined|=)",
            re.IGNORECASE,
        )
        for match in pattern.finditer(text):
            term = match.group(1).strip()
            if len(term) < 4:
                continue
            concepts.append(ExtractedConcept(
                name=term,
                concept_type=ConceptType.CONCEPTUAL,
                chapter=chapter,
                topic=topic,
                source_page=page,
                text_snippet=text[:200],
            ))
        return concepts
