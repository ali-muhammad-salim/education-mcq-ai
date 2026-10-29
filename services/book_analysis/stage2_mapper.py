"""
Stage 2 — Curriculum Mapper.

For each ExtractedConcept, maps it to the official curriculum via:
1. Exact concept name match in CurriculumStore.find_items()
2. Related concept fallback via ConceptGraph.find_related_concepts()
3. Registers the textbook→concept edge in TextbookMapper

All AI-inferred mappings are marked is_human_verified=False.
CurriculumVersionNote is emitted when evidence spans multiple versions.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.concept_graph import ConceptGraph
from services.knowledge.textbook_mapper import TextbookMapper
from services.book_analysis.schemas import (
    ExtractedChapterContent,
    ExtractedConcept,
    CurriculumMappingResult,
)

logger = logging.getLogger(__name__)


class CurriculumMapper:
    """
    Stage 2 of the Book Historical Analysis Engine.

    Produces CurriculumMappingResult for every concept in each chapter.
    Registers TEXTBOOK ↕ CONCEPT edges in the TextbookMapper.
    """

    def __init__(
        self,
        curriculum_store: CurriculumStore,
        concept_graph: ConceptGraph,
        textbook_mapper: TextbookMapper,
    ) -> None:
        self._curriculum = curriculum_store
        self._graph = concept_graph
        self._textbook_mapper = textbook_mapper

    def map_chapter(
        self,
        chapter: ExtractedChapterContent,
        book_id: str,
        book_title: str,
        book_edition: str,
        board_short_code: str,
        curriculum_version_id: str,
        class_level: str,
        subject: str,
    ) -> list[CurriculumMappingResult]:
        """
        Map all concepts in a chapter and return CurriculumMappingResult records.
        """
        results: list[CurriculumMappingResult] = []
        seen_versions: set[str] = set()

        for concept in chapter.concepts:
            result = self._map_concept(
                concept=concept,
                book_id=book_id,
                book_title=book_title,
                book_edition=book_edition,
                board_short_code=board_short_code,
                curriculum_version_id=curriculum_version_id,
                class_level=class_level,
                subject=subject,
                chapter=chapter.chapter_title,
                chapter_number=chapter.chapter_number,
                page_start=chapter.page_start,
                page_end=chapter.page_end,
            )
            results.append(result)
            if result.curriculum_version:
                seen_versions.add(result.curriculum_version)

        if len(seen_versions) > 1:
            logger.warning(
                "Stage 2: Chapter '%s' maps to multiple curriculum versions: %s — "
                "verify that comparisons across versions are valid.",
                chapter.chapter_title, seen_versions,
            )

        logger.debug(
            "Stage 2: Mapped %d concepts for chapter '%s'",
            len(results), chapter.chapter_title,
        )
        return results

    def _map_concept(
        self,
        concept: ExtractedConcept,
        book_id: str,
        book_title: str,
        book_edition: str,
        board_short_code: str,
        curriculum_version_id: str,
        class_level: str,
        subject: str,
        chapter: str,
        chapter_number: Optional[int],
        page_start: Optional[int],
        page_end: Optional[int],
    ) -> CurriculumMappingResult:

        # ---- 1. Exact match (use find_items which is the actual CurriculumStore API) ----
        exact = self._curriculum.find_items(
            board_id=board_short_code,
            class_level=class_level,
            subject=subject,
            concept=concept.name,
        )
        if exact:
            item = exact[0]
            self._register_textbook_mapping(
                book_id=book_id, book_title=book_title, book_edition=book_edition,
                board_short_code=board_short_code, curriculum_version_id=curriculum_version_id,
                class_level=class_level, subject=subject, chapter=chapter,
                chapter_number=chapter_number, page_start=page_start, page_end=page_end,
                concept=concept, confidence=0.95,
            )
            return CurriculumMappingResult(
                concept=concept.name,
                curriculum_id=item.id,
                curriculum_version=item.curriculum_version_id,
                learning_objective=item.learning_objective,
                is_compulsory=item.is_compulsory,
                match_type="EXACT",
                confidence=0.95,
            )

        # ---- 2. Related concept via ConceptGraph.gather() ----
        try:
            graph_nodes = self._graph.gather(
                board=board_short_code,
                class_level=class_level,
                subject=subject,
                chapter=chapter,
                topic=concept.topic,
                concept=concept.name,
            )
        except Exception:
            graph_nodes = []

        if graph_nodes:
            top_node = graph_nodes[0]
            if top_node.curriculum_sources:
                top_source = top_node.curriculum_sources[0]
                self._register_textbook_mapping(
                    book_id=book_id, book_title=book_title, book_edition=book_edition,
                    board_short_code=board_short_code, curriculum_version_id=curriculum_version_id,
                    class_level=class_level, subject=subject, chapter=chapter,
                    chapter_number=chapter_number, page_start=page_start, page_end=page_end,
                    concept=concept, confidence=0.70,
                )
                return CurriculumMappingResult(
                    concept=concept.name,
                    curriculum_id=top_source.source_id,
                    curriculum_version=top_source.curriculum_version or "",
                    learning_objective=top_source.learning_objective or "",
                    match_type="RELATED",
                    confidence=0.70,
                    note="Matched via ConceptGraph curriculum sources.",
                )

        # ---- 3. Not found ----
        return CurriculumMappingResult(
            concept=concept.name,
            match_type="NOT_FOUND",
            confidence=0.0,
            note="No matching curriculum item found. May be a new or renamed concept.",
        )


    def _register_textbook_mapping(
        self,
        book_id: str,
        book_title: str,
        book_edition: str,
        board_short_code: str,
        curriculum_version_id: str,
        class_level: str,
        subject: str,
        chapter: str,
        chapter_number: Optional[int],
        page_start: Optional[int],
        page_end: Optional[int],
        concept: ExtractedConcept,
        confidence: float,
    ) -> None:
        """Register a TEXTBOOK ↕ CONCEPT edge. Always starts as not human-verified."""
        self._textbook_mapper.create_mapping(
            book_id=book_id,
            book_title=book_title,
            book_edition=book_edition,
            chapter_title=concept.chapter,
            board_short_code=board_short_code,
            curriculum_version_id=curriculum_version_id,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=concept.topic,
            concept=concept.name,
            chapter_number=chapter_number,
            page_start=page_start,
            page_end=page_end,
            confidence=confidence,
            is_human_verified=False,
            text_snippet=concept.text_snippet,
        )
