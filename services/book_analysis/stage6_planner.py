"""
Stage 6 — MCQ Priority Planner.

For each concept, computes a priority score across 6 evidence dimensions:

1. curriculum_support    — how strongly the curriculum mandates this concept
2. textbook_support      — how extensively the book covers it
3. historical_evidence   — strength of past-paper evidence (EvidenceLabel)
4. pattern_evidence      — recurrence count and question-type variety
5. difficulty_coverage   — gaps in EASY/MEDIUM/HARD coverage in past papers
6. content_opportunity   — formula/diagram/numerical/graph potential

Priority score = weighted sum (all weights sum to 1.0).

Output: MCQPriorityPlan sorted highest priority first.

The plan NEVER guarantees exam appearance. It is a prioritized evidence map.
"""

from __future__ import annotations

import logging

from services.past_paper.schemas import EvidenceLabel
from services.book_analysis.schemas import (
    ExtractedChapterContent,
    ExtractedConcept,
    ConceptHistoricalEvidence,
    CurriculumMappingResult,
    MCQPriorityEntry,
    MCQPriorityPlan,
    ConceptType,
)

logger = logging.getLogger(__name__)

# Weights for each dimension (must sum to 1.0)
_WEIGHTS = {
    "curriculum_support":    0.25,
    "textbook_support":      0.15,
    "historical_evidence":   0.30,
    "pattern_evidence":      0.15,
    "difficulty_coverage":   0.10,
    "content_opportunity":   0.05,
}

# EvidenceLabel → score
_EVIDENCE_SCORES = {
    EvidenceLabel.HIGH_HISTORICAL_EVIDENCE:     1.0,
    EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE: 0.65,
    EvidenceLabel.LOW_HISTORICAL_EVIDENCE:      0.35,
    EvidenceLabel.NEW_CONCEPT:                  0.10,
    EvidenceLabel.INSUFFICIENT_DATA:            0.0,
}

# Difficulty categories for gap detection
_DIFFICULTY_LABELS = {"EASY", "MEDIUM", "HARD"}


class MCQPriorityPlanner:
    """
    Stage 6 of the Book Historical Analysis Engine.

    Produces an MCQPriorityPlan sorted highest priority first.
    """

    def plan_chapter(
        self,
        chapter: ExtractedChapterContent,
        curriculum_mappings: list[CurriculumMappingResult],
        historical_evidence: list[ConceptHistoricalEvidence],
        board: str,
        class_level: str,
        subject: str,
    ) -> MCQPriorityPlan:
        cm_by_concept = {m.concept: m for m in curriculum_mappings}
        ev_by_concept = {e.concept: e for e in historical_evidence}

        entries: list[MCQPriorityEntry] = []
        for concept in chapter.concepts:
            entry = self._score_concept(
                concept=concept,
                curriculum=cm_by_concept.get(concept.name),
                evidence=ev_by_concept.get(concept.name),
            )
            entries.append(entry)

        # Sort highest priority first
        entries.sort(key=lambda e: e.priority_score, reverse=True)

        plan = MCQPriorityPlan(
            board=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter.chapter_title,
            entries=entries,
        )
        logger.info(
            "Stage 6: Priority plan built for chapter '%s' — %d concepts, "
            "top concept: '%s' (score=%.2f)",
            chapter.chapter_title,
            len(entries),
            entries[0].concept if entries else "—",
            entries[0].priority_score if entries else 0.0,
        )
        return plan

    def _score_concept(
        self,
        concept: ExtractedConcept,
        curriculum: CurriculumMappingResult | None,
        evidence: ConceptHistoricalEvidence | None,
    ) -> MCQPriorityEntry:

        # 1. Curriculum support
        if curriculum is None or curriculum.match_type == "NOT_FOUND":
            cur_score = 0.0
        elif curriculum.match_type == "EXACT" and curriculum.is_compulsory:
            cur_score = 1.0
        elif curriculum.match_type == "EXACT":
            cur_score = 0.80
        elif curriculum.match_type == "RELATED":
            cur_score = 0.50
        else:
            cur_score = curriculum.confidence

        # 2. Textbook support — presence + content richness
        tb_score = min(1.0, 0.5 + (
            0.15 * int(concept.has_formula)
            + 0.15 * int(concept.has_diagram)
            + 0.10 * int(concept.has_graph)
            + 0.10 * int(concept.has_table)
        ))

        # 3. Historical evidence
        ev_label = evidence.evidence_label if evidence else EvidenceLabel.INSUFFICIENT_DATA
        hist_score = _EVIDENCE_SCORES[ev_label]

        # 4. Pattern evidence — recurrence + variety of question types
        if evidence:
            recurrence = evidence.recurrence_count
            type_variety = len(set(evidence.question_types))
            pattern_score = min(1.0, (recurrence / 6.0) * 0.6 + (type_variety / 4.0) * 0.4)
        else:
            pattern_score = 0.0

        # 5. Difficulty coverage gap
        # If past papers show only one difficulty level → high gap → high opportunity
        if evidence and evidence.past_paper_matches:
            diff_labels_seen = set()
            for m in evidence.past_paper_matches:
                # question_type can loosely proxy difficulty
                t = m.question_type.upper()
                if "EASY" in t:
                    diff_labels_seen.add("EASY")
                elif "HARD" in t or "ANALYTICAL" in t:
                    diff_labels_seen.add("HARD")
                else:
                    diff_labels_seen.add("MEDIUM")
            gap_score = 1.0 - (len(diff_labels_seen) / len(_DIFFICULTY_LABELS))
        else:
            gap_score = 0.5  # unknown → medium gap

        # 6. Content opportunity — formula/diagram/numerical potential
        opp_score = 0.0
        if concept.concept_type in (ConceptType.FORMULA, ConceptType.NUMERICAL, ConceptType.CHEMICAL_EQUATION):
            opp_score = 1.0
        elif concept.concept_type in (ConceptType.DIAGRAM, ConceptType.GRAPH):
            opp_score = 0.80
        elif concept.concept_type == ConceptType.TABLE:
            opp_score = 0.60
        else:
            opp_score = 0.30

        # Weighted sum
        priority = (
            _WEIGHTS["curriculum_support"]  * cur_score
            + _WEIGHTS["textbook_support"]  * tb_score
            + _WEIGHTS["historical_evidence"] * hist_score
            + _WEIGHTS["pattern_evidence"]  * pattern_score
            + _WEIGHTS["difficulty_coverage"] * gap_score
            + _WEIGHTS["content_opportunity"] * opp_score
        )
        priority = round(min(1.0, max(0.0, priority)), 4)

        summary_parts = []
        if curriculum and curriculum.match_type != "NOT_FOUND":
            summary_parts.append(f"Curriculum: {curriculum.match_type} ({cur_score:.0%})")
        summary_parts.append(f"Historical: {ev_label.value}")
        if evidence:
            summary_parts.append(f"Recurrence: {evidence.recurrence_count}x")

        return MCQPriorityEntry(
            concept=concept.name,
            chapter=concept.chapter,
            topic=concept.topic,
            concept_type=concept.concept_type,
            curriculum_support=round(cur_score, 4),
            textbook_support=round(tb_score, 4),
            historical_evidence=round(hist_score, 4),
            pattern_evidence=round(pattern_score, 4),
            difficulty_coverage_gap=round(gap_score, 4),
            content_opportunity=round(opp_score, 4),
            priority_score=priority,
            evidence_summary=" | ".join(summary_parts),
        )
