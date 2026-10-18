"""
Concept Graph — traverses TEXTBOOK ↕ CONCEPT ↕ PAST PAPER ↕ GENERATED MCQ.

The graph is a logical overlay on top of the in-memory stores. It does not
require a graph DB — the edges are implicit in the shared concept key
(board, class, subject, chapter, topic, concept).

Source priority ordering
------------------------
Every traversal returns sources sorted by SourcePriority:
  1 VERIFIED_CURRICULUM  →  2 VERIFIED_TEXTBOOK  →  3 VERIFIED_PAST_PAPER
  →  4 APPROVED_TEACHER_CONTENT  →  5 AI_GENERATED

AI-generated content is NEVER promoted to a higher priority level.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

from services.knowledge.schemas import (
    EvidenceSource,
    SourcePriority,
    CurriculumVersionNote,
)

if TYPE_CHECKING:
    from services.knowledge.curriculum_store import CurriculumStore
    from services.knowledge.textbook_mapper import TextbookMapper

logger = logging.getLogger(__name__)


@dataclass
class ConceptNode:
    """
    All evidence gathered for one (board, class, subject, chapter, topic, concept) key.
    """
    board: str
    class_level: str
    subject: str
    chapter: str
    topic: str
    concept: str

    curriculum_sources: list[EvidenceSource] = field(default_factory=list)
    model_paper_sources: list[EvidenceSource] = field(default_factory=list)
    textbook_sources: list[EvidenceSource] = field(default_factory=list)
    past_paper_sources: list[EvidenceSource] = field(default_factory=list)
    approved_sources: list[EvidenceSource] = field(default_factory=list)
    ai_sources: list[EvidenceSource] = field(default_factory=list)

    curriculum_version_note: Optional[CurriculumVersionNote] = None

    @property
    def all_sources(self) -> list[EvidenceSource]:
        """All sources merged and sorted by source priority (highest authority first)."""
        combined = (
            self.curriculum_sources
            + self.model_paper_sources
            + self.textbook_sources
            + self.past_paper_sources
            + self.approved_sources
            + self.ai_sources
        )
        return sorted(combined, key=lambda s: s.priority.value)

    @property
    def top_priority(self) -> SourcePriority:
        """The highest-authority source priority available for this concept."""
        if self.curriculum_sources:
            return SourcePriority.VERIFIED_CURRICULUM
        if self.model_paper_sources:
            return SourcePriority.VERIFIED_PAST_PAPER
        if self.textbook_sources:
            return SourcePriority.VERIFIED_TEXTBOOK
        if self.past_paper_sources:
            return SourcePriority.VERIFIED_PAST_PAPER
        if self.approved_sources:
            return SourcePriority.APPROVED_TEACHER_CONTENT
        return SourcePriority.AI_GENERATED

    @property
    def has_human_verified_evidence(self) -> bool:
        return bool(
            self.curriculum_sources
            or self.model_paper_sources
            or self.textbook_sources
            or self.past_paper_sources
            or self.approved_sources
        )

    def summary(self) -> str:
        return (
            f"ConceptNode({self.board}/{self.class_level}/{self.subject}/"
            f"{self.chapter}/{self.topic}/{self.concept}) "
            f"top_priority={self.top_priority.label} "
            f"sources={len(self.all_sources)}"
        )


class ConceptGraph:
    """
    Traverses the TEXTBOOK ↕ CONCEPT ↕ PAST PAPER ↕ GENERATED MCQ graph.

    Parameters
    ----------
    curriculum_store : CurriculumStore
        Provides official curriculum items (priority 1).
    textbook_mapper : TextbookMapper
        Provides textbook → concept mappings (priority 2 if verified, 5 if not).
    past_paper_questions : list[dict] | None
        Pre-fetched past paper questions with concept annotations.
        In production, this is queried from the DB. In tests, pass a list.
    approved_questions : list[dict] | None
        Pre-fetched teacher/reviewer approved questions.
    ai_questions : list[dict] | None
        AI-generated questions (always priority 5).
    include_ai : bool
        If False (default), AI sources are excluded from the graph traversal.
    """

    def __init__(
        self,
        curriculum_store: "CurriculumStore",
        textbook_mapper: "TextbookMapper",
        past_paper_questions: Optional[list[dict]] = None,
        approved_questions: Optional[list[dict]] = None,
        ai_questions: Optional[list[dict]] = None,
        include_ai: bool = False,
    ) -> None:
        self._curriculum = curriculum_store
        self._textbooks = textbook_mapper
        self._past_papers: list[dict] = past_paper_questions or []
        self._approved: list[dict] = approved_questions or []
        self._ai: list[dict] = ai_questions or []
        self._include_ai = include_ai

    def gather(
        self,
        board: str,
        class_level: str,
        subject: str,
        concept: Optional[str] = None,
        chapter: Optional[str] = None,
        topic: Optional[str] = None,
        year: Optional[int] = None,
    ) -> list[ConceptNode]:
        """
        Gather all evidence for the given concept query.

        Returns a list of ConceptNode objects, one per unique
        (chapter, topic, concept) triple that matches the query.
        Nodes are sorted by top_priority (highest authority first).
        """
        nodes: dict[tuple, ConceptNode] = {}

        def _key(ch: str, tp: str, co: str) -> tuple:
            return (ch.lower(), tp.lower(), co.lower())

        def _get_or_create(ch: str, tp: str, co: str) -> ConceptNode:
            k = _key(ch, tp, co)
            if k not in nodes:
                nodes[k] = ConceptNode(
                    board=board,
                    class_level=class_level,
                    subject=subject,
                    chapter=ch,
                    topic=tp,
                    concept=co,
                )
            return nodes[k]

        # 1. Curriculum items (priority 1)
        curriculum_items = self._curriculum.find_items(
            board_id=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=topic,
            concept=concept,
            year=year,
        )
        for item in curriculum_items:
            node = _get_or_create(item.chapter, item.topic, item.concept)
            version = self._curriculum.get_version(item.curriculum_version_id)
            node.curriculum_sources.append(EvidenceSource(
                source_type="CURRICULUM",
                source_id=item.id,
                priority=SourcePriority.VERIFIED_CURRICULUM,
                board=board,
                curriculum_version=version.version_name if version else None,
                chapter=item.chapter,
                topic=item.topic,
                concept=item.concept,
                learning_objective=item.learning_objective or None,
                relationship="CURRICULUM_MANDATED",
                confidence=1.0,
                text_snippet=item.learning_objective[:200] if item.learning_objective else "",
            ))
            # Check for version mixing
            note = self._curriculum.check_version_mixing(curriculum_items, board)
            if note:
                node.curriculum_version_note = note

        # 2. Textbook mappings (priority 2 if verified, 5 if not)
        textbook_mappings = self._textbooks.find(
            board_short_code=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=topic,
            concept=concept,
        )
        for mapping in textbook_mappings:
            node = _get_or_create(mapping.chapter, mapping.topic, mapping.concept)
            src = EvidenceSource(
                source_type="TEXTBOOK",
                source_id=mapping.id,
                priority=mapping.effective_priority,
                board=board,
                chapter=mapping.chapter,
                topic=mapping.topic,
                concept=mapping.concept,
                page=mapping.page_start,
                relationship="TEXTBOOK_COVERS",
                confidence=mapping.confidence,
                text_snippet=mapping.text_snippet[:200],
            )
            if mapping.is_human_verified:
                node.textbook_sources.append(src)
            else:
                node.ai_sources.append(src)

        # 3. Past paper questions (priority 3)
        for ppq in self._past_papers:
            ppq_concept = ppq.get("concept", "")
            ppq_chapter = ppq.get("chapter", "")
            ppq_topic = ppq.get("topic", "")
            ppq_board = ppq.get("board", "")

            if ppq_board and ppq_board != board:
                continue
            if concept and ppq_concept.lower() != concept.lower():
                continue
            if chapter and ppq_chapter.lower() != chapter.lower():
                continue

            node = _get_or_create(
                ppq_chapter or chapter or "",
                ppq_topic or topic or "",
                ppq_concept or concept or "",
            )
            is_model = (
                ppq.get("paper_type") == "Model Paper"
                or ppq.get("session") == "Model Paper"
                or ppq.get("source_type") == "MODEL_PAPER"
            )
            src_type = "MODEL_PAPER" if is_model else "PAST_PAPER"
            rel = "MODEL_PAPER_BLUEPRINT" if is_model else "PAST_PAPER_TESTED"

            evidence = EvidenceSource(
                source_type=src_type,
                source_id=ppq.get("id", ""),
                priority=SourcePriority.VERIFIED_PAST_PAPER,
                board=board,
                year=ppq.get("year"),
                page=ppq.get("page"),
                question_number=ppq.get("question_number"),
                chapter=ppq_chapter,
                topic=ppq_topic,
                concept=ppq_concept,
                relationship=rel,
                confidence=ppq.get("confidence", 1.0),
                text_snippet=(ppq.get("text", ""))[:200],
            )
            if is_model:
                node.model_paper_sources.append(evidence)
            else:
                node.past_paper_sources.append(evidence)

        # 4. Approved teacher/reviewer content (priority 4)
        for aq in self._approved:
            aq_concept = aq.get("concept", "")
            aq_board = aq.get("board", "")
            if aq_board and aq_board != board:
                continue
            if concept and aq_concept.lower() != concept.lower():
                continue
            node = _get_or_create(
                aq.get("chapter", chapter or ""),
                aq.get("topic", topic or ""),
                aq_concept or concept or "",
            )
            node.approved_sources.append(EvidenceSource(
                source_type="APPROVED_QUESTION",
                source_id=aq.get("id", ""),
                priority=SourcePriority.APPROVED_TEACHER_CONTENT,
                board=board,
                concept=aq_concept,
                relationship="APPROVED_CONTENT",
                confidence=aq.get("confidence", 0.9),
                text_snippet=(aq.get("text", ""))[:200],
            ))

        # 5. AI-generated (priority 5) — only if include_ai=True
        if self._include_ai:
            for aiq in self._ai:
                aiq_concept = aiq.get("concept", "")
                aiq_board = aiq.get("board", "")
                if aiq_board and aiq_board != board:
                    continue
                if concept and aiq_concept.lower() != concept.lower():
                    continue
                node = _get_or_create(
                    aiq.get("chapter", chapter or ""),
                    aiq.get("topic", topic or ""),
                    aiq_concept or concept or "",
                )
                node.ai_sources.append(EvidenceSource(
                    source_type="AI_GENERATED",
                    source_id=aiq.get("id", ""),
                    priority=SourcePriority.AI_GENERATED,
                    board=board,
                    concept=aiq_concept,
                    relationship="AI_GENERATED",
                    confidence=aiq.get("confidence", 0.5),
                    text_snippet=(aiq.get("text", ""))[:200],
                ))

        # Sort nodes: highest authority first, then by concept name
        sorted_nodes = sorted(
            nodes.values(),
            key=lambda n: (n.top_priority.value, n.concept.lower()),
        )
        return sorted_nodes
