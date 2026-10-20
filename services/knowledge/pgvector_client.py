"""
pgvector Client — semantic nearest-neighbour retrieval via PostgreSQL pgvector.

Design principles
-----------------
* Embedding dimension is NOT hard-coded. It is read from the environment
  variable EMBEDDING_DIM (default 768 to match the canonical knowledge namespace).
  If your Ollama model produces 768-dim vectors, set EMBEDDING_DIM=768
  and run a DB migration to change vector(1536) → vector(768).

* Backend operations use an async interface.

* If the DB is unavailable, every method degrades gracefully:
  - store() fails explicitly.
  - search() returns an empty list.

* The client is intentionally thin — it does NOT embed text itself.
  Callers must provide the embedding vector from their model of choice.

* In tests, instantiate PgVectorClient with a mock backend by setting
  `_backend` to a MockBackend instance.
"""

from __future__ import annotations

import logging
import math
import os
from dataclasses import dataclass
from typing import Optional, Protocol

logger = logging.getLogger(__name__)

# The embedding dimension — read from environment, default 768
EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "768"))


@dataclass
class VectorSearchResult:
    """A single result from a pgvector nearest-neighbour search."""
    source_type: str       # e.g. "PAST_PAPER", "TEXTBOOK", "CURRICULUM"
    source_id: str         # UUID of the originating record
    similarity: float      # cosine similarity [0.0, 1.0]
    text_snippet: str = ""
    board: str = ""
    class_level: str = ""
    subject: str = ""


class VectorBackend(Protocol):
    """
    Protocol for the underlying vector store backend.

    The real backend uses asyncpg to talk to PostgreSQL + pgvector.
    Tests inject a MockVectorBackend that returns pre-canned results.
    """

    async def upsert(
        self,
        source_type: str,
        source_id: str,
        embedding: list[float],
        embedding_model: str,
    ) -> None:
        """Store or update a vector embedding."""
        ...

    async def search(
        self,
        query_embedding: list[float],
        top_k: int,
        source_types: Optional[list[str]],
        min_similarity: float,
    ) -> list[VectorSearchResult]:
        """Return the top_k most similar records."""
        ...


class MockVectorBackend:
    """
    In-memory mock backend for tests.

    Stores embeddings and performs exact cosine similarity search.
    No DB required.
    """

    def __init__(self, scope: Optional[dict] = None) -> None:
        self._scope = scope or {}
        self._store: list[tuple[str, str, list[float]]] = []  # (source_type, source_id, vec)

    async def upsert(
        self,
        source_type: str,
        source_id: str,
        embedding: list[float],
        embedding_model: str,
    ) -> None:
        # Remove existing entry for this source_id
        self._store = [
            (st, sid, vec)
            for st, sid, vec in self._store
            if sid != source_id
        ]
        self._store.append((source_type, source_id, embedding))

    async def search(
        self,
        query_embedding: list[float],
        top_k: int,
        source_types: Optional[list[str]],
        min_similarity: float,
    ) -> list[VectorSearchResult]:
        import math

        def cosine(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            mag_a = math.sqrt(sum(x * x for x in a))
            mag_b = math.sqrt(sum(y * y for y in b))
            if mag_a == 0 or mag_b == 0:
                return 0.0
            return dot / (mag_a * mag_b)

        results: list[VectorSearchResult] = []
        for source_type, source_id, vec in self._store:
            if source_types and source_type not in source_types:
                continue
            sim = cosine(query_embedding, vec)
            if sim >= min_similarity:
                results.append(VectorSearchResult(
                    source_type=source_type,
                    source_id=source_id,
                    similarity=sim,
                    **self._scope,
                ))

        results.sort(key=lambda r: -r.similarity)
        return results[:top_k]


class PgVectorClient:
    """
    Thin async client for pgvector nearest-neighbour retrieval.

    Production indexing and scoped PostgreSQL search live in
    services/knowledge/search.ts. This Python planner adapter requires an
    explicitly injected backend; construction alone never establishes a DB
    connection.

    Usage (in tests)
    ----------------
    mock = MockVectorBackend(scope)
    client = PgVectorClient(backend=mock)
    """

    def __init__(self, backend: Optional[VectorBackend] = None) -> None:
        if backend is not None:
            self._backend = backend
            self._available = True
        else:
            self._backend = None
            self._available = False
            logger.info(
                "PgVectorClient: no backend provided; semantic search will return empty results. "
                "Pass a MockVectorBackend for tests, or connect to the DB for production."
            )

    async def store(
        self,
        source_type: str,
        source_id: str,
        embedding: list[float],
        embedding_model: str = "unknown",
    ) -> None:
        """
        Store or update a vector embedding.

        Storage failure is explicit: callers must not claim indexing succeeded.
        """
        if not self._available or self._backend is None:
            raise RuntimeError("Vector backend unavailable; production indexing uses services/knowledge/search.ts")

        if len(embedding) != EMBEDDING_DIM or any(not math.isfinite(v) for v in embedding) or not any(embedding):
            logger.warning(
                "PgVectorClient.store: embedding dimension mismatch. "
                "Expected %d, got %d for %s/%s.",
                EMBEDDING_DIM, len(embedding), source_type, source_id,
            )
            raise ValueError("Embedding dimension does not match its namespace")

        try:
            await self._backend.upsert(source_type, source_id, embedding, embedding_model)
        except Exception as exc:
            logger.error(
                "PgVectorClient.store: failed to store embedding for '%s/%s': %s",
                source_type, source_id, type(exc).__name__,
            )
            raise

    async def search(
        self,
        query_embedding: list[float],
        top_k: int = 10,
        source_types: Optional[list[str]] = None,
        min_similarity: float = 0.7,
    ) -> list[VectorSearchResult]:
        """
        Return the top_k most similar records to the query embedding.

        Degrades gracefully to an empty list if the backend is unavailable.
        """
        if not self._available or self._backend is None:
            return []

        try:
            return await self._backend.search(
                query_embedding=query_embedding,
                top_k=top_k,
                source_types=source_types,
                min_similarity=min_similarity,
            )
        except Exception as exc:
            logger.error("PgVectorClient.search: search failed: %s", exc)
            return []

    def is_available(self) -> bool:
        return self._available

    @classmethod
    def with_mock(cls, scope: Optional[dict] = None) -> tuple["PgVectorClient", MockVectorBackend]:
        """Factory for tests: returns (client, mock_backend)."""
        mock = MockVectorBackend(scope)
        return cls(backend=mock), mock

    @classmethod
    def unavailable(cls) -> "PgVectorClient":
        """Factory for tests that don't need semantic search."""
        return cls(backend=None)
