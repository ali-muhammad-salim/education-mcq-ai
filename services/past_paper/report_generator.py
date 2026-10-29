"""
Chapter Report Generator.

Builds a structured ChapterReport from the HistoricalStats and
ConceptOccurrence data in the store.

IMPORTANT: All reports contain historical evidence ONLY.
They do NOT predict, guarantee, or suggest what will appear
in any future examination.
"""

from __future__ import annotations

import datetime
import logging
from typing import Optional

from services.past_paper.schemas import (
    ChapterReport,
    ConceptHistoryEntry,
    EvidenceLabel,
)
from services.past_paper.store import PastPaperStore

logger = logging.getLogger(__name__)


def generate_chapter_report(
    store: PastPaperStore,
    chapter: str,
    board: Optional[str] = None,
    class_level: Optional[str] = None,
    subject: Optional[str] = None,
) -> ChapterReport:
    """
    Generate a ChapterReport for the given chapter.

    Parameters
    ----------
    store:
        The PastPaperStore containing computed historical stats.
    chapter:
        Chapter name (case-insensitive match).
    board, class_level, subject:
        Optional filters.

    Returns
    -------
    ChapterReport with all concept entries, evidence labels, and occurrences.
    """
    stats_list = store.stats_for_chapter(chapter, board=board, subject=subject)

    if not stats_list:
        logger.warning(
            "No historical stats found for chapter '%s' (board=%s, subject=%s).",
            chapter, board, subject,
        )
        return ChapterReport(
            board=board or "ALL",
            class_level=class_level or "ALL",
            subject=subject or "ALL",
            chapter=chapter,
            generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            concepts=[],
            total_questions=0,
            years_covered=[],
            overall_evidence_label=EvidenceLabel.INSUFFICIENT_DATA,
        )

    # Sort by concept name for stable output
    stats_list.sort(key=lambda s: (s.topic, s.concept))

    concept_entries: list[ConceptHistoryEntry] = []
    all_years: set[int] = set()
    total_questions = 0

    for stats in stats_list:
        all_years.update(stats.years_appeared)
        total_questions += stats.number_of_questions

        # Evidence label note — never use predictive language
        note = (
            f"This concept appeared in {len(stats.years_appeared)} unique "
            f"examination year(s): {sorted(stats.years_appeared)}. "
            "This is historical data only — it does NOT predict future content."
        )

        concept_entries.append(ConceptHistoryEntry(
            concept=stats.concept,
            topic=stats.topic,
            occurrences=sorted(stats.occurrences, key=lambda o: o.year, reverse=True),
            recurring_patterns=stats.recurring_patterns,
            evidence_label=stats.evidence_label,
            evidence_label_note=note,
        ))

    # Overall chapter evidence — based on total unique years
    years_list = sorted(all_years)
    n_years = len(years_list)
    if n_years >= 4:
        overall_label = EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
    elif n_years >= 2:
        overall_label = EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE
    elif n_years == 1:
        overall_label = EvidenceLabel.LOW_HISTORICAL_EVIDENCE
    else:
        overall_label = EvidenceLabel.INSUFFICIENT_DATA

    # Resolve board/class_level/subject from the data if not provided
    actual_board = board or (stats_list[0].board if stats_list else "ALL")
    actual_class = class_level or (stats_list[0].class_level if stats_list else "ALL")
    actual_subject = subject or (stats_list[0].subject if stats_list else "ALL")

    return ChapterReport(
        board=actual_board,
        class_level=actual_class,
        subject=actual_subject,
        chapter=chapter,
        generated_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        concepts=concept_entries,
        total_questions=total_questions,
        years_covered=years_list,
        overall_evidence_label=overall_label,
    )


def format_chapter_report(report: ChapterReport) -> str:
    """
    Return a human-readable text rendering of a ChapterReport.

    Suitable for logging, printing to console, or including in a test output.
    """
    lines: list[str] = []
    sep = "=" * 70
    lines.append(sep)
    lines.append(f"CHAPTER REPORT — {report.chapter.upper()}")
    lines.append(f"Board: {report.board}  |  Class: {report.class_level}  |  Subject: {report.subject}")
    lines.append(f"Generated: {report.generated_at}")
    lines.append(f"Overall Evidence: {report.overall_evidence_label.value}")
    lines.append(f"Years Covered: {report.years_covered}")
    lines.append(f"Total Questions Indexed: {report.total_questions}")
    lines.append(report.disclaimer)
    lines.append(sep)

    for entry in report.concepts:
        lines.append(f"\n  CONCEPT: {entry.concept}")
        lines.append(f"  Topic:   {entry.topic}")
        lines.append(f"  Evidence Label: {entry.evidence_label.value}")
        if entry.recurring_patterns:
            lines.append(f"  Observed Patterns: {', '.join(entry.recurring_patterns)}")
        lines.append(f"  Evidence Note: {entry.evidence_label_note}")
        lines.append("  Past Appearances:")
        for occ in entry.occurrences:
            page_str = f"  p.{occ.page}" if occ.page else ""
            marks_str = f"  [{occ.marks} mark(s)]" if occ.marks else ""
            snippet = f'  "{occ.text_snippet[:60]}..."' if occ.text_snippet else ""
            lines.append(
                f"    {occ.year}  {occ.board}  {occ.reference}{page_str}{marks_str}{snippet}"
            )
        lines.append("")

    lines.append(sep)
    return "\n".join(lines)
