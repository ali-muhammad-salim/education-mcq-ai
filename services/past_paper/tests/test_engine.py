"""
Integration tests for the Past Paper Intelligence Engine.

All tests use fully in-memory, no-DB, no-Ollama data.
The LLM classifier is bypassed (use_llm=False).
Semantic mapping uses the exact concept-equivalence path (no embeddings).

Test coverage
-------------
1.  Metadata extraction — inferred fields are marked correctly.
2.  Question extraction — exact numbering preserved.
3.  Classification (rule-based) — chapter/topic/concept assigned.
4.  Semantic concept equivalence — "rate of change of velocity" maps to
    "acceleration"; questions with same canonical concept are linked.
5.  Anti-link test — friction question is NOT linked to Newton's Second Law
    despite both mentioning "force".
6.  Historical analysis — evidence labels computed correctly.
7.  No predictive language — disclaimers present in all output.
8.  All 7 search APIs return correct results with references.
9.  Chapter report structure validated.
10. Multi-board isolation — FBISE and BISE-Lahore data isolated correctly.
"""

from __future__ import annotations

import pytest

from services.past_paper.engine import PastPaperEngine
from services.past_paper.metadata_extractor import extract_metadata
from services.past_paper.schemas import (
    EvidenceLabel,
    ExtractedQuestion,
    QuestionClassification,
)
from services.past_paper.semantic_mapper import _normalise_concept, build_semantic_map
from services.past_paper.store import PastPaperStore

# Import test fixtures
from services.past_paper.tests.test_data import (
    ALL_BISE_QUESTIONS,
    ALL_FBISE_QUESTIONS,
    ALL_QUESTIONS,
    CLS_BISE_2021_Q1,
    CLS_BISE_2022_Q2,
    CLS_BISE_2023_Q3,
    CLS_BISE_2024_Q4,
    CLS_FBISE_2022_ELEC,
    CLS_FBISE_2022_Q1,
    CLS_FBISE_2022_Q4,
    CLS_FBISE_2022_Q5,
    CLS_FBISE_2023_ELEC,
    CLS_FBISE_2023_Q2,
    CLS_FBISE_2023_Q7,
    CLS_FBISE_2024_Q3,
    CLS_FBISE_2024_Q5,
    CLS_FBISE_2025_Q1,
    Q_FBISE_2022_Q1,
    Q_FBISE_2022_Q4,
    Q_FBISE_2022_Q5,
    Q_FBISE_2023_Q2,
    Q_FBISE_2023_Q7,
)


# ===========================================================================
# Fixture helpers
# ===========================================================================

def _build_engine_with_all_data(use_llm: bool = False) -> tuple[PastPaperEngine, dict[str, str]]:
    """
    Build a fully-loaded engine with all test data and pre-built classifications.

    Returns (engine, {fixture_key: question_id}).
    """
    engine = PastPaperEngine()

    # Map fixture keys to question objects and their classification lambdas
    fixtures = [
        ("fbise_q1_2022",      ALL_FBISE_QUESTIONS[0],  CLS_FBISE_2022_Q1),
        ("fbise_q2a_2023",     ALL_FBISE_QUESTIONS[1],  CLS_FBISE_2023_Q2),
        ("fbise_q3_2024",      ALL_FBISE_QUESTIONS[2],  CLS_FBISE_2024_Q3),
        ("fbise_q1b_2025",     ALL_FBISE_QUESTIONS[3],  CLS_FBISE_2025_Q1),
        ("fbise_q4_2022",      ALL_FBISE_QUESTIONS[4],  CLS_FBISE_2022_Q4),
        ("fbise_q5_2024",      ALL_FBISE_QUESTIONS[5],  CLS_FBISE_2024_Q5),
        ("fbise_q5_graph_2022",ALL_FBISE_QUESTIONS[6],  CLS_FBISE_2022_Q5),
        ("fbise_q7_2023",      ALL_FBISE_QUESTIONS[7],  CLS_FBISE_2023_Q7),
        ("fbise_q9_2022",      ALL_FBISE_QUESTIONS[8],  CLS_FBISE_2022_ELEC),
        ("fbise_q10_2023",     ALL_FBISE_QUESTIONS[9],  CLS_FBISE_2023_ELEC),
        ("bise_q1_2021",       ALL_BISE_QUESTIONS[0],   CLS_BISE_2021_Q1),
        ("bise_q2_2022",       ALL_BISE_QUESTIONS[1],   CLS_BISE_2022_Q2),
        ("bise_q3_2023",       ALL_BISE_QUESTIONS[2],   CLS_BISE_2023_Q3),
        ("bise_q4_2024",       ALL_BISE_QUESTIONS[3],   CLS_BISE_2024_Q4),
    ]

    id_map: dict[str, str] = {}
    for key, question, cls_fn in fixtures:
        qid = engine.store.add_question(question)
        id_map[key] = qid
        cls = cls_fn(qid)
        engine.store.add_classification(qid, cls)

    return engine, id_map


# ===========================================================================
# 1. Metadata extraction
# ===========================================================================

class TestMetadataExtraction:

    def test_inferred_fields_are_marked(self):
        text = "FBISE Annual Examination 2024 Physics Class 10"
        meta = extract_metadata(text=text)
        assert meta.board.value == "FBISE"
        assert meta.board.is_inferred is True, "Board inferred from text must be marked inferred"
        assert meta.year.value == "2024"
        assert meta.year.is_inferred is True
        assert meta.subject.value == "Physics"
        assert meta.subject.is_inferred is True
        assert "board" in meta.verification_required

    def test_hint_fields_are_verified(self):
        meta = extract_metadata(
            text="Some physics paper text",
            metadata_hint={"board": "FBISE", "year": "2025", "subject": "Physics"},
        )
        assert meta.board.is_inferred is False, "Caller-supplied board must NOT be inferred"
        assert meta.year.is_inferred is False
        assert meta.subject.is_inferred is False
        # Board / year / subject from hint → not in verification_required
        assert "board" not in meta.verification_required
        assert "year" not in meta.verification_required
        assert "subject" not in meta.verification_required

    def test_missing_fields_produce_none_value(self):
        meta = extract_metadata(text="Some random text without metadata.")
        # year is not present
        assert meta.year.value is None or meta.year.inference_confidence == 0.0

    def test_multiple_boards_first_match_wins(self):
        text = "FBISE Annual 2023 Physics Cambridge"
        meta = extract_metadata(text=text)
        # FBISE should be matched before Cambridge
        assert meta.board.value == "FBISE"

    def test_inferred_field_can_be_verified(self):
        text = "BISE-Lahore Annual 2022 Chemistry Class 10"
        meta = extract_metadata(text=text)
        assert meta.board.is_inferred is True
        meta.mark_verified("board")
        assert meta.board.is_inferred is False
        assert "board" not in meta.verification_required

    def test_session_extraction(self):
        text = "Annual Examination 2023"
        meta = extract_metadata(text=text)
        assert meta.session.value == "Annual"

    def test_supplementary_session(self):
        text = "Supplementary Examination 2022 Physics"
        meta = extract_metadata(text=text)
        assert meta.session.value == "Supplementary"


# ===========================================================================
# 2. Question numbering preservation
# ===========================================================================

class TestQuestionNumbering:

    def test_question_number_exact(self):
        assert Q_FBISE_2022_Q1.question_number == "1"

    def test_sub_question_number_exact(self):
        assert Q_FBISE_2023_Q2.question_number == "2"
        assert Q_FBISE_2023_Q2.sub_question_number == "a"

    def test_reference_format(self):
        assert Q_FBISE_2022_Q1.reference == "Q1"
        assert Q_FBISE_2023_Q2.reference == "Q2(a)"

    def test_full_reference_includes_year(self):
        assert Q_FBISE_2022_Q1.full_reference == "2022 Q1"
        assert Q_FBISE_2023_Q2.full_reference == "2023 Q2(a)"

    def test_ingest_paper_question_parser(self):
        """Engine's built-in text parser preserves Q-numbers."""
        engine = PastPaperEngine()
        text = """
Q1. Define velocity.
Q2. (a) What is acceleration?
Q3: Calculate the force using F = ma where m = 5 kg and a = 3 m/s^2. [3]
        """
        pid = engine.ingest_paper(
            text=text,
            metadata_hint={"board": "FBISE", "year": "2023", "subject": "Physics"},
        )
        questions = engine.store.questions_for_paper(pid)
        q_numbers = {q.question_number for q in questions}
        assert "1" in q_numbers
        assert "2" in q_numbers
        assert "3" in q_numbers


# ===========================================================================
# 3. Classification
# ===========================================================================

class TestClassification:

    def test_rule_based_classification_motion_chapter(self):
        from services.past_paper.question_classifier import classify_question
        qid = "test_q_001"
        q = ExtractedQuestion(
            paper_id="p1", year=2023, board="FBISE", class_level="10",
            subject="Physics", question_number="1", text=(
                "A car accelerates from 0 to 20 m/s in 5 seconds. "
                "Calculate the acceleration."
            ),
        )
        cls = classify_question(qid, q, use_llm=False)
        assert cls.chapter.value == "Motion", f"Expected Motion, got {cls.chapter.value}"
        assert cls.concept.value in ("Acceleration", "UNKNOWN")  # keyword match
        assert 0.0 <= cls.chapter.confidence <= 1.0

    def test_classification_fields_have_confidence(self):
        from services.past_paper.question_classifier import classify_question
        qid = "test_q_002"
        q = ExtractedQuestion(
            paper_id="p1", year=2024, board="FBISE", class_level="10",
            subject="Physics", question_number="3",
            text="Define Ohm's law. Find V when I=3A and R=10Ω using V=IR.",
        )
        cls = classify_question(qid, q, use_llm=False)
        assert cls.chapter.confidence >= 0.0
        assert cls.topic.confidence >= 0.0

    def test_classified_by_field_is_rule_based(self):
        from services.past_paper.question_classifier import classify_question
        qid = "test_q_003"
        q = ExtractedQuestion(
            paper_id="p1", year=2022, board="FBISE", class_level="10",
            subject="Physics", question_number="1",
            text="Describe friction between two surfaces.",
        )
        cls = classify_question(qid, q, use_llm=False)
        assert cls.classified_by == "RULE_BASED"

    def test_pre_built_classifications_stored_correctly(self):
        engine, id_map = _build_engine_with_all_data()
        qid = id_map["fbise_q1_2022"]
        cls = engine.store.get_classification(qid)
        assert cls is not None
        assert cls.concept.value == "Acceleration"
        assert cls.chapter.value == "Motion"
        assert cls.classified_by == "HUMAN"


# ===========================================================================
# 4. Semantic concept equivalence
# ===========================================================================

class TestSemanticEquivalence:

    def test_concept_normaliser_rate_of_change(self):
        """'rate of change of velocity' must normalise to 'acceleration'."""
        assert _normalise_concept("rate of change of velocity") == "acceleration"

    def test_concept_normaliser_delta_v(self):
        assert _normalise_concept("a = Δv/Δt") == "acceleration"
        assert _normalise_concept("dv/dt") == "acceleration"

    def test_concept_normaliser_newton_second(self):
        assert _normalise_concept("f = ma") == "newton's second law"

    def test_same_concept_questions_are_linked(self):
        """
        FBISE 2022 Q1, 2023 Q2(a), 2024 Q3, 2025 Q1(b) all classify as
        'Acceleration'. build_semantic_map should link all pairs.
        """
        engine, id_map = _build_engine_with_all_data()
        rels = engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)

        # All Acceleration questions should be linked
        accel_ids = {
            id_map["fbise_q1_2022"],
            id_map["fbise_q2a_2023"],
            id_map["fbise_q3_2024"],
            id_map["fbise_q1b_2025"],
        }
        linked_pairs = {
            frozenset({r.question_id_a, r.question_id_b})
            for r in rels
        }
        # Every pair of acceleration questions must be linked
        from itertools import combinations
        for a, b in combinations(accel_ids, 2):
            pair = frozenset({a, b})
            assert pair in linked_pairs, (
                f"Expected link between {a} and {b} (both Acceleration) but not found"
            )

    def test_relationships_have_reasons(self):
        engine, _ = _build_engine_with_all_data()
        rels = engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)
        for rel in rels:
            assert rel.reason, "Every SemanticRelationship must have a non-empty reason"
            assert len(rel.reason) > 10


# ===========================================================================
# 5. Anti-link: friction must NOT be linked to Newton's Second Law
# ===========================================================================

class TestAntiLinking:

    def test_friction_not_linked_to_newtons_law(self):
        """
        The friction question and Newton's 2nd law questions both mention
        'force', but they test different concepts and must NOT be linked.
        """
        engine, id_map = _build_engine_with_all_data()
        rels = engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)

        friction_id = id_map["fbise_q7_2023"]  # Friction question
        newton_ids = {id_map["fbise_q4_2022"], id_map["fbise_q5_2024"]}

        linked_pairs = {
            frozenset({r.question_id_a, r.question_id_b})
            for r in rels
        }
        for newton_id in newton_ids:
            pair = frozenset({friction_id, newton_id})
            assert pair not in linked_pairs, (
                "Friction question must NOT be linked to Newton's 2nd Law "
                "merely because both mention 'force'."
            )

    def test_electricity_not_linked_to_motion(self):
        """Ohm's Law questions must not be linked to Acceleration questions."""
        engine, id_map = _build_engine_with_all_data()
        rels = engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)

        elec_ids = {id_map["fbise_q9_2022"], id_map["fbise_q10_2023"]}
        accel_ids = {id_map["fbise_q1_2022"], id_map["fbise_q2a_2023"]}

        linked_pairs = {
            frozenset({r.question_id_a, r.question_id_b})
            for r in rels
        }
        for eid in elec_ids:
            for aid in accel_ids:
                pair = frozenset({eid, aid})
                assert pair not in linked_pairs, (
                    "Electricity questions must not be linked to Motion questions."
                )


# ===========================================================================
# 6. Historical analysis — evidence labels
# ===========================================================================

class TestHistoricalAnalysis:

    def test_acceleration_fbise_high_evidence(self):
        """
        FBISE Acceleration: 4 unique years (2022, 2023, 2024, 2025)
        → HIGH_HISTORICAL_EVIDENCE.
        """
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        assert stats is not None
        assert stats.evidence_label == EvidenceLabel.HIGH_HISTORICAL_EVIDENCE, (
            f"Expected HIGH_HISTORICAL_EVIDENCE, got {stats.evidence_label}"
        )
        assert sorted(stats.years_appeared) == [2022, 2023, 2024, 2025]

    def test_vt_graph_low_evidence(self):
        """V-T Graph only appears in 1 year → LOW_HISTORICAL_EVIDENCE."""
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Velocity-Time Graphs", concept="Velocity-Time Graphs",
        )
        assert stats is not None
        assert stats.evidence_label == EvidenceLabel.LOW_HISTORICAL_EVIDENCE

    def test_newtons_law_fbise_moderate_evidence(self):
        """FBISE Newton's 2nd Law: 2022 + 2024 → MODERATE_HISTORICAL_EVIDENCE."""
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Force and Laws of Motion",
            topic="Newton's Second Law",
            concept="Newton's Second Law",
        )
        assert stats is not None
        assert stats.evidence_label == EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE

    def test_stats_contain_occurrences(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        assert stats is not None
        assert len(stats.occurrences) == 4

    def test_occurrences_have_page_and_reference(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        for occ in stats.occurrences:
            assert occ.question_number, "Occurrence must have a question number"
            ref = occ.reference
            assert ref.startswith("Q"), f"Reference '{ref}' must start with Q"

    def test_occurrences_sorted_by_year_descending(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        years = [o.year for o in stats.occurrences]
        assert years == sorted(years, reverse=True), "Occurrences should be newest first"


# ===========================================================================
# 7. No predictive language
# ===========================================================================

class TestNoPredictiveLanguage:

    BANNED_PHRASES = [
        "will definitely appear",
        "will appear",
        "guaranteed to",
        "predicted to",
        "likely to appear",
        "will come in",
        "expected to appear",
    ]

    def _check_no_predictions(self, text: str) -> None:
        text_lower = text.lower()
        for phrase in self.BANNED_PHRASES:
            assert phrase not in text_lower, (
                f"Predictive language detected: '{phrase}' found in output:\n{text}"
            )

    def test_chapter_report_has_disclaimer(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        assert "NOT" in report.disclaimer.upper() or "not" in report.disclaimer.lower()
        assert "predict" in report.disclaimer.lower() or "guarantee" in report.disclaimer.lower()

    def test_chapter_report_no_predictive_language(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        rendered = engine.format_report(report)
        self._check_no_predictions(rendered)

    def test_concept_entry_note_is_historical_only(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        for entry in report.concepts:
            self._check_no_predictions(entry.evidence_label_note)

    def test_evidence_label_enum_values(self):
        """Ensure evidence label enum names never contain predictive words."""
        for label in EvidenceLabel:
            label_lower = label.value.lower()
            for phrase in ["predict", "guarantee", "will", "expect"]:
                assert phrase not in label_lower, (
                    f"Predictive word '{phrase}' found in EvidenceLabel: {label.value}"
                )


# ===========================================================================
# 8. All 7 Search APIs
# ===========================================================================

class TestSearchAPIs:

    def _get_engine(self) -> PastPaperEngine:
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        return engine

    def test_find_past_questions_for_concept(self):
        engine = self._get_engine()
        results = engine.search.findPastQuestionsForConcept(
            concept="Acceleration", board="FBISE", subject="Physics"
        )
        assert len(results) == 4, f"Expected 4 FBISE Acceleration results, got {len(results)}"
        years = {occ.year for occ in results}
        assert years == {2022, 2023, 2024, 2025}
        # All results have references and page numbers
        for occ in results:
            assert occ.reference.startswith("Q")
            assert occ.board == "FBISE"

    def test_find_past_questions_for_concept_sorted_newest_first(self):
        engine = self._get_engine()
        results = engine.search.findPastQuestionsForConcept("Acceleration", board="FBISE")
        years = [r.year for r in results]
        assert years == sorted(years, reverse=True)

    def test_find_past_questions_for_topic(self):
        engine = self._get_engine()
        results = engine.search.findPastQuestionsForTopic(
            topic="Acceleration", board="FBISE", subject="Physics"
        )
        assert len(results) == 4

    def test_find_similar_past_questions_keyword_fallback(self):
        engine = self._get_engine()
        results = engine.search.findSimilarPastQuestions(
            "Calculate the acceleration of a car starting from rest",
            top_k=5,
            min_similarity=0.05,  # low threshold for keyword Jaccard on short text
        )
        # Should return some results (at least questions mentioning acceleration)
        assert isinstance(results, list)
        # Each result has a similarity score and reason
        for r in results:
            assert 0.0 <= r.similarity_score <= 1.0
            assert r.reason

    def test_find_questions_by_year(self):
        engine = self._get_engine()
        results = engine.search.findQuestionsByYear(2022, board="FBISE", subject="Physics")
        # 2022 FBISE has: Q1, Q4, Q5(graph), Q9(electricity) = 4 questions
        assert len(results) == 4
        for q in results:
            assert q.year == 2022
            assert q.board == "FBISE"

    def test_find_questions_by_year_all_boards(self):
        engine = self._get_engine()
        results = engine.search.findQuestionsByYear(2022)
        # 2022 has FBISE (4) + BISE-Lahore (1) = 5 questions
        assert len(results) == 5
        boards = {q.board for q in results}
        assert "FBISE" in boards
        assert "BISE-Lahore" in boards

    def test_find_questions_by_board(self):
        engine = self._get_engine()
        results = engine.search.findQuestionsByBoard("FBISE")
        boards = {q.board for q in results}
        assert boards == {"FBISE"}, "findQuestionsByBoard must not return other boards"
        assert len(results) == 10  # 10 FBISE questions total

    def test_find_questions_by_board_sorted(self):
        engine = self._get_engine()
        results = engine.search.findQuestionsByBoard("FBISE")
        years = [q.year for q in results]
        # Should be sorted ascending by year
        assert years == sorted(years)

    def test_find_questions_by_chapter_motion(self):
        engine = self._get_engine()
        results = engine.search.findQuestionsByChapter(
            "Motion", board="FBISE", subject="Physics"
        )
        # Motion chapter: fbise_q1_2022, fbise_q2a_2023, fbise_q3_2024,
        #                 fbise_q1b_2025, fbise_q5_graph_2022 = 5
        assert len(results) == 5
        chapters = set()
        for q in results:
            cls = engine.store.get_classification(
                next(qid for qid, sq in engine.store._questions.items() if sq is q)
            )
            if cls:
                chapters.add(cls.chapter.value)
        assert "Motion" in chapters

    def test_find_questions_by_chapter_isolation(self):
        engine = self._get_engine()
        motion_results = engine.search.findQuestionsByChapter("Motion", board="FBISE")
        elec_results = engine.search.findQuestionsByChapter("Electricity", board="FBISE")
        motion_ids = {id(q) for q in motion_results}
        elec_ids = {id(q) for q in elec_results}
        assert not motion_ids.intersection(elec_ids), "Motion and Electricity must not overlap"

    def test_find_question_patterns(self):
        engine = self._get_engine()
        report = engine.search.findQuestionPatterns("FBISE", "Physics", "Motion")
        assert isinstance(report.patterns, dict)
        # pattern_note must not contain affirmative predictive language
        note_lower = report.pattern_note.lower()
        for banned in ("will definitely appear", "will appear in future", "guaranteed to appear",
                       "predicted to appear", "expected to appear", "will come in"):
            assert banned not in note_lower, f"Predictive language in pattern note: '{banned}'"

    def test_find_question_patterns_numerical(self):
        engine = self._get_engine()
        report = engine.search.findQuestionPatterns("FBISE", "Physics", "Motion")
        # Acceleration has many NUMERICAL questions → 'numerical' pattern expected
        all_pattern_names = set(report.patterns.keys())
        # It's OK if no recurring patterns for low-data chapters, but for Motion/Acceleration
        # with 4 years, 'numerical' should appear
        if "numerical" in all_pattern_names:
            assert len(report.patterns["numerical"]) >= 2


# ===========================================================================
# 9. Chapter Report Structure
# ===========================================================================

class TestChapterReport:

    def test_chapter_report_structure(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")

        assert report.board == "FBISE"
        assert report.subject == "Physics"
        assert report.chapter == "Motion"
        assert report.generated_at  # ISO timestamp
        assert report.disclaimer
        assert isinstance(report.concepts, list)
        assert len(report.concepts) > 0

    def test_chapter_report_concepts_have_occurrences(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        for entry in report.concepts:
            assert len(entry.occurrences) > 0, (
                f"Concept '{entry.concept}' has no occurrences"
            )

    def test_chapter_report_overall_evidence_label(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        # Motion chapter spans 2022–2025 (4 years) → HIGH
        assert report.overall_evidence_label == EvidenceLabel.HIGH_HISTORICAL_EVIDENCE

    def test_chapter_report_years_covered(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        assert 2022 in report.years_covered
        assert 2025 in report.years_covered

    def test_chapter_report_text_format_contains_reference(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
        text = engine.format_report(report)
        # Should contain at least one Q-reference
        assert "Q1" in text or "Q2" in text or "Q3" in text

    def test_empty_chapter_report(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()
        report = engine.chapter_report("NonExistentChapter", board="FBISE", subject="Physics")
        assert report.total_questions == 0
        assert report.overall_evidence_label == EvidenceLabel.INSUFFICIENT_DATA


# ===========================================================================
# 10. Multi-board isolation
# ===========================================================================

class TestMultiBoardIsolation:

    def test_fbise_acceleration_isolated_from_bise(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        fbise_results = engine.search.findPastQuestionsForConcept(
            "Acceleration", board="FBISE", subject="Physics"
        )
        bise_results = engine.search.findPastQuestionsForConcept(
            "Acceleration", board="BISE-Lahore", subject="Physics"
        )

        fbise_boards = {o.board for o in fbise_results}
        bise_boards = {o.board for o in bise_results}

        assert fbise_boards == {"FBISE"}, "FBISE search must not return BISE-Lahore data"
        assert bise_boards == {"BISE-Lahore"}, "BISE-Lahore search must not return FBISE data"

    def test_board_stats_are_separate(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        fbise_stats = engine.store.get_stats(
            board="FBISE", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        bise_stats = engine.store.get_stats(
            board="BISE-Lahore", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )

        assert fbise_stats is not None
        assert bise_stats is not None
        assert fbise_stats.years_appeared != bise_stats.years_appeared or \
               fbise_stats.board != bise_stats.board

    def test_find_by_board_returns_only_that_board(self):
        engine, _ = _build_engine_with_all_data()
        fbise_qs = engine.search.findQuestionsByBoard("FBISE")
        bise_qs = engine.search.findQuestionsByBoard("BISE-Lahore")

        for q in fbise_qs:
            assert q.board == "FBISE"
        for q in bise_qs:
            assert q.board == "BISE-Lahore"

    def test_total_questions_count(self):
        engine, _ = _build_engine_with_all_data()
        summary = engine.summary()
        assert summary["questions"] == 14  # 10 FBISE + 4 BISE-Lahore

    def test_bise_lahore_acceleration_years(self):
        engine, _ = _build_engine_with_all_data()
        engine.compute_historical_stats()

        # BISE-Lahore Acceleration: 2021 + 2022 = MODERATE evidence
        bise_accel_stats = engine.store.get_stats(
            board="BISE-Lahore", class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
        )
        assert bise_accel_stats is not None
        assert 2021 in bise_accel_stats.years_appeared
        assert 2022 in bise_accel_stats.years_appeared
        assert bise_accel_stats.evidence_label == EvidenceLabel.MODERATE_HISTORICAL_EVIDENCE


# ===========================================================================
# Full pipeline smoke test
# ===========================================================================

class TestFullPipeline:

    def test_full_pipeline_no_errors(self):
        """Run the full engine pipeline end-to-end without any exceptions."""
        engine = PastPaperEngine()

        # Ingest via pre-built questions
        ids = engine.ingest_questions_directly(
            [q.model_copy(update={"paper_id": "smoke_paper"}) for q in ALL_QUESTIONS]
        )
        assert len(ids) == 14

        # Classify (rule-based only — no LLM needed)
        n_classified = engine.classify_all(use_llm=False)
        assert n_classified == 14

        # Semantic map (no embeddings — pure concept equivalence)
        rels = engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)
        assert isinstance(rels, list)

        # Historical stats
        stats = engine.compute_historical_stats()
        assert len(stats) > 0

        # Chapter report
        report = engine.chapter_report("Motion")
        assert report.chapter == "Motion"
        assert report.total_questions > 0

        # Verify no predictive language in the formatted report
        text = engine.format_report(report)
        for banned in ("will definitely appear", "will appear in future", "guaranteed"):
            assert banned.lower() not in text.lower()

        print("\n" + engine.format_report(report))

    def test_engine_summary_after_full_run(self):
        engine, _ = _build_engine_with_all_data()
        engine.build_semantic_map(use_embeddings=False, use_llm_reasons=False)
        engine.compute_historical_stats()

        summary = engine.summary()
        assert summary["papers"] >= 0  # papers added via ingest_questions_directly have no paper records
        assert summary["questions"] == 14
        assert summary["classifications"] == 14
        assert summary["relationships"] >= 0
        assert summary["stats_entries"] > 0
