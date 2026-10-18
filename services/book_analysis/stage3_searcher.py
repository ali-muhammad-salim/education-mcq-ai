"""
Stage 3 — Historical Searcher.

For each ExtractedConcept, searches all available verified past papers and
classifies each match with a granular RelationshipType.

Search strategy (in priority order):
1. findPastQuestionsForConcept  — exact concept match
2. findPastQuestionsForTopic    — topic-level fallback
3. findQuestionPatterns         — recurring pattern detection
4. findSimilarPastQuestions     — semantic embedding fallback

Relationship types are NEVER collapsed into a generic "similar" label.
"""

from __future__ import annotations

import logging

from services.past_paper.search import PastPaperSearch
from services.past_paper.store import PastPaperStore
from services.past_paper.schemas import RelationshipType as PPRelType
from services.book_analysis.schemas import (
    ExtractedChapterContent,
    ExtractedConcept,
    ConceptHistoricalEvidence,
    ConceptType,
    PastPaperMatch,
)
from services.past_paper.schemas import EvidenceLabel

logger = logging.getLogger(__name__)

# Similarity thresholds
_SEMANTIC_MIN_SIM = 0.55
_SEMANTIC_TOP_K = 8


class HistoricalSearcher:
    """
    Stage 3 of the Book Historical Analysis Engine.

    Produces ConceptHistoricalEvidence for every concept in each chapter.
    """

    def __init__(self, store: PastPaperStore) -> None:
        self._store = store
        self._search = PastPaperSearch(store)

    def search_chapter(
        self,
        chapter: ExtractedChapterContent,
        board: str,
        class_level: str,
        subject: str,
    ) -> list[ConceptHistoricalEvidence]:
        results: list[ConceptHistoricalEvidence] = []
        for concept in chapter.concepts:
            evidence = self.search_concept(
                concept=concept,
                board=board,
                class_level=class_level,
                subject=subject,
            )
            results.append(evidence)

        total_matches = sum(len(e.past_paper_matches) for e in results)
        logger.info(
            "Stage 3: Found %d total past-paper matches across %d concepts in chapter '%s'",
            total_matches, len(results), chapter.chapter_title,
        )
        return results

    def search_concept(
        self,
        concept: ExtractedConcept,
        board: str,
        class_level: str,
        subject: str,
    ) -> ConceptHistoricalEvidence:
        matches: list[PastPaperMatch] = []
        seen_ids: set[str] = set()

        # ---- 1. Exact concept match ----
        occurrences = self._search.findPastQuestionsForConcept(
            concept=concept.name,
            board=board,
            class_level=class_level,
            subject=subject,
        )
        for occ in occurrences:
            rel = self._concept_relation_type(concept)
            matches.append(PastPaperMatch(
                year=occ.year,
                board=occ.board,
                question_number=occ.question_number,
                sub_question_number=occ.sub_question_number,
                question_type=occ.question_type,
                marks=occ.marks,
                relation_type=rel,
                page=occ.page,
                text_snippet=occ.text_snippet,
            ))
            seen_ids.add(occ.question_id)

        # ---- 2. Topic-level fallback ----
        if concept.topic:
            topic_occurrences = self._search.findPastQuestionsForTopic(
                topic=concept.topic,
                board=board,
                subject=subject,
            )
            for occ in topic_occurrences:
                if occ.question_id in seen_ids:
                    continue
                matches.append(PastPaperMatch(
                    year=occ.year,
                    board=occ.board,
                    question_number=occ.question_number,
                    sub_question_number=occ.sub_question_number,
                    question_type=occ.question_type,
                    marks=occ.marks,
                    relation_type=PPRelType.RELATED_CONCEPT.value,
                    page=occ.page,
                    text_snippet=occ.text_snippet,
                ))
                seen_ids.add(occ.question_id)

        # ---- 3. Semantic fallback ----
        if len(matches) < 3 and concept.text_snippet:
            similar = self._search.findSimilarPastQuestions(
                question_text=concept.text_snippet,
                top_k=_SEMANTIC_TOP_K,
                min_similarity=_SEMANTIC_MIN_SIM,
            )
            for sim in similar:
                qid = self._qid_for(sim.question)
                if qid and qid in seen_ids:
                    continue
                rel = self._similarity_relation_type(concept, sim.relationship_type.value)
                matches.append(PastPaperMatch(
                    year=sim.question.year,
                    board=sim.question.board,
                    question_number=sim.question.question_number,
                    sub_question_number=sim.question.sub_question_number or "",
                    question_type=sim.question.question_type,
                    marks=sim.question.marks,
                    relation_type=rel,
                    page=sim.question.page,
                    text_snippet=sim.question.text[:200],
                ))
                if qid:
                    seen_ids.add(qid)

        # ---- 4. Pattern analysis ----
        pattern_report = self._search.findQuestionPatterns(
            board=board, subject=subject, chapter=concept.chapter
        )
        patterns = list(pattern_report.patterns.keys())

        # ---- Aggregate ----
        matches.sort(key=lambda m: m.year, reverse=True)
        years = sorted({m.year for m in matches}, reverse=True)
        q_numbers = [f"Q{m.question_number}{'(' + m.sub_question_number + ')' if m.sub_question_number else ''}"
                     for m in matches]
        q_types = list({m.question_type for m in matches})
        marks_seen = [m.marks for m in matches if m.marks is not None]

        evidence_label = self._compute_label(len(matches))
        new_concept_note = ""
        if evidence_label == EvidenceLabel.NEW_CONCEPT:
            new_concept_note = "NEW CONCEPT — NO DIRECT HISTORICAL EVIDENCE"

        # Find related historical concepts if this is a new concept
        related_historical: list[str] = []
        if evidence_label == EvidenceLabel.NEW_CONCEPT:
            # Topic-level occurrences may reveal related concepts
            topic_occs = self._search.findPastQuestionsForTopic(
                topic=concept.topic, board=board, subject=subject
            )
            for occ in topic_occs:
                cls = self._store.get_classification(occ.question_id)
                if cls and cls.concept.value != concept.name:
                    related_historical.append(cls.concept.value)
            related_historical = list(dict.fromkeys(related_historical))[:5]

        return ConceptHistoricalEvidence(
            concept=concept.name,
            chapter=concept.chapter,
            topic=concept.topic,
            past_paper_matches=matches,
            years_appeared=years,
            question_numbers=q_numbers,
            question_types=q_types,
            marks_seen=marks_seen,
            patterns=patterns,
            recurrence_count=len(matches),
            evidence_label=evidence_label,
            related_historical_concepts=related_historical,
            new_concept_note=new_concept_note,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _concept_relation_type(self, concept: ExtractedConcept) -> str:
        """Map ConceptType to the most specific RelationshipType."""
        mapping = {
            ConceptType.FORMULA: PPRelType.SAME_FORMULA.value,
            ConceptType.GRAPH: "SAME_GRAPH_PATTERN",
            ConceptType.DIAGRAM: PPRelType.SAME_DIAGRAM_PATTERN.value,
            ConceptType.NUMERICAL: PPRelType.SAME_NUMERICAL_METHOD.value,
            ConceptType.CHEMICAL_EQUATION: PPRelType.SAME_FORMULA.value,
        }
        return mapping.get(concept.concept_type, PPRelType.SAME_CONCEPT.value)

    @staticmethod
    def _similarity_relation_type(concept: ExtractedConcept, default_rel: str) -> str:
        """Refine semantic match relation type based on concept type."""
        if concept.concept_type == ConceptType.FORMULA:
            return PPRelType.SAME_FORMULA.value
        if concept.concept_type in (ConceptType.DIAGRAM, ConceptType.GRAPH):
            return PPRelType.SAME_DIAGRAM_PATTERN.value
        if concept.concept_type == ConceptType.NUMERICAL:
            return PPRelType.SAME_NUMERICAL_METHOD.value
        return "SEMANTICALLY_SIMILAR"

    def _qid_for(self, question) -> str | None:
        for qid, q in self._store._questions.items():
            if q is question:
                return qid
        return None

    @staticmethod
    def _compute_label(match_count: int) -> EvidenceLabel:
        if match_count >= 4:
            return EvidenceLabel.HIGH_HISTORICAL_EVIDENCE
        if match_count >= 2:
            return EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE
        if match_count >= 1:
            return EvidenceLabel.LOW_HISTORICAL_EVIDENCE
        return EvidenceLabel.NEW_CONCEPT
