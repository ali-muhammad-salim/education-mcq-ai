"""
Curriculum Store — manages CurriculumVersion and CurriculumItem records.

Responsibilities
----------------
* Store and query curriculum versions per board.
* Resolve which curriculum version was active during a given exam year.
* Detect when evidence spans incompatible curriculum versions and produce
  a CurriculumVersionNote warning.
* Never silently mix incompatible versions.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from services.knowledge.schemas import (
    CurriculumItem,
    CurriculumVersion,
    CurriculumVersionNote,
    SourcePriority,
)

logger = logging.getLogger(__name__)


class CurriculumStore:
    """
    In-memory curriculum store.

    In production this would delegate to the Prisma DB (BoardVersion /
    BoardCurriculum tables), but for the service layer tests it runs
    fully in-memory.
    """

    def __init__(self) -> None:
        # version_id → CurriculumVersion
        self._versions: dict[str, CurriculumVersion] = {}
        # item_id → CurriculumItem
        self._items: dict[str, CurriculumItem] = {}

    # ------------------------------------------------------------------
    # Version management
    # ------------------------------------------------------------------

    def add_version(self, version: CurriculumVersion) -> str:
        self._versions[version.id] = version
        logger.debug(
            "CurriculumStore: added version '%s' for board '%s'",
            version.version_name, version.board_id,
        )
        return version.id

    def create_version(
        self,
        board_id: str,
        version_name: str,
        year_from: int,
        year_to: Optional[int] = None,
        description: str = "",
        major_changes: Optional[list[str]] = None,
    ) -> CurriculumVersion:
        v = CurriculumVersion(
            id=str(uuid.uuid4()),
            board_id=board_id,
            version_name=version_name,
            year_from=year_from,
            year_to=year_to,
            description=description,
            major_changes=major_changes or [],
        )
        self.add_version(v)
        return v

    def get_version(self, version_id: str) -> Optional[CurriculumVersion]:
        return self._versions.get(version_id)

    def get_active_version(self, board_id: str, year: int) -> Optional[CurriculumVersion]:
        """
        Return the curriculum version that was active during the given exam year.

        If multiple versions are active for the same year, the most recently
        started version (highest year_from) wins.
        """
        candidates = [
            v for v in self._versions.values()
            if v.board_id == board_id and v.is_active_for_year(year)
        ]
        if not candidates:
            return None
        return max(candidates, key=lambda v: v.year_from)

    def versions_for_board(self, board_id: str) -> list[CurriculumVersion]:
        return sorted(
            [v for v in self._versions.values() if v.board_id == board_id],
            key=lambda v: v.year_from,
        )

    # ------------------------------------------------------------------
    # Item management
    # ------------------------------------------------------------------

    def add_item(self, item: CurriculumItem) -> str:
        self._items[item.id] = item
        return item.id

    def create_item(
        self,
        curriculum_version_id: str,
        class_level: str,
        subject: str,
        chapter: str,
        topic: str,
        concept: str,
        learning_objective: str = "",
        chapter_number: Optional[int] = None,
        is_compulsory: bool = True,
        marks_weightage: Optional[float] = None,
        notes: str = "",
    ) -> CurriculumItem:
        item = CurriculumItem(
            id=str(uuid.uuid4()),
            curriculum_version_id=curriculum_version_id,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            chapter_number=chapter_number,
            topic=topic,
            concept=concept,
            learning_objective=learning_objective,
            is_compulsory=is_compulsory,
            marks_weightage=marks_weightage,
            source_priority=SourcePriority.VERIFIED_CURRICULUM,
            notes=notes,
        )
        self.add_item(item)
        return item

    def items_for_version(self, version_id: str) -> list[CurriculumItem]:
        return [i for i in self._items.values() if i.curriculum_version_id == version_id]

    def find_items(
        self,
        board_id: str,
        class_level: str,
        subject: str,
        chapter: Optional[str] = None,
        topic: Optional[str] = None,
        concept: Optional[str] = None,
        year: Optional[int] = None,
    ) -> list[CurriculumItem]:
        """
        Find curriculum items matching the given filters.

        If `year` is provided, only returns items from the version active
        in that year.
        """
        # First get all versions for this board, optionally filtered by year
        if year is not None:
            active = self.get_active_version(board_id, year)
            version_ids = {active.id} if active else set()
        else:
            version_ids = {
                v.id for v in self._versions.values() if v.board_id == board_id
            }

        results = []
        for item in self._items.values():
            if item.curriculum_version_id not in version_ids:
                continue
            if item.class_level != class_level:
                continue
            if item.subject != subject:
                continue
            if chapter is not None and item.chapter.lower() != chapter.lower():
                continue
            if topic is not None and item.topic.lower() != topic.lower():
                continue
            if concept is not None and item.concept.lower() != concept.lower():
                continue
            results.append(item)
        return results

    # ------------------------------------------------------------------
    # Cross-version integrity checking
    # ------------------------------------------------------------------

    def check_version_mixing(
        self, items: list[CurriculumItem], board_id: str
    ) -> Optional[CurriculumVersionNote]:
        """
        Check if a list of curriculum items spans incompatible versions.

        Returns a CurriculumVersionNote if versions are mixed, None otherwise.
        """
        version_ids = {item.curriculum_version_id for item in items}
        if len(version_ids) <= 1:
            return None

        version_names: list[str] = []
        for vid in sorted(version_ids):
            v = self._versions.get(vid)
            if v:
                version_names.append(f"{v.version_name} ({v.year_from}–{v.year_to or 'present'})")
            else:
                version_names.append(vid)

        return CurriculumVersionNote(
            versions_mixed=version_names,
            message=(
                "Evidence comes from multiple curriculum versions: "
                + ", ".join(version_names)
                + ". Verify that comparisons are valid across these versions before using "
                "this evidence for question generation."
            ),
        )

    def __repr__(self) -> str:
        return (
            f"CurriculumStore("
            f"versions={len(self._versions)}, items={len(self._items)})"
        )
