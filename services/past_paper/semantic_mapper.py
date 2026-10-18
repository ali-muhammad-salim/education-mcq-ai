"""
Semantic Concept Mapper.

Groups classified questions by concept and finds meaningful semantic
relationships between them using:

  1. Exact concept name match (same canonical concept after normalisation).
  2. Embedding cosine similarity (if router is available) — only when
     similarity exceeds a configurable threshold.
  3. LLM confirmation — only when the similarity passes the threshold is an
     LLM asked to articulate a human-readable reason.

Key safety rules
----------------
* A relationship is ONLY created when BOTH the similarity threshold is
  exceeded AND a non-trivial reason can be articulated.
* Questions that merely sound similar but test different concepts are NOT
  linked — the concept classifications serve as a guard.
* Every SemanticRelationship carries a mandatory `reason` field so callers
  can always see why the link was made.
"""

from __future__ import annotations

import logging
import math
from typing import Any, Callable, Optional

from services.past_paper.schemas import (
    ExtractedQuestion,
    QuestionClassification,
    RelationshipType,
    SemanticRelationship,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router factory (injected or auto-resolved)
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _normalise_concept(name: str) -> str:
    """
    Canonicalise concept names for exact-match grouping.

    Known semantic equivalences are explicitly mapped here.
    This list must grow through deliberate human curation, NOT automatically.
    """
    name = name.lower().strip()
    _KNOWN_EQUIVALENCES: dict[str, str] = {
        # Motion
        "rate of change of velocity": "acceleration",
        "change in velocity per unit time": "acceleration",
        "δv/δt": "acceleration",
        "dv/dt": "acceleration",
        "a = δv/δt": "acceleration",
        # Force
        "net force equals mass times acceleration": "newton's second law",
        "f = ma": "newton's second law",
        "force = mass × acceleration": "newton's second law",
        # Energy
        "½mv²": "kinetic energy",
        "mgh": "gravitational potential energy",
        "ep = mgh": "gravitational potential energy",
        "ek = ½mv²": "kinetic energy",
    }
    return _KNOWN_EQUIVALENCES.get(name, name)


# ---------------------------------------------------------------------------
# Embedding-based similarity check
# ---------------------------------------------------------------------------

def _get_embeddings(
    texts: list[str],
    router: Any,
) -> Optional[list[list[float]]]:
    """Return embeddings from the router, or None on failure."""
    try:
        resp = router.embed(texts)
        if resp.success and resp.embeddings:
            return resp.embeddings
    except Exception as exc:
        logger.warning("Embedding call failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# LLM reason articulation
# ---------------------------------------------------------------------------

_REASON_PROMPT = """\
Two past-paper questions have been flagged as potentially semantically related.

Question A: "{text_a}"
Question B: "{text_b}"

Classified concept A: {concept_a}
Classified concept B: {concept_b}

Are these questions testing the same underlying concept or a closely related one?
If YES, write ONE concise sentence explaining the specific relationship (e.g., same formula, same concept under different wording).
If NO, write: NOT_RELATED

Respond with ONLY the sentence or NOT_RELATED.
"""


def _articulate_reason(
    q_a: ExtractedQuestion,
    cls_a: QuestionClassification,
    q_b: ExtractedQuestion,
    cls_b: QuestionClassification,
    router: Any,
) -> Optional[str]:
    """Ask the LLM to articulate the reason for a potential link."""
    prompt = _REASON_PROMPT.format(
        text_a=q_a.text[:300],
        text_b=q_b.text[:300],
        concept_a=cls_a.concept.value,
        concept_b=cls_b.concept.value,
    )
    try:
        resp = router.generate(
            prompt=prompt,
            system="You are a curriculum expert. Be precise and concise.",
            temperature=0.0,
            max_tokens=80,
        )
        if resp.success and resp.text:
            reason = resp.text.strip()
            if reason.upper().startswith("NOT_RELATED"):
                return None
            return reason
    except Exception as exc:
        logger.warning("Reason articulation failed: %s", exc)
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_semantic_map(
    questions: list[tuple[str, ExtractedQuestion, QuestionClassification]],
    similarity_threshold: float = 0.82,
    use_embeddings: bool = True,
    use_llm_reasons: bool = True,
) -> list[SemanticRelationship]:
    """
    Find semantic relationships between classified questions.

    Parameters
    ----------
    questions:
        List of (question_id, ExtractedQuestion, QuestionClassification).
    similarity_threshold:
        Minimum cosine similarity to even consider a relationship.
        Default 0.82 — deliberately strict to avoid false positives.
    use_embeddings:
        Use router.embed() for similarity. Falls back to exact concept match only.
    use_llm_reasons:
        Use the LLM to articulate reasons. If False, uses a template reason.

    Returns
    -------
    List of SemanticRelationship objects with explicit reasons.
    """
    relationships: list[SemanticRelationship] = []
    n = len(questions)
    if n < 2:
        return relationships

    # --- Step 1: Group by normalised concept (exact-match relationships) ---
    concept_groups: dict[str, list[tuple[str, ExtractedQuestion, QuestionClassification]]] = {}
    for qid, q, cls in questions:
        norm = _normalise_concept(cls.concept.value)
        concept_groups.setdefault(norm, []).append((qid, q, cls))

    for concept_name, group in concept_groups.items():
        if len(group) < 2:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                qid_a, q_a, cls_a = group[i]
                qid_b, q_b, cls_b = group[j]

                # Same concept name — always a relationship
                reason = (
                    f"Both questions test the concept '{concept_name}', "
                    f"identified via semantic equivalence mapping."
                )
                relationships.append(SemanticRelationship(
                    question_id_a=qid_a,
                    question_id_b=qid_b,
                    relationship_type=RelationshipType.SEMANTICALLY_EQUIVALENT
                    if cls_a.concept.value.lower() != cls_b.concept.value.lower()
                    else RelationshipType.SAME_CONCEPT,
                    confidence=min(cls_a.concept.confidence, cls_b.concept.confidence),
                    reason=reason,
                    similarity_score=1.0,
                ))

    # --- Step 2: Embedding similarity across different concepts ---
    if use_embeddings:
        router = _get_router()
        if router is not None:
            texts = [q.text for _, q, _ in questions]
            ids = [qid for qid, _, _ in questions]
            clss = [cls for _, _, cls in questions]
            qs = [q for _, q, _ in questions]

            embeddings = _get_embeddings(texts, router)

            if embeddings and len(embeddings) == n:
                already_linked = {
                    (r.question_id_a, r.question_id_b) for r in relationships
                }
                for i in range(n):
                    for j in range(i + 1, n):
                        pair = (ids[i], ids[j])
                        if pair in already_linked:
                            continue

                        sim = _cosine(embeddings[i], embeddings[j])
                        if sim < similarity_threshold:
                            continue

                        # Threshold passed — now verify the concepts are actually related
                        concept_i = _normalise_concept(clss[i].concept.value)
                        concept_j = _normalise_concept(clss[j].concept.value)

                        # If concepts are completely different chapters, skip
                        chapter_i = clss[i].chapter.value.lower()
                        chapter_j = clss[j].chapter.value.lower()
                        if chapter_i != chapter_j and chapter_i != "unknown" and chapter_j != "unknown":
                            logger.debug(
                                "High similarity (%.2f) between Q%s and Q%s but different chapters (%s vs %s) — skipping",
                                sim, ids[i], ids[j], chapter_i, chapter_j,
                            )
                            continue

                        # Articulate a reason
                        reason: Optional[str]
                        if use_llm_reasons:
                            reason = _articulate_reason(qs[i], clss[i], qs[j], clss[j], router)
                        else:
                            reason = (
                                f"Embedding cosine similarity {sim:.3f} ≥ threshold {similarity_threshold}. "
                                f"Concepts: '{concept_i}' and '{concept_j}'."
                            )

                        if reason is None:
                            # LLM confirmed these are NOT related
                            logger.debug(
                                "LLM rejected link between Q%s (%s) and Q%s (%s)",
                                ids[i], concept_i, ids[j], concept_j,
                            )
                            continue

                        relationships.append(SemanticRelationship(
                            question_id_a=ids[i],
                            question_id_b=ids[j],
                            relationship_type=RelationshipType.RELATED_CONCEPT,
                            confidence=round(sim, 3),
                            reason=reason,
                            similarity_score=round(sim, 3),
                        ))

    logger.info("Semantic mapper built %d relationships from %d questions.", len(relationships), n)
    return relationships
