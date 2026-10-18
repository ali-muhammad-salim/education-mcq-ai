"""
Stage 5 — Edition Diff Analyzer.

Compares the concept list of the current edition against a previously
registered edition of the same book.

Classifies each concept as:
- UNCHANGED  — present in both editions, content the same
- REMOVED    — in old edition, absent from new
- NEW        — absent from old, present in new → "NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE"
- MODIFIED   — in both but content changed (text similarity < threshold)

If no previous edition exists: all concepts are marked UNCHANGED with a note
that no baseline is available. The pipeline degrades gracefully.
"""

from __future__ import annotations

import logging
from typing import Optional

from services.book_analysis.schemas import (
    ExtractedConcept,
    ExtractedChapterContent,
    EditionChange,
    ChangeType,
)

logger = logging.getLogger(__name__)

# Jaccard similarity below this threshold → MODIFIED
_MODIFY_THRESHOLD = 0.75


class EditionDiffAnalyzer:
    """
    Stage 5 of the Book Historical Analysis Engine.

    Stores previous-edition concept lists in memory keyed by
    (book_title, edition, chapter_title).

    Production systems should persist this to the database.
    """

    def __init__(self) -> None:
        # (book_title, edition, chapter_title) → {concept_name: text_snippet}
        self._previous_editions: dict[str, dict[str, str]] = {}

    # ------------------------------------------------------------------
    # Register a previous edition (called when an old edition was processed)
    # ------------------------------------------------------------------

    def register_previous_edition(
        self,
        book_title: str,
        edition: str,
        chapters: list[ExtractedChapterContent],
    ) -> None:
        """Persist the previous edition's concept snapshot for future diff."""
        for chapter in chapters:
            key = self._key(book_title, edition, chapter.chapter_title)
            self._previous_editions[key] = {
                c.name: c.text_snippet for c in chapter.concepts
            }
        logger.info(
            "EditionDiffAnalyzer: Registered previous edition '%s' for book '%s' "
            "(%d chapters).",
            edition, book_title, len(chapters),
        )

    # ------------------------------------------------------------------
    # Diff a new edition against the registered previous edition
    # ------------------------------------------------------------------

    def diff_chapter(
        self,
        chapter: ExtractedChapterContent,
        book_title: str,
        current_edition: str,
        previous_edition: Optional[str] = None,
    ) -> list[EditionChange]:
        """
        Compare chapter concepts against the previous edition.

        Returns EditionChange records for every concept.
        """
        if previous_edition is None:
            # No baseline — all concepts UNCHANGED with note
            logger.info(
                "EditionDiffAnalyzer: No previous edition registered for '%s'. "
                "All concepts marked UNCHANGED.",
                book_title,
            )
            return [
                EditionChange(
                    concept=c.name,
                    chapter=chapter.chapter_title,
                    change_type=ChangeType.UNCHANGED,
                    current_edition=current_edition,
                    note="No previous edition available for comparison.",
                )
                for c in chapter.concepts
            ]

        key = self._key(book_title, previous_edition, chapter.chapter_title)
        old_concepts: dict[str, str] = self._previous_editions.get(key, {})

        if not old_concepts:
            logger.info(
                "EditionDiffAnalyzer: No previous edition data for chapter '%s' "
                "of '%s' edition '%s'.",
                chapter.chapter_title, book_title, previous_edition,
            )
            return [
                EditionChange(
                    concept=c.name,
                    chapter=chapter.chapter_title,
                    change_type=ChangeType.UNCHANGED,
                    current_edition=current_edition,
                    note=f"No baseline data for chapter '{chapter.chapter_title}' in edition '{previous_edition}'.",
                )
                for c in chapter.concepts
            ]

        changes: list[EditionChange] = []
        new_names = {c.name for c in chapter.concepts}

        # Check each concept in the new edition
        for concept in chapter.concepts:
            if concept.name not in old_concepts:
                change = EditionChange(
                    concept=concept.name,
                    chapter=chapter.chapter_title,
                    change_type=ChangeType.NEW,
                    previous_edition=previous_edition,
                    current_edition=current_edition,
                    note=f"Concept '{concept.name}' is new in edition '{current_edition}'.",
                    new_concept_historical_note="NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE",
                )
            else:
                old_snippet = old_concepts[concept.name]
                sim = _jaccard(old_snippet, concept.text_snippet)
                if sim >= _MODIFY_THRESHOLD:
                    change = EditionChange(
                        concept=concept.name,
                        chapter=chapter.chapter_title,
                        change_type=ChangeType.UNCHANGED,
                        previous_edition=previous_edition,
                        current_edition=current_edition,
                    )
                else:
                    change = EditionChange(
                        concept=concept.name,
                        chapter=chapter.chapter_title,
                        change_type=ChangeType.MODIFIED,
                        previous_edition=previous_edition,
                        current_edition=current_edition,
                        note=f"Content changed between editions (similarity: {sim:.2f}).",
                    )
            changes.append(change)

        # Find removed concepts (in old but not in new)
        for old_name in old_concepts:
            if old_name not in new_names:
                changes.append(EditionChange(
                    concept=old_name,
                    chapter=chapter.chapter_title,
                    change_type=ChangeType.REMOVED,
                    previous_edition=previous_edition,
                    current_edition=current_edition,
                    note=f"Concept '{old_name}' was present in edition '{previous_edition}' but removed in '{current_edition}'.",
                ))

        logger.info(
            "EditionDiffAnalyzer: Chapter '%s' — NEW: %d, REMOVED: %d, MODIFIED: %d, UNCHANGED: %d",
            chapter.chapter_title,
            sum(1 for c in changes if c.change_type == ChangeType.NEW),
            sum(1 for c in changes if c.change_type == ChangeType.REMOVED),
            sum(1 for c in changes if c.change_type == ChangeType.MODIFIED),
            sum(1 for c in changes if c.change_type == ChangeType.UNCHANGED),
        )
        return changes

    @staticmethod
    def _key(book_title: str, edition: str, chapter: str) -> str:
        return f"{book_title}::{edition}::{chapter}".lower().strip()


def _jaccard(a: str, b: str) -> float:
    """Jaccard similarity on word sets."""
    wa = set(a.lower().split())
    wb = set(b.lower().split())
    if not wa and not wb:
        return 1.0
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)
