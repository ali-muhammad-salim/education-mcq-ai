"""
Stage 4 — Evidence Comparator.

Produces the per-concept evidence table:

CONCEPT | HISTORICAL YEARS | Q NUMBERS | Q TYPES | MARKS | PATTERNS | RECURRENCE | EVIDENCE STRENGTH

Flags NEW_CONCEPT with the mandatory message:
"NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE"

For new concepts with related historical concepts: shows them separately.
"""

from __future__ import annotations

import logging

from services.past_paper.schemas import EvidenceLabel
from services.book_analysis.schemas import (
    ConceptHistoricalEvidence,
    ExtractedConcept,
    ConceptType,
)

logger = logging.getLogger(__name__)


class ConceptEvidenceRow:
    """One row in the evidence comparison table."""

    def __init__(self, evidence: ConceptHistoricalEvidence) -> None:
        self.concept = evidence.concept
        self.historical_years = evidence.years_appeared
        self.question_numbers = evidence.question_numbers
        self.question_types = evidence.question_types
        self.marks = evidence.marks_seen
        self.patterns = evidence.patterns
        self.recurrence = evidence.recurrence_count
        self.evidence_strength = evidence.evidence_label
        self.new_concept_note = evidence.new_concept_note
        self.related_historical_concepts = evidence.related_historical_concepts
        self.disclaimer = evidence.disclaimer

    def as_dict(self) -> dict:
        row = {
            "concept": self.concept,
            "historical_years": self.historical_years,
            "question_numbers": self.question_numbers,
            "question_types": self.question_types,
            "marks": self.marks,
            "patterns": self.patterns,
            "recurrence": self.recurrence,
            "evidence_strength": self.evidence_strength.value,
            "disclaimer": self.disclaimer,
        }
        if self.new_concept_note:
            row["new_concept_note"] = self.new_concept_note
        if self.related_historical_concepts:
            row["related_historical_concepts"] = self.related_historical_concepts
        return row


class EvidenceComparator:
    """
    Stage 4 of the Book Historical Analysis Engine.

    Produces ConceptEvidenceRow table and separates:
    - Concepts with strong historical evidence
    - New concepts (no historical evidence)
    - Concepts where related historical concepts exist

    IMPORTANT: Labels are historical observations only.
    """

    def compare(
        self,
        concepts: list[ExtractedConcept],
        evidence_list: list[ConceptHistoricalEvidence],
    ) -> tuple[list[ConceptEvidenceRow], list[ExtractedConcept]]:
        """
        Returns (evidence_table, new_concepts).

        new_concepts: ExtractedConcept objects with NEW_CONCEPT label.
        The evidence_table row for a new concept carries new_concept_note.
        """
        evidence_by_concept = {e.concept: e for e in evidence_list}
        table: list[ConceptEvidenceRow] = []
        new_concepts: list[ExtractedConcept] = []

        for concept in concepts:
            ev = evidence_by_concept.get(concept.name)
            if ev is None:
                # No search was run for this concept — treat as new
                ev = ConceptHistoricalEvidence(
                    concept=concept.name,
                    chapter=concept.chapter,
                    topic=concept.topic,
                    evidence_label=EvidenceLabel.NEW_CONCEPT,
                    new_concept_note="NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE",
                )
            row = ConceptEvidenceRow(ev)
            table.append(row)

            if ev.evidence_label == EvidenceLabel.NEW_CONCEPT:
                new_concepts.append(concept)
                logger.info(
                    "Stage 4: NEW CONCEPT detected — '%s' (chapter: '%s'). "
                    "No direct historical evidence found.",
                    concept.name, concept.chapter,
                )

        logger.info(
            "Stage 4: Evidence table built — %d concepts total, %d new, %d with HIGH evidence",
            len(table),
            len(new_concepts),
            sum(
                1 for r in table
                if r.evidence_strength == EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
            ),
        )
        return table, new_concepts

    def summary_for_chapter(
        self, table: list[ConceptEvidenceRow]
    ) -> dict:
        """Produce a human-readable summary dict for the chapter report."""
        total = len(table)
        high = sum(1 for r in table
                   if r.evidence_strength == EvidenceLabel.HIGH_HISTORICAL_EVIDENCE)
        moderate = sum(1 for r in table
                       if r.evidence_strength == EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE)
        low = sum(1 for r in table
                  if r.evidence_strength == EvidenceLabel.LOW_HISTORICAL_EVIDENCE)
        new = sum(1 for r in table
                  if r.evidence_strength == EvidenceLabel.NEW_CONCEPT)
        insufficient = total - high - moderate - low - new

        return {
            "total_concepts": total,
            "high_evidence": high,
            "moderate_evidence": moderate,
            "low_evidence": low,
            "new_concepts": new,
            "insufficient_data": insufficient,
            "disclaimer": (
                "These labels describe HISTORICAL DATA ONLY. "
                "They are NOT predictions about future examinations."
            ),
        }
