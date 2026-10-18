"""
Textbook Mapper — manages TEXTBOOK ↕ CONCEPT edges.

A TextbookMapping records that a specific textbook chapter / page range
covers a specific (board, class, subject, chapter, topic, concept).

Design principles
-----------------
* All AI-inferred mappings start with is_human_verified=False and
  effective_priority = AI_GENERATED (5).
* Human verification raises the effective_priority to VERIFIED_TEXTBOOK (2).
* Confidence is separate from verification: an AI mapping can have high
  confidence but still not be human-verified.
* No mapping is silently promoted to authoritative status.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from services.knowledge.schemas import SourcePriority, TextbookMapping

logger = logging.getLogger(__name__)


class TextbookMapper:
    """
    In-memory store for TextbookMapping records.

    Production usage would persist these to a DB table. The in-memory
    implementation provides the same interface so tests run offline.
    """

    def __init__(self) -> None:
        # mapping_id → TextbookMapping
        self._mappings: dict[str, TextbookMapping] = {}

    # ------------------------------------------------------------------
    # Adding mappings
    # ------------------------------------------------------------------

    def add_mapping(self, mapping: TextbookMapping) -> str:
        self._mappings[mapping.id] = mapping
        logger.debug(
            "TextbookMapper: added mapping '%s' → '%s/%s/%s'",
            mapping.chapter_title, mapping.chapter, mapping.topic, mapping.concept,
        )
        return mapping.id

    def create_mapping(
        self,
        book_id: str,
        book_title: str,
        chapter_title: str,
        board_short_code: str,
        curriculum_version_id: str,
        class_level: str,
        subject: str,
        chapter: str,
        topic: str,
        concept: str,
        book_edition: str = "",
        chapter_number: Optional[int] = None,
        page_start: Optional[int] = None,
        page_end: Optional[int] = None,
        section_title: str = "",
        confidence: float = 0.8,
        is_human_verified: bool = False,
        text_snippet: str = "",
    ) -> TextbookMapping:
        mapping = TextbookMapping(
            id=str(uuid.uuid4()),
            book_id=book_id,
            book_title=book_title,
            book_edition=book_edition,
            chapter_title=chapter_title,
            chapter_number=chapter_number,
            page_start=page_start,
            page_end=page_end,
            section_title=section_title,
            board_short_code=board_short_code,
            curriculum_version_id=curriculum_version_id,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=topic,
            concept=concept,
            confidence=confidence,
            is_human_verified=is_human_verified,
            text_snippet=text_snippet,
        )
        self.add_mapping(mapping)
        return mapping

    # ------------------------------------------------------------------
    # Human verification
    # ------------------------------------------------------------------

    def verify(self, mapping_id: str, verified_by: str = "human") -> TextbookMapping:
        """
        Mark a mapping as human-verified.

        This raises its effective_priority from AI_GENERATED (5)
        to VERIFIED_TEXTBOOK (2).
        """
        mapping = self._mappings.get(mapping_id)
        if mapping is None:
            raise KeyError(f"TextbookMapping '{mapping_id}' not found")

        updated = mapping.model_copy(
            update={
                "is_human_verified": True,
                "verified_by": verified_by,
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        self._mappings[mapping_id] = updated
        logger.info(
            "TextbookMapper: mapping '%s' verified by '%s' → priority %s",
            mapping_id, verified_by, SourcePriority.VERIFIED_TEXTBOOK.label,
        )
        return updated

    def reject(self, mapping_id: str) -> None:
        """Remove an incorrect AI-generated mapping."""
        if mapping_id not in self._mappings:
            raise KeyError(f"TextbookMapping '{mapping_id}' not found")
        del self._mappings[mapping_id]
        logger.info("TextbookMapper: mapping '%s' rejected and removed", mapping_id)

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def find(
        self,
        board_short_code: Optional[str] = None,
        class_level: Optional[str] = None,
        subject: Optional[str] = None,
        chapter: Optional[str] = None,
        topic: Optional[str] = None,
        concept: Optional[str] = None,
        human_verified_only: bool = False,
    ) -> list[TextbookMapping]:
        """Find mappings matching the given filters."""
        results = []
        for m in self._mappings.values():
            if board_short_code and m.board_short_code != board_short_code:
                continue
            if class_level and m.class_level != class_level:
                continue
            if subject and m.subject != subject:
                continue
            if chapter and m.chapter.lower() != chapter.lower():
                continue
            if topic and m.topic.lower() != topic.lower():
                continue
            if concept and m.concept.lower() != concept.lower():
                continue
            if human_verified_only and not m.is_human_verified:
                continue
            results.append(m)
        # Sort by priority (verified first), then confidence descending
        results.sort(key=lambda m: (m.effective_priority.value, -m.confidence))
        return results

    def find_by_concept(
        self, concept: str, board: Optional[str] = None, subject: Optional[str] = None
    ) -> list[TextbookMapping]:
        return self.find(
            board_short_code=board, subject=subject, concept=concept
        )

    def get(self, mapping_id: str) -> Optional[TextbookMapping]:
        return self._mappings.get(mapping_id)

    def all_mappings(self) -> list[TextbookMapping]:
        return list(self._mappings.values())

    def __len__(self) -> int:
        return len(self._mappings)

    def __repr__(self) -> str:
        verified = sum(1 for m in self._mappings.values() if m.is_human_verified)
        return f"TextbookMapper(total={len(self._mappings)}, verified={verified})"
