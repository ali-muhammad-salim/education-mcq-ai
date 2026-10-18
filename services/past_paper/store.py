"""
In-memory data store for the Past Paper Intelligence Engine.

Provides typed add/query operations over:
  - PastPaper metadata
  - ExtractedQuestion records
  - QuestionClassification records
  - SemanticRelationship records
  - HistoricalStats records

This store is intentionally schema-agnostic — it holds Python objects and
performs simple list/dict lookups.  It is designed to be swapped for a
real DB-backed repository in production without changing any other module.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

from services.past_paper.schemas import (
    PaperMetadata,
    ExtractedQuestion,
    QuestionClassification,
    SemanticRelationship,
    HistoricalStats,
    ConceptOccurrence,
)


@dataclass
class StoredPaper:
    """A past paper record held in the store."""
    id: str
    metadata: PaperMetadata
    raw_text: str = ""
    source_file: Optional[str] = None


class PastPaperStore:
    """
    Thread-safe (for the tests) in-memory store for all engine data.

    All IDs are auto-generated UUIDs unless supplied by the caller.
    """

    def __init__(self) -> None:
        self._papers: dict[str, StoredPaper] = {}
        self._questions: dict[str, ExtractedQuestion] = {}
        self._classifications: dict[str, QuestionClassification] = {}
        self._relationships: list[SemanticRelationship] = []
        self._stats: dict[str, HistoricalStats] = {}  # key = _stats_key(...)

    # ------------------------------------------------------------------
    # Papers
    # ------------------------------------------------------------------

    def add_paper(
        self,
        metadata: PaperMetadata,
        raw_text: str = "",
        paper_id: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> str:
        pid = paper_id or str(uuid.uuid4())
        self._papers[pid] = StoredPaper(
            id=pid,
            metadata=metadata,
            raw_text=raw_text,
            source_file=source_file,
        )
        return pid

    def get_paper(self, paper_id: str) -> Optional[StoredPaper]:
        return self._papers.get(paper_id)

    def all_papers(self) -> list[StoredPaper]:
        return list(self._papers.values())

    # ------------------------------------------------------------------
    # Questions
    # ------------------------------------------------------------------

    def add_question(
        self,
        question: ExtractedQuestion,
        question_id: Optional[str] = None,
    ) -> str:
        qid = question_id or str(uuid.uuid4())
        # Store by ID but also carry the ID inside the question for convenience
        q_copy = question.model_copy(update={})  # shallow copy to avoid mutation
        self._questions[qid] = q_copy
        return qid

    def get_question(self, question_id: str) -> Optional[ExtractedQuestion]:
        return self._questions.get(question_id)

    def all_questions(self) -> list[ExtractedQuestion]:
        return list(self._questions.values())

    def questions_for_paper(self, paper_id: str) -> list[ExtractedQuestion]:
        return [q for q in self._questions.values() if q.paper_id == paper_id]

    def questions_by_year(
        self, year: int, board: Optional[str] = None, subject: Optional[str] = None
    ) -> list[ExtractedQuestion]:
        results = [q for q in self._questions.values() if q.year == year]
        if board:
            results = [q for q in results if q.board.upper() == board.upper()]
        if subject:
            results = [q for q in results if q.subject.lower() == subject.lower()]
        return results

    def questions_by_board(self, board: str) -> list[ExtractedQuestion]:
        return [q for q in self._questions.values()
                if q.board.upper() == board.upper()]

    def questions_by_chapter(
        self,
        chapter: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ExtractedQuestion]:
        """Find questions classified under a given chapter."""
        # Need to join with classifications
        chapter_qids = {
            qid for qid, cls in self._classifications.items()
            if cls.chapter.value.lower() == chapter.lower()
        }
        results = [q for qid, q in self._questions.items() if qid in chapter_qids]
        if board:
            results = [q for q in results if q.board.upper() == board.upper()]
        if subject:
            results = [q for q in results if q.subject.lower() == subject.lower()]
        return results

    # ------------------------------------------------------------------
    # Classifications
    # ------------------------------------------------------------------

    def add_classification(self, question_id: str, cls: QuestionClassification) -> None:
        self._classifications[question_id] = cls

    def get_classification(self, question_id: str) -> Optional[QuestionClassification]:
        return self._classifications.get(question_id)

    def all_classifications(self) -> dict[str, QuestionClassification]:
        return dict(self._classifications)

    def classified_questions(self) -> list[tuple[ExtractedQuestion, QuestionClassification]]:
        """Return all (question, classification) pairs that have both records."""
        pairs = []
        for qid, q in self._questions.items():
            cls = self._classifications.get(qid)
            if cls:
                pairs.append((q, cls))
        return pairs

    # ------------------------------------------------------------------
    # Semantic relationships
    # ------------------------------------------------------------------

    def add_relationship(self, rel: SemanticRelationship) -> None:
        self._relationships.append(rel)

    def all_relationships(self) -> list[SemanticRelationship]:
        return list(self._relationships)

    def relationships_for_question(self, question_id: str) -> list[SemanticRelationship]:
        return [
            r for r in self._relationships
            if r.question_id_a == question_id or r.question_id_b == question_id
        ]

    # ------------------------------------------------------------------
    # Historical stats
    # ------------------------------------------------------------------

    @staticmethod
    def _stats_key(
        board: str, class_level: str, subject: str,
        chapter: str, topic: str, concept: str,
    ) -> str:
        parts = [board, class_level, subject, chapter, topic, concept]
        return "::".join(p.lower().strip() for p in parts)

    def upsert_stats(self, stats: HistoricalStats) -> None:
        key = self._stats_key(
            stats.board, stats.class_level, stats.subject,
            stats.chapter, stats.topic, stats.concept,
        )
        self._stats[key] = stats

    def get_stats(
        self, board: str, class_level: str, subject: str,
        chapter: str, topic: str, concept: str,
    ) -> Optional[HistoricalStats]:
        key = self._stats_key(board, class_level, subject, chapter, topic, concept)
        return self._stats.get(key)

    def all_stats(self) -> list[HistoricalStats]:
        return list(self._stats.values())

    def stats_for_chapter(
        self,
        chapter: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[HistoricalStats]:
        results = [s for s in self._stats.values()
                   if s.chapter.lower() == chapter.lower()]
        if board:
            results = [s for s in results if s.board.upper() == board.upper()]
        if subject:
            results = [s for s in results if s.subject.lower() == subject.lower()]
        return results

    def stats_for_concept(
        self,
        concept: str,
        board: Optional[str] = None,
        class_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[HistoricalStats]:
        results = [s for s in self._stats.values()
                   if s.concept.lower() == concept.lower()]
        if board:
            results = [s for s in results if s.board.upper() == board.upper()]
        if class_level:
            results = [s for s in results if s.class_level == class_level]
        if subject:
            results = [s for s in results if s.subject.lower() == subject.lower()]
        return results

    def stats_for_topic(
        self,
        topic: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[HistoricalStats]:
        results = [s for s in self._stats.values()
                   if s.topic.lower() == topic.lower()]
        if board:
            results = [s for s in results if s.board.upper() == board.upper()]
        if subject:
            results = [s for s in results if s.subject.lower() == subject.lower()]
        return results

    # ------------------------------------------------------------------
    # Concept occurrence helpers (derived from questions + classifications)
    # ------------------------------------------------------------------

    def occurrences_for_concept(
        self,
        concept: str,
        board: Optional[str] = None,
        class_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ConceptOccurrence]:
        """
        Return all ConceptOccurrence records that match the given concept name
        (case-insensitive).
        """
        results: list[ConceptOccurrence] = []
        for qid, q in self._questions.items():
            cls = self._classifications.get(qid)
            if not cls:
                continue
            if cls.concept.value.lower() != concept.lower():
                continue
            if board and q.board.upper() != board.upper():
                continue
            if class_level and q.class_level != class_level:
                continue
            if subject and q.subject.lower() != subject.lower():
                continue
            results.append(self._build_occurrence(qid, q, cls))
        return results

    def occurrences_for_topic(
        self,
        topic: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ConceptOccurrence]:
        results: list[ConceptOccurrence] = []
        for qid, q in self._questions.items():
            cls = self._classifications.get(qid)
            if not cls:
                continue
            if cls.topic.value.lower() != topic.lower():
                continue
            if board and q.board.upper() != board.upper():
                continue
            if subject and q.subject.lower() != subject.lower():
                continue
            results.append(self._build_occurrence(qid, q, cls))
        return results

    @staticmethod
    def _build_occurrence(
        qid: str,
        q: ExtractedQuestion,
        cls: QuestionClassification,
    ) -> ConceptOccurrence:
        return ConceptOccurrence(
            year=q.year,
            board=q.board,
            class_level=q.class_level,
            subject=q.subject,
            chapter=cls.chapter.value,
            topic=cls.topic.value,
            concept=cls.concept.value,
            question_id=qid,
            question_number=q.question_number,
            sub_question_number=q.sub_question_number,
            page=q.page,
            marks=q.marks,
            question_type=q.question_type,
            text_snippet=q.text[:120],
        )

    # ------------------------------------------------------------------
    # Bulk embedding helper (returns id→text for embed calls)
    # ------------------------------------------------------------------

    def question_texts_for_embedding(self) -> dict[str, str]:
        """Return {question_id: question_text} for all stored questions."""
        return {qid: q.text for qid, q in self._questions.items()}

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def summary(self) -> dict[str, Any]:
        return {
            "papers": len(self._papers),
            "questions": len(self._questions),
            "classifications": len(self._classifications),
            "relationships": len(self._relationships),
            "stats_entries": len(self._stats),
        }
