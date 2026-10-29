"""
Historical Analyser.

Computes HistoricalStats for every (board, class, subject, chapter, topic,
concept) group present in the store.

Evidence Labels
---------------
  ≥ 4 unique years  → HIGH_HISTORICAL_EVIDENCE
  2–3 unique years  → MODERATE_HISTORICAL_EVIDENCE
  1 year            → LOW_HISTORICAL_EVIDENCE
  In curriculum but no past-paper appearances → NEW_CONCEPT
  No data at all    → INSUFFICIENT_DATA

IMPORTANT: These labels describe HISTORICAL DATA ONLY.
They do NOT predict future examinations.
"""

from __future__ import annotations

import datetime
import logging
from collections import defaultdict
from typing import Optional

from services.past_paper.schemas import (
    ConceptOccurrence,
    EvidenceLabel,
    ExtractedQuestion,
    HistoricalStats,
    QuestionClassification,
)
from services.past_paper.store import PastPaperStore

logger = logging.getLogger(__name__)

# Current reference year for "years since last appearance"
_CURRENT_YEAR: int = datetime.datetime.now().year


def _assign_evidence_label(unique_years: list[int]) -> EvidenceLabel:
    """
    Assign an EvidenceLabel based on the number of unique examination years.

    This is a purely historical metric.
    """
    n = len(unique_years)
    if n >= 4:
        return EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
    if n >= 2:
        return EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE
    if n == 1:
        return EvidenceLabel.LOW_HISTORICAL_EVIDENCE
    return EvidenceLabel.INSUFFICIENT_DATA


def _detect_patterns(
    occurrences: list[ConceptOccurrence],
) -> list[str]:
    """
    Detect recurring question patterns for a concept.

    Patterns are observed — they are NOT predictions.
    """
    type_counts: dict[str, int] = defaultdict(int)
    for occ in occurrences:
        qt = occ.question_type.upper() if occ.question_type else "UNKNOWN"
        type_counts[qt] += 1

    patterns = []

    # Pattern names based on observed question types across years
    if type_counts.get("NUMERICAL", 0) >= 2:
        patterns.append("numerical")
    if type_counts.get("DEFINITION", 0) >= 2 or type_counts.get("SHORT", 0) >= 2:
        patterns.append("definition")
    if type_counts.get("MCQ", 0) >= 2:
        patterns.append("mcq")

    # Check for equation/graph/diagram flags
    has_equation = any(
        "equation" in (occ.question_type or "").lower() or
        "formula" in occ.text_snippet.lower()
        for occ in occurrences
    )
    has_graph = any("graph" in occ.text_snippet.lower() for occ in occurrences)
    has_diagram = any("diagram" in occ.text_snippet.lower() for occ in occurrences)

    if has_equation:
        patterns.append("equation")
    if has_graph:
        patterns.append("graph")
    if has_diagram:
        patterns.append("diagram")

    # Multi-year pattern — same type appeared in multiple years
    year_types: dict[int, set[str]] = defaultdict(set)
    for occ in occurrences:
        year_types[occ.year].add(occ.question_type or "UNKNOWN")

    if len(year_types) >= 3:
        # Find types that appear in multiple years
        all_types = set().union(*year_types.values())
        for qt in all_types:
            years_with_type = [y for y, types in year_types.items() if qt in types]
            if len(years_with_type) >= 3 and qt not in patterns:
                patterns.append(f"recurring_{qt.lower()}")

    return sorted(set(patterns))


def compute_historical_stats(store: PastPaperStore) -> list[HistoricalStats]:
    """
    Compute HistoricalStats for every classified concept group in the store.

    Updates the store with computed stats and returns the full list.
    """
    # Collect all (question, classification) pairs
    pairs = store.classified_questions()

    if not pairs:
        logger.info("No classified questions in store — nothing to analyse.")
        return []

    # Group occurrences by (board, class_level, subject, chapter, topic, concept)
    GroupKey = tuple[str, str, str, str, str, str]
    groups: dict[GroupKey, list[tuple[ExtractedQuestion, QuestionClassification]]] = defaultdict(list)

    for q, cls in pairs:
        key: GroupKey = (
            q.board,
            q.class_level,
            q.subject,
            cls.chapter.value,
            cls.topic.value,
            cls.concept.value,
        )
        groups[key].append((q, cls))

    stats_list: list[HistoricalStats] = []

    for (board, class_level, subject, chapter, topic, concept), group in groups.items():
        years = sorted({q.year for q, _ in group})
        num_questions = len(group)

        # Marks distribution
        marks_dist: dict[str, int] = defaultdict(int)
        for q, _ in group:
            mark_key = str(int(q.marks)) if q.marks is not None else "unknown"
            marks_dist[mark_key] += 1

        # Question type distribution
        type_dist: dict[str, int] = defaultdict(int)
        for q, cls in group:
            qt = cls.question_type.value if cls.question_type.value != "UNKNOWN" else q.question_type
            type_dist[qt] += 1

        # Difficulty distribution
        diff_dist: dict[str, int] = defaultdict(int)
        for _, cls in group:
            diff_dist[cls.difficulty.value] += 1

        # Nature frequencies
        numerical_freq = sum(1 for _, cls in group
                             if cls.numerical_or_conceptual.value == "NUMERICAL")
        diagram_freq = sum(1 for _, cls in group if cls.diagram_based)
        graph_freq = sum(1 for _, cls in group if cls.graph_based)
        equation_freq = sum(1 for _, cls in group if cls.equation_based)

        last_year = max(years) if years else None
        years_since = (_CURRENT_YEAR - last_year) if last_year else None

        # Build occurrences list
        occurrences: list[ConceptOccurrence] = [
            PastPaperStore._build_occurrence(
                # We don't have the ID here directly; reconstruct from store
                # Use a placeholder — the store lookup method handles this properly
                f"{q.paper_id}_{q.question_number}_{q.sub_question_number}",
                q, cls,
            )
            for q, cls in group
        ]
        # Sort occurrences by year descending
        occurrences.sort(key=lambda o: o.year, reverse=True)

        patterns = _detect_patterns(occurrences)
        evidence_label = _assign_evidence_label(years)

        stats = HistoricalStats(
            board=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=topic,
            concept=concept,
            years_appeared=years,
            number_of_questions=num_questions,
            number_of_appearances=num_questions,
            question_type_distribution=dict(type_dist),
            marks_distribution=dict(marks_dist),
            difficulty_distribution=dict(diff_dist),
            numerical_frequency=numerical_freq,
            diagram_frequency=diagram_freq,
            graph_frequency=graph_freq,
            equation_frequency=equation_freq,
            last_appeared_year=last_year,
            years_since_last_appearance=years_since,
            recurring_patterns=patterns,
            evidence_label=evidence_label,
            occurrences=occurrences,
        )

        store.upsert_stats(stats)
        stats_list.append(stats)

        logger.debug(
            "Stats: %s / %s / %s | years=%s | label=%s",
            board, chapter, concept, years, evidence_label.value,
        )

    logger.info("Historical analyser computed stats for %d concept groups.", len(stats_list))
    return stats_list


def get_evidence_label(
    store: PastPaperStore,
    board: str,
    class_level: str,
    subject: str,
    chapter: str,
    topic: str,
    concept: str,
) -> EvidenceLabel:
    """
    Return the evidence label for a specific concept without recomputing all stats.
    Returns INSUFFICIENT_DATA if not found.
    """
    stats = store.get_stats(board, class_level, subject, chapter, topic, concept)
    if stats is None:
        return EvidenceLabel.INSUFFICIENT_DATA
    return stats.evidence_label
