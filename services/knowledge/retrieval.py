"""
Hybrid Retrieval Engine — the primary public API for the knowledge layer.

Three retrieval strategies are combined and ranked by source priority:

  1. Metadata Filter  — exact match on curriculum hierarchy
     (board / class / subject / chapter / topic / concept)

  2. Keyword Search   — broad recall via token overlap (Jaccard similarity)
     applied to past-paper question text and textbook snippets.

  3. Semantic Search  — pgvector cosine nearest-neighbour on pre-stored
     embeddings. Requires a connected PgVectorClient.

Results are always ranked by SourcePriority (human-verified > AI).
Within the same priority tier, similarity score breaks ties.

AI-generated content is excluded unless `include_ai_generated=True` is
explicitly passed by the caller.

Public entry points
-------------------
    results = await retrieve(...)          # async
    results = retrieve_sync(...)           # sync wrapper

Each result is a RetrievalResult with full EvidenceSource provenance.
"""

from __future__ import annotations

import asyncio
import inspect
from services.knowledge.scope import matches_scope
import logging
import re
from typing import Optional

from services.knowledge.concept_graph import ConceptGraph, ConceptNode
from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.pgvector_client import PgVectorClient, VectorSearchResult
from services.knowledge.schemas import (
    CurriculumVersionNote,
    EvidenceSource,
    RetrievalResult,
    SourcePriority,
)
from services.knowledge.textbook_mapper import TextbookMapper

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Token helpers for keyword retrieval
# ---------------------------------------------------------------------------

def _tokenise(text: str) -> set[str]:
    """Lower-cased word tokens, excluding very short tokens."""
    return {t for t in re.split(r"\W+", text.lower()) if len(t) > 2}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ---------------------------------------------------------------------------
# KnowledgeRetriever — stateful retriever holding all stores
# ---------------------------------------------------------------------------

class KnowledgeRetriever:
    """
    Stateful retriever that holds references to all in-memory stores.

    Construct once at application startup and reuse across requests.

    Parameters
    ----------
    curriculum_store : CurriculumStore
    textbook_mapper : TextbookMapper
    pgvector_client : PgVectorClient
        Pass PgVectorClient.unavailable() or PgVectorClient.with_mock()[0]
        for offline/test usage.
    past_paper_questions : list[dict]
        Flat list of past-paper question dicts with keys:
        id, board, year, subject, chapter, topic, concept, text, question_number, page.
    approved_questions : list[dict]
        Flat list of approved teacher/reviewer question dicts.
    ai_questions : list[dict]
        Flat list of AI-generated question dicts.
    embed_fn : callable | None
        A function (text: str) → list[float] for semantic retrieval.
        If None, semantic retrieval is skipped.
    """

    def __init__(
        self,
        curriculum_store: CurriculumStore,
        textbook_mapper: TextbookMapper,
        pgvector_client: PgVectorClient,
        past_paper_questions: Optional[list[dict]] = None,
        approved_questions: Optional[list[dict]] = None,
        ai_questions: Optional[list[dict]] = None,
        embed_fn: Optional[callable] = None,  # type: ignore[type-arg]
    ) -> None:
        self._curriculum = curriculum_store
        self._textbooks = textbook_mapper
        self._pgvector = pgvector_client
        self._past_papers: list[dict] = past_paper_questions or []
        self._approved: list[dict] = approved_questions or []
        self._ai: list[dict] = ai_questions or []
        self._embed_fn = embed_fn

    # ------------------------------------------------------------------
    # Main retrieval method
    # ------------------------------------------------------------------

    async def retrieve(
        self,
        query: str,
        board: str,
        class_level: str,
        subject: str,
        concept: Optional[str] = None,
        chapter: Optional[str] = None,
        topic: Optional[str] = None,
        top_k: int = 10,
        include_ai_generated: bool = False,
        min_keyword_similarity: float = 0.05,
        min_semantic_similarity: float = 0.70,
    ) -> list[RetrievalResult]:
        """
        Hybrid retrieval: metadata → keyword → semantic, merged by priority.

        Returns up to `top_k` RetrievalResult objects.
        AI content excluded unless include_ai_generated=True.
        """
        results: list[RetrievalResult] = []

        # --- Strategy 1: Metadata (concept graph traversal) ---
        concept_graph = ConceptGraph(
            curriculum_store=self._curriculum,
            textbook_mapper=self._textbooks,
            past_paper_questions=self._past_papers,
            approved_questions=self._approved,
            ai_questions=self._ai if include_ai_generated else [],
            include_ai=include_ai_generated,
        )

        nodes = concept_graph.gather(
            board=board,
            class_level=class_level,
            subject=subject,
            concept=concept,
            chapter=chapter,
            topic=topic,
        )

        for node in nodes:
            sources = node.all_sources
            if not include_ai_generated:
                sources = [s for s in sources if s.priority != SourcePriority.AI_GENERATED]
            if not sources:
                continue

            text = next((s.text_snippet for s in sources if s.text_snippet), f"{node.chapter} / {node.topic} / {node.concept}")
            relevance = _jaccard(_tokenise(query), _tokenise(text + ' ' + node.concept + ' ' + node.topic))
            if not any((concept, chapter, topic)) and relevance < min_keyword_similarity:
                continue
            results.append(RetrievalResult(
                query=query,
                board=board,
                class_level=class_level,
                subject=subject,
                chapter=node.chapter,
                concept=node.concept,
                text=text,
                text_source=_build_source_label(sources[0]),
                sources=sources,
                top_priority=sources[0].priority,
                similarity_score=relevance,
                retrieval_strategy="metadata",
                curriculum_version_note=node.curriculum_version_note,
            ))

        # --- Strategy 2: Keyword search over past-paper text ---
        query_tokens = _tokenise(query)
        seen_ids: set[str] = {s.source_id for r in results for s in r.sources}

        for ppq in self._past_papers:
            if ppq.get("verified") is not True:
                continue
            ppq_id = ppq.get("id", "")
            if ppq_id in seen_ids:
                continue
            ppq_board = ppq.get("board", "")
            if not matches_scope(ppq, board, class_level, subject):
                continue
            ppq_text = ppq.get("text", "")
            sim = _jaccard(query_tokens, _tokenise(ppq_text))
            if sim < min_keyword_similarity:
                continue

            source = EvidenceSource(
                source_type="PAST_PAPER",
                source_id=ppq_id,
                priority=SourcePriority.VERIFIED_PAST_PAPER,
                board=board,
                year=ppq.get("year"),
                page=ppq.get("page"),
                question_number=ppq.get("question_number"),
                chapter=ppq.get("chapter"),
                topic=ppq.get("topic"),
                concept=ppq.get("concept"),
                relationship="KEYWORD_MATCH",
                confidence=sim,
                text_snippet=ppq_text[:200],
            )
            results.append(RetrievalResult(
                query=query,
                board=board,
                class_level=class_level,
                subject=subject,
                chapter=ppq.get("chapter"),
                concept=ppq.get("concept"),
                text=ppq_text,
                text_source=f"Past Paper {ppq.get('year', '')} {ppq.get('question_number', '')}",
                sources=[source],
                top_priority=SourcePriority.VERIFIED_PAST_PAPER,
                retrieval_strategy="keyword",
                similarity_score=sim,
            ))
            seen_ids.add(ppq_id)

        # Keyword over textbooks
        for mapping in self._textbooks.all_mappings():
            if mapping.id in seen_ids:
                continue
            if (not matches_scope(mapping.model_dump(), board, class_level, subject)
                    or (not include_ai_generated and not mapping.is_human_verified)):
                continue
            sim = _jaccard(query_tokens, _tokenise(mapping.text_snippet))
            if sim < min_keyword_similarity:
                continue

            source = EvidenceSource(
                source_type="TEXTBOOK",
                source_id=mapping.id,
                priority=mapping.effective_priority,
                board=board,
                chapter=mapping.chapter,
                topic=mapping.topic,
                concept=mapping.concept,
                page=mapping.page_start,
                relationship="KEYWORD_MATCH",
                confidence=sim,
                text_snippet=mapping.text_snippet[:200],
            )
            results.append(RetrievalResult(
                query=query,
                board=board,
                class_level=class_level,
                subject=subject,
                chapter=mapping.chapter,
                concept=mapping.concept,
                text=mapping.text_snippet,
                text_source=f"{mapping.book_title} ch.{mapping.chapter_number or mapping.chapter_title}",
                sources=[source],
                top_priority=mapping.effective_priority,
                retrieval_strategy="keyword",
                similarity_score=sim,
            ))
            seen_ids.add(mapping.id)

        # --- Strategy 3: Semantic vector search ---
        if self._pgvector.is_available() and self._embed_fn is not None:
            try:
                query_vec = self._embed_fn(query)
                if inspect.isawaitable(query_vec):
                    query_vec = await query_vec
                source_type_filter = (
                    ["CURRICULUM", "TEXTBOOK", "PAST_PAPER", "APPROVED_QUESTION"]
                    if not include_ai_generated
                    else None
                )
                vector_hits = await self._pgvector.search(
                    query_embedding=query_vec,
                    top_k=top_k,
                    source_types=source_type_filter,
                    min_similarity=min_semantic_similarity,
                )
                for hit in vector_hits:
                    if not matches_scope(vars(hit), board, class_level, subject):
                        continue
                    if hit.source_id in seen_ids:
                        continue
                    # Resolve priority from source_type
                    priority = _source_type_to_priority(hit.source_type)
                    if not include_ai_generated and priority == SourcePriority.AI_GENERATED:
                        continue
                    source = EvidenceSource(
                        source_type=hit.source_type,
                        source_id=hit.source_id,
                        priority=priority,
                        board=board,
                        relationship="SEMANTICALLY_SIMILAR",
                        confidence=hit.similarity,
                        text_snippet=hit.text_snippet,
                    )
                    results.append(RetrievalResult(
                        query=query,
                        board=board,
                        class_level=class_level,
                        subject=subject,
                        text=hit.text_snippet,
                        text_source=f"{hit.source_type} (semantic)",
                        sources=[source],
                        top_priority=priority,
                        retrieval_strategy="semantic",
                        similarity_score=hit.similarity,
                    ))
                    seen_ids.add(hit.source_id)
            except Exception as exc:
                logger.warning("KnowledgeRetriever: semantic search failed: %s", exc)

        # --- Merge and rank ---
        # Primary sort: source priority (1 = best).
        # Secondary sort: similarity_score descending (higher = better).
        results.sort(
            key=lambda r: (r.top_priority.value, -(r.similarity_score or 0.0))
        )
        return results[:top_k]


# ---------------------------------------------------------------------------
# Module-level convenience functions
# ---------------------------------------------------------------------------

# Module-level singleton (None until initialised)
_default_retriever: Optional[KnowledgeRetriever] = None


def init_retriever(
    curriculum_store: CurriculumStore,
    textbook_mapper: TextbookMapper,
    pgvector_client: PgVectorClient,
    past_paper_questions: Optional[list[dict]] = None,
    approved_questions: Optional[list[dict]] = None,
    ai_questions: Optional[list[dict]] = None,
    embed_fn: Optional[callable] = None,  # type: ignore[type-arg]
) -> KnowledgeRetriever:
    """
    Initialise and cache the module-level retriever.

    Call this once at application startup. Subsequent calls to `retrieve()`
    and `retrieve_sync()` will use this instance.
    """
    global _default_retriever
    _default_retriever = KnowledgeRetriever(
        curriculum_store=curriculum_store,
        textbook_mapper=textbook_mapper,
        pgvector_client=pgvector_client,
        past_paper_questions=past_paper_questions,
        approved_questions=approved_questions,
        ai_questions=ai_questions,
        embed_fn=embed_fn,
    )
    return _default_retriever


async def retrieve(
    query: str,
    board: str,
    class_level: str,
    subject: str,
    concept: Optional[str] = None,
    chapter: Optional[str] = None,
    topic: Optional[str] = None,
    top_k: int = 10,
    include_ai_generated: bool = False,
    retriever: Optional[KnowledgeRetriever] = None,
) -> list[RetrievalResult]:
    """
    Async hybrid retrieval.

    Uses the module-level retriever unless `retriever` is passed explicitly.
    """
    r = retriever or _default_retriever
    if r is None:
        raise RuntimeError(
            "KnowledgeRetriever not initialised. Call init_retriever() first."
        )
    return await r.retrieve(
        query=query,
        board=board,
        class_level=class_level,
        subject=subject,
        concept=concept,
        chapter=chapter,
        topic=topic,
        top_k=top_k,
        include_ai_generated=include_ai_generated,
    )


def retrieve_sync(
    query: str,
    board: str,
    class_level: str,
    subject: str,
    concept: Optional[str] = None,
    chapter: Optional[str] = None,
    topic: Optional[str] = None,
    top_k: int = 10,
    include_ai_generated: bool = False,
    retriever: Optional[KnowledgeRetriever] = None,
) -> list[RetrievalResult]:
    """
    Synchronous wrapper around retrieve().

    Suitable for non-async callers (e.g. Django views, CLI scripts).
    Uses asyncio.run() — do NOT call from inside a running event loop.
    """
    return asyncio.run(
        retrieve(
            query=query,
            board=board,
            class_level=class_level,
            subject=subject,
            concept=concept,
            chapter=chapter,
            topic=topic,
            top_k=top_k,
            include_ai_generated=include_ai_generated,
            retriever=retriever,
        )
    )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _build_node_text(node: ConceptNode) -> str:
    """Build a representative text string from the most authoritative source."""
    all_sources = node.all_sources
    for src in all_sources:
        if src.text_snippet:
            return src.text_snippet
    return f"{node.chapter} / {node.topic} / {node.concept}"


def _build_source_label(source: EvidenceSource) -> str:
    parts = [source.source_type]
    if source.board:
        parts.append(source.board)
    if source.year:
        parts.append(str(source.year))
    if source.question_number:
        parts.append(source.question_number)
    return " | ".join(parts)


def _source_type_to_priority(source_type: str) -> SourcePriority:
    return {
        "CURRICULUM":        SourcePriority.VERIFIED_CURRICULUM,
        "TEXTBOOK":          SourcePriority.VERIFIED_TEXTBOOK,
        "PAST_PAPER":        SourcePriority.VERIFIED_PAST_PAPER,
        "APPROVED_QUESTION": SourcePriority.APPROVED_TEACHER_CONTENT,
        "TEACHER_CREATED":   SourcePriority.APPROVED_TEACHER_CONTENT,
        "AI_GENERATED":      SourcePriority.AI_GENERATED,
    }.get(source_type.upper(), SourcePriority.AI_GENERATED)
