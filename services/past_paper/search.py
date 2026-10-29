"""
Past Paper Search API.

Provides seven typed search functions over the PastPaperStore.

All results include:
  - year
  - board
  - question reference (e.g. Q3(b))
  - page number (where available)

None of these functions make predictions about future examinations.
"""

from __future__ import annotations

import logging
import math
from typing import Optional, Any, Callable

from services.past_paper.schemas import (
    ConceptOccurrence,
    ExtractedQuestion,
    PatternReport,
    RelationshipType,
    SemanticRelationship,
    SimilarQuestion,
)
from services.past_paper.store import PastPaperStore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router factory (injected or auto-resolved) — used for similarity search
# ---------------------------------------------------------------------------

_router_factory: Optional[Callable[[], Any]] = None


def set_router_factory(factory: Callable[[], Any]) -> None:
    global _router_factory
    _router_factory = factory


def _get_router() -> Optional[Any]:
    if _router_factory is not None:
        return _router_factory()
    try:
        from services.inference.router import get_router
        return get_router()
    except Exception:
        return None


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# ===========================================================================
# The Search API
# ===========================================================================

class PastPaperSearch:
    """
    All search operations over a PastPaperStore.

    Instantiate once and reuse.  All methods are synchronous.
    """

    def __init__(self, store: PastPaperStore) -> None:
        self._store = store

    # ------------------------------------------------------------------
    # 1. Find past questions for a specific concept
    # ------------------------------------------------------------------

    def findPastQuestionsForConcept(
        self,
        concept: str,
        board: Optional[str] = None,
        class_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ConceptOccurrence]:
        """
        Return all past-paper questions classified under `concept`.

        Example result:
            2025 Q3(b)  page 4
            2024 Q7     page 7
            2022 Q4(a)  page 3

        Results are sorted by year descending.
        """
        results = self._store.occurrences_for_concept(
            concept=concept,
            board=board,
            class_level=class_level,
            subject=subject,
        )
        return sorted(results, key=lambda o: o.year, reverse=True)

    # ------------------------------------------------------------------
    # 2. Find past questions for a specific topic
    # ------------------------------------------------------------------

    def findPastQuestionsForTopic(
        self,
        topic: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ConceptOccurrence]:
        """
        Return all past-paper questions classified under `topic`.

        Results are sorted by year descending.
        """
        results = self._store.occurrences_for_topic(
            topic=topic,
            board=board,
            subject=subject,
        )
        return sorted(results, key=lambda o: o.year, reverse=True)

    # ------------------------------------------------------------------
    # 3. Find semantically similar past questions
    # ------------------------------------------------------------------

    def findSimilarPastQuestions(
        self,
        question_text: str,
        top_k: int = 5,
        min_similarity: float = 0.70,
    ) -> list[SimilarQuestion]:
        """
        Find the top-k past-paper questions most semantically similar to
        `question_text` using embeddings.

        Falls back to keyword overlap if embeddings are unavailable.

        Results are sorted by similarity descending.
        """
        router = _get_router()
        all_questions = self._store.all_questions()

        if not all_questions:
            return []

        # Try embedding-based similarity
        if router is not None:
            try:
                query_resp = router.embed(question_text)
                if query_resp.success and query_resp.embeddings:
                    query_vec = query_resp.embeddings[0]

                    corpus_texts = [q.text for q in all_questions]
                    corpus_resp = router.embed(corpus_texts)
                    if corpus_resp.success and len(corpus_resp.embeddings) == len(all_questions):
                        scored: list[tuple[float, ExtractedQuestion]] = []
                        for q, emb in zip(all_questions, corpus_resp.embeddings):
                            sim = _cosine(query_vec, emb)
                            if sim >= min_similarity:
                                scored.append((sim, q))

                        scored.sort(key=lambda x: x[0], reverse=True)
                        results = []
                        qids = {v: k for k, v in self._store.question_texts_for_embedding().items()}

                        for sim, q in scored[:top_k]:
                            # Retrieve the stored ID for this question
                            qid = None
                            for stored_id, stored_q in self._store._questions.items():
                                if stored_q is q:
                                    qid = stored_id
                                    break

                            # Check if there's an existing semantic relationship
                            rel_type = RelationshipType.RELATED_CONCEPT
                            reason = (
                                f"Embedding cosine similarity {sim:.3f} with the query text."
                            )
                            if qid:
                                rels = self._store.relationships_for_question(qid)
                                if rels:
                                    best_rel = max(rels, key=lambda r: r.confidence)
                                    rel_type = best_rel.relationship_type
                                    reason = best_rel.reason

                            results.append(SimilarQuestion(
                                question=q,
                                similarity_score=round(sim, 3),
                                relationship_type=rel_type,
                                reason=reason,
                            ))
                        return results
            except Exception as exc:
                logger.warning("Embedding similarity search failed: %s — falling back to keyword", exc)

        # Fallback: keyword overlap
        return self._keyword_similarity_search(question_text, top_k, min_similarity)

    def _keyword_similarity_search(
        self,
        query: str,
        top_k: int,
        min_similarity: float,
    ) -> list[SimilarQuestion]:
        """Simple keyword-overlap similarity (Jaccard on words)."""
        query_words = set(query.lower().split())
        scored = []
        for q in self._store.all_questions():
            doc_words = set(q.text.lower().split())
            if not query_words or not doc_words:
                continue
            intersection = len(query_words & doc_words)
            union = len(query_words | doc_words)
            sim = intersection / union if union > 0 else 0.0
            if sim >= min_similarity:
                scored.append((sim, q))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            SimilarQuestion(
                question=q,
                similarity_score=round(sim, 3),
                relationship_type=RelationshipType.RELATED_CONCEPT,
                reason=f"Keyword overlap similarity {sim:.3f}.",
            )
            for sim, q in scored[:top_k]
        ]

    # ------------------------------------------------------------------
    # 4. Find questions by year
    # ------------------------------------------------------------------

    def findQuestionsByYear(
        self,
        year: int,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ExtractedQuestion]:
        """
        Return all questions from a specific examination year.

        Results are sorted by question number.
        """
        results = self._store.questions_by_year(year, board=board, subject=subject)
        return sorted(results, key=lambda q: (q.question_number, q.sub_question_number))

    # ------------------------------------------------------------------
    # 5. Find questions by board
    # ------------------------------------------------------------------

    def findQuestionsByBoard(
        self,
        board: str,
        subject: Optional[str] = None,
    ) -> list[ExtractedQuestion]:
        """
        Return all questions from a specific board, sorted by year then question number.
        """
        results = self._store.questions_by_board(board)
        if subject:
            results = [q for q in results if q.subject.lower() == subject.lower()]
        return sorted(results, key=lambda q: (q.year, q.question_number, q.sub_question_number))

    # ------------------------------------------------------------------
    # 6. Find questions by chapter
    # ------------------------------------------------------------------

    def findQuestionsByChapter(
        self,
        chapter: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> list[ExtractedQuestion]:
        """
        Return all questions classified under a chapter.

        Results are sorted by year descending then question number.
        """
        results = self._store.questions_by_chapter(chapter, board=board, subject=subject)
        return sorted(results, key=lambda q: (-q.year, q.question_number, q.sub_question_number))

    # ------------------------------------------------------------------
    # 7. Find recurring patterns for a chapter
    # ------------------------------------------------------------------

    def findQuestionPatterns(
        self,
        board: str,
        subject: str,
        chapter: str,
    ) -> PatternReport:
        """
        Find recurring question patterns for a chapter across all years.

        Returns a PatternReport grouping occurrences by observed pattern.
        """
        stats_list = self._store.stats_for_chapter(chapter, board=board, subject=subject)

        pattern_groups: dict[str, list[ConceptOccurrence]] = {}
        for stats in stats_list:
            for pattern in stats.recurring_patterns:
                if pattern not in pattern_groups:
                    pattern_groups[pattern] = []
                pattern_groups[pattern].extend(stats.occurrences)

        # Sort occurrences within each pattern by year descending
        for pattern in pattern_groups:
            pattern_groups[pattern].sort(key=lambda o: o.year, reverse=True)

        return PatternReport(
            board=board,
            subject=subject,
            chapter=chapter,
            patterns=pattern_groups,
        )
