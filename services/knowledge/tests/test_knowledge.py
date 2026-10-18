"""
Integration tests for the Multi-Board Educational Knowledge Layer.

All tests run fully offline — no DB, no Ollama, no network.

Test groups
-----------
1.  Board registry — data-driven, YAML loading, terminology resolution.
2.  Board isolation — FBISE queries never return BISE-Lahore data.
3.  Curriculum versioning — active version resolution, cross-version mixing detection.
4.  Textbook mapper — add, verify, reject, priority promotion.
5.  Textbook priority — unverified mapping = AI_GENERATED priority.
6.  Concept graph — priority ordering, source tiers, AI exclusion by default.
7.  Source priority ordering — curriculum > textbook > past paper > approved > AI.
8.  Metadata retrieval — exact concept graph traversal.
9.  Keyword retrieval — Jaccard overlap from past-paper text.
10. Semantic retrieval — MockVectorBackend cosine similarity.
11. Hybrid merge — all three strategies merged and deduped.
12. AI exclusion — AI results absent unless include_ai_generated=True.
13. RetrievalResult provenance — all EvidenceSource fields populated.
14. Curriculum version note — surfaced when evidence mixes versions.
15. New board added by YAML only — no code change.
"""

from __future__ import annotations

import asyncio
import math
import uuid
from pathlib import Path
from typing import Optional

import pytest
import yaml

from services.knowledge.board_registry import BoardRegistry, BoardRegistryError
from services.knowledge.concept_graph import ConceptGraph
from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.pgvector_client import MockVectorBackend, PgVectorClient
from services.knowledge.retrieval import KnowledgeRetriever
from services.knowledge.schemas import (
    BoardProfile,
    CurriculumItem,
    CurriculumVersion,
    EvidenceSource,
    ExamStyle,
    RetrievalResult,
    SourcePriority,
    TextbookMapping,
)
from services.knowledge.textbook_mapper import TextbookMapper

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

BOARD_CONFIGS_DIR = Path(__file__).parent.parent / "board_configs"


def _make_curriculum_store() -> tuple[CurriculumStore, str, str]:
    """Returns (store, fbise_v2022_id, fbise_v2025_id)."""
    store = CurriculumStore()

    v2022 = store.create_version(
        board_id="FBISE", version_name="2022", year_from=2022, year_to=2024,
        description="FBISE 2022 curriculum",
        major_changes=["Revised motion chapter"],
    )
    v2025 = store.create_version(
        board_id="FBISE", version_name="2025", year_from=2025,
        description="FBISE 2025 curriculum (SNC aligned)",
        major_changes=["New thermal physics section"],
    )
    bise_v2020 = store.create_version(
        board_id="BISE-Lahore", version_name="2020", year_from=2020,
        description="BISE-Lahore 2020 curriculum",
    )

    # FBISE 2022 items
    for concept, topic, chapter, lo in [
        ("Acceleration", "Acceleration", "Motion",
         "Define and calculate acceleration using a = Δv/Δt"),
        ("Newton's Second Law", "Newton's Second Law", "Force and Laws of Motion",
         "Apply F = ma to solve numerical problems"),
        ("Ohm's Law", "Resistance", "Electricity",
         "State and verify Ohm's Law experimentally"),
    ]:
        store.create_item(
            curriculum_version_id=v2022.id,
            class_level="10", subject="Physics",
            chapter=chapter, topic=topic, concept=concept,
            learning_objective=lo,
        )

    # FBISE 2025 items (same concepts, but new curriculum version)
    store.create_item(
        curriculum_version_id=v2025.id,
        class_level="10", subject="Physics",
        chapter="Motion", topic="Acceleration", concept="Acceleration",
        learning_objective="Analyse motion graphs to determine acceleration",
    )

    # BISE-Lahore items
    store.create_item(
        curriculum_version_id=bise_v2020.id,
        class_level="10", subject="Physics",
        chapter="Motion", topic="Acceleration", concept="Acceleration",
        learning_objective="Calculate acceleration from v-t graphs",
    )

    return store, v2022.id, v2025.id


def _make_textbook_mapper(curriculum_version_id: str) -> TextbookMapper:
    mapper = TextbookMapper()

    # Verified textbook mapping
    mapper.create_mapping(
        book_id="book-fbise-phys-10",
        book_title="Physics Class 10 (FBISE)",
        chapter_title="Chapter 2: Motion",
        board_short_code="FBISE",
        curriculum_version_id=curriculum_version_id,
        class_level="10",
        subject="Physics",
        chapter="Motion",
        topic="Acceleration",
        concept="Acceleration",
        chapter_number=2,
        page_start=45, page_end=52,
        confidence=0.95,
        is_human_verified=True,
        text_snippet=(
            "Acceleration is the rate of change of velocity. "
            "a = (v - u) / t where v is final velocity, u initial velocity."
        ),
    )

    # Unverified (AI-inferred) textbook mapping
    mapper.create_mapping(
        book_id="book-fbise-phys-10",
        book_title="Physics Class 10 (FBISE)",
        chapter_title="Chapter 4: Newton's Laws",
        board_short_code="FBISE",
        curriculum_version_id=curriculum_version_id,
        class_level="10",
        subject="Physics",
        chapter="Force and Laws of Motion",
        topic="Newton's Second Law",
        concept="Newton's Second Law",
        chapter_number=4,
        page_start=88, page_end=95,
        confidence=0.78,
        is_human_verified=False,    # AI-inferred, not yet verified
        text_snippet="Newton's second law states that F = ma, where F is the net force.",
    )

    return mapper


def _make_past_papers() -> list[dict]:
    return [
        {
            "id": "ppq-2022-q1",
            "board": "FBISE", "year": 2022, "subject": "Physics",
            "chapter": "Motion", "topic": "Acceleration", "concept": "Acceleration",
            "question_number": "Q1", "page": 1,
            "text": "A car accelerates from 0 to 20 m/s in 5 seconds. Calculate the acceleration.",
            "confidence": 1.0,
        },
        {
            "id": "ppq-2023-q2",
            "board": "FBISE", "year": 2023, "subject": "Physics",
            "chapter": "Force and Laws of Motion", "topic": "Newton's Second Law",
            "concept": "Newton's Second Law",
            "question_number": "Q2", "page": 2,
            "text": "Find the force required to accelerate a 5 kg mass at 3 m/s^2. Use F = ma.",
            "confidence": 1.0,
        },
        {
            "id": "ppq-bise-2021-q1",
            "board": "BISE-Lahore", "year": 2021, "subject": "Physics",
            "chapter": "Motion", "topic": "Acceleration", "concept": "Acceleration",
            "question_number": "Q1", "page": 1,
            "text": "Define acceleration. A body starts from rest and reaches 30 m/s in 10s.",
            "confidence": 1.0,
        },
    ]


def _make_approved() -> list[dict]:
    return [
        {
            "id": "aq-001",
            "board": "FBISE", "concept": "Acceleration",
            "chapter": "Motion", "topic": "Acceleration",
            "text": "Teacher-created: What is the SI unit of acceleration?",
            "confidence": 0.95,
        },
    ]


def _make_ai_questions() -> list[dict]:
    return [
        {
            "id": "ai-001",
            "board": "FBISE", "concept": "Acceleration",
            "chapter": "Motion", "topic": "Acceleration",
            "text": "AI-generated: Which of the following best describes acceleration?",
            "confidence": 0.7,
        },
    ]


def _make_retriever(
    include_ai_in_store: bool = True,
    embed_fn=None,
    pgvector: Optional[PgVectorClient] = None,
) -> KnowledgeRetriever:
    store, v2022_id, _ = _make_curriculum_store()
    mapper = _make_textbook_mapper(v2022_id)
    pq = pgvector or PgVectorClient.unavailable()
    return KnowledgeRetriever(
        curriculum_store=store,
        textbook_mapper=mapper,
        pgvector_client=pq,
        past_paper_questions=_make_past_papers(),
        approved_questions=_make_approved(),
        ai_questions=_make_ai_questions() if include_ai_in_store else [],
        embed_fn=embed_fn,
    )


# ===========================================================================
# 1. Board Registry — data-driven YAML loading
# ===========================================================================

class TestBoardRegistry:

    def setup_method(self):
        BoardRegistry.reset_default()

    def test_default_loads_bundled_configs(self):
        registry = BoardRegistry.default()
        assert registry.is_registered("FBISE")
        assert registry.is_registered("BISE-Lahore")
        assert registry.is_registered("Cambridge")

    def test_get_fbise_profile(self):
        registry = BoardRegistry.default()
        profile = registry.get("FBISE")
        assert profile.short_code == "FBISE"
        assert profile.country == "Pakistan"
        assert "10" in profile.class_levels
        assert "Physics" in profile.subjects_by_class["10"]

    def test_case_insensitive_lookup(self):
        registry = BoardRegistry.default()
        assert registry.get("fbise").short_code == "FBISE"
        assert registry.get("FBISE").short_code == "FBISE"

    def test_unknown_board_raises(self):
        registry = BoardRegistry.default()
        with pytest.raises(BoardRegistryError):
            registry.get("NONEXISTENT-BOARD")

    def test_get_or_none_returns_none(self):
        registry = BoardRegistry.default()
        assert registry.get_or_none("FAKE") is None

    def test_all_boards_sorted(self):
        registry = BoardRegistry.default()
        codes = registry.all_short_codes()
        assert codes == sorted(codes)

    def test_cambridge_exam_style(self):
        registry = BoardRegistry.default()
        cam = registry.get("Cambridge")
        assert cam.exam_style.mcq_paper is True
        assert cam.exam_style.practical_component is True

    def test_subjects_for_class(self):
        registry = BoardRegistry.default()
        profile = registry.get("FBISE")
        subjects = profile.subjects_for_class("10")
        assert "Physics" in subjects
        assert "Chemistry" in subjects


# ===========================================================================
# 2. Board Terminology Resolution
# ===========================================================================

class TestTerminology:

    def setup_method(self):
        BoardRegistry.reset_default()

    def test_cambridge_chapter_is_topic(self):
        registry = BoardRegistry.default()
        term = registry.terminology("Cambridge", "chapter")
        assert term == "topic", "Cambridge uses 'topic', not 'chapter'"

    def test_fbise_chapter_unchanged(self):
        registry = BoardRegistry.default()
        term = registry.terminology("FBISE", "chapter")
        assert term == "chapter"

    def test_unknown_term_falls_back_to_standard(self):
        registry = BoardRegistry.default()
        term = registry.terminology("FBISE", "nonexistent_term")
        assert term == "nonexistent_term"

    def test_unknown_board_terminology_falls_back(self):
        registry = BoardRegistry.default()
        # Board not registered → graceful fallback
        term = registry.terminology("FAKE-BOARD", "chapter")
        assert term == "chapter"


# ===========================================================================
# 3. New Board via YAML Only (No Code Change)
# ===========================================================================

class TestNewBoardByYAML:

    def setup_method(self):
        BoardRegistry.reset_default()

    def test_register_new_board_from_yaml(self, tmp_path):
        """Adding a new board must only require a YAML file — no code changes."""
        new_board_yaml = {
            "id": "sindh_board",
            "name": "Board of Secondary Education Karachi",
            "short_code": "BSEK",
            "country": "Pakistan",
            "class_levels": ["9", "10"],
            "subjects_by_class": {"10": ["Physics", "Chemistry"]},
            "exam_style": {
                "mcq_paper": True,
                "subjective_paper": True,
                "allowed_question_types": ["MCQ_SINGLE", "SHORT_ANSWER"],
            },
        }
        yaml_file = tmp_path / "bsek.yaml"
        yaml_file.write_text(yaml.dump(new_board_yaml), encoding="utf-8")

        registry = BoardRegistry()
        profile = registry.from_yaml(yaml_file)

        assert profile.short_code == "BSEK"
        assert registry.is_registered("BSEK")
        assert "Physics" in profile.subjects_for_class("10")

    def test_load_directory_loads_all_yamls(self, tmp_path):
        for code in ["BSEK", "BSEP", "BSER"]:
            data = {
                "id": code.lower(),
                "name": f"Board {code}",
                "short_code": code,
                "country": "Pakistan",
                "class_levels": ["10"],
                "subjects_by_class": {"10": ["Physics"]},
                "exam_style": {"allowed_question_types": ["MCQ_SINGLE"]},
            }
            (tmp_path / f"{code.lower()}.yaml").write_text(
                yaml.dump(data), encoding="utf-8"
            )

        registry = BoardRegistry()
        registry.load_directory(tmp_path)
        assert len(registry) == 3
        for code in ["BSEK", "BSEP", "BSER"]:
            assert registry.is_registered(code)


# ===========================================================================
# 4. Curriculum Versioning
# ===========================================================================

class TestCurriculumVersioning:

    def test_active_version_resolved_correctly(self):
        store, v2022_id, v2025_id = _make_curriculum_store()

        active_2023 = store.get_active_version("FBISE", 2023)
        assert active_2023 is not None
        assert active_2023.version_name == "2022"

        active_2025 = store.get_active_version("FBISE", 2025)
        assert active_2025 is not None
        assert active_2025.version_name == "2025"

    def test_no_version_before_board_existed(self):
        store, _, _ = _make_curriculum_store()
        result = store.get_active_version("FBISE", 1970)
        assert result is None

    def test_version_active_for_year(self):
        v = CurriculumVersion(
            id="v1", board_id="FBISE", version_name="2022",
            year_from=2022, year_to=2024
        )
        assert v.is_active_for_year(2022) is True
        assert v.is_active_for_year(2024) is True
        assert v.is_active_for_year(2025) is False
        assert v.is_active_for_year(2021) is False

    def test_open_ended_version_active_forever(self):
        v = CurriculumVersion(
            id="v2", board_id="FBISE", version_name="2025",
            year_from=2025, year_to=None
        )
        assert v.is_active_for_year(2025) is True
        assert v.is_active_for_year(2040) is True

    def test_version_mixing_detection(self):
        store, v2022_id, v2025_id = _make_curriculum_store()
        items_2022 = store.items_for_version(v2022_id)
        items_2025 = store.items_for_version(v2025_id)
        mixed = items_2022 + items_2025

        note = store.check_version_mixing(mixed, "FBISE")
        assert note is not None
        assert len(note.versions_mixed) == 2
        assert "2022" in note.message
        assert "2025" in note.message

    def test_no_mixing_single_version(self):
        store, v2022_id, _ = _make_curriculum_store()
        items = store.items_for_version(v2022_id)
        note = store.check_version_mixing(items, "FBISE")
        assert note is None


# ===========================================================================
# 5. Textbook Mapper
# ===========================================================================

class TestTextbookMapper:

    def test_unverified_mapping_is_ai_priority(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        # The Newton's law mapping was created unverified
        newtons = mapper.find(concept="Newton's Second Law")[0]
        assert newtons.is_human_verified is False
        assert newtons.effective_priority == SourcePriority.AI_GENERATED

    def test_verified_mapping_is_textbook_priority(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        accel = mapper.find(concept="Acceleration")[0]
        assert accel.is_human_verified is True
        assert accel.effective_priority == SourcePriority.VERIFIED_TEXTBOOK

    def test_verify_promotes_priority(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        newtons = mapper.find(concept="Newton's Second Law")[0]
        assert newtons.effective_priority == SourcePriority.AI_GENERATED

        updated = mapper.verify(newtons.id, verified_by="teacher_ali")
        assert updated.is_human_verified is True
        assert updated.effective_priority == SourcePriority.VERIFIED_TEXTBOOK
        assert updated.verified_by == "teacher_ali"

    def test_reject_removes_mapping(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        newtons = mapper.find(concept="Newton's Second Law")[0]
        mid = newtons.id
        mapper.reject(mid)
        assert mapper.get(mid) is None

    def test_find_verified_only(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        verified = mapper.find(human_verified_only=True)
        assert all(m.is_human_verified for m in verified)

    def test_find_returns_verified_first(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        # Add an unverified acceleration mapping too
        mapper.create_mapping(
            book_id="book-alt", book_title="Alt Physics",
            chapter_title="Motion",
            board_short_code="FBISE",
            curriculum_version_id=v2022_id,
            class_level="10", subject="Physics",
            chapter="Motion", topic="Acceleration", concept="Acceleration",
            confidence=0.6, is_human_verified=False,
        )
        results = mapper.find(concept="Acceleration")
        # Verified must come first
        assert results[0].is_human_verified is True


# ===========================================================================
# 6. Concept Graph — Source Priority Ordering
# ===========================================================================

class TestConceptGraph:

    def test_curriculum_is_first_source(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        graph = ConceptGraph(
            curriculum_store=store, textbook_mapper=mapper,
        )
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        assert len(nodes) > 0
        node = nodes[0]
        assert node.top_priority == SourcePriority.VERIFIED_CURRICULUM
        # Curriculum source must appear before textbook
        assert node.curriculum_sources
        top = node.all_sources[0]
        assert top.source_type == "CURRICULUM"

    def test_ai_excluded_by_default(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        graph = ConceptGraph(
            curriculum_store=store, textbook_mapper=mapper,
            ai_questions=_make_ai_questions(),
            include_ai=False,  # Default
        )
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        all_sources = [s for node in nodes for s in node.all_sources]
        ai_sources = [s for s in all_sources if s.priority == SourcePriority.AI_GENERATED]
        assert len(ai_sources) == 0, "AI sources must be excluded by default"

    def test_ai_included_when_flag_set(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        # Unverified textbook mapping goes into AI tier
        graph = ConceptGraph(
            curriculum_store=store, textbook_mapper=mapper,
            ai_questions=_make_ai_questions(),
            include_ai=True,
        )
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        all_sources = [s for node in nodes for s in node.all_sources]
        ai_sources = [s for s in all_sources if s.priority == SourcePriority.AI_GENERATED]
        assert len(ai_sources) > 0

    def test_board_isolation_in_graph(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        graph = ConceptGraph(
            curriculum_store=store, textbook_mapper=mapper,
            past_paper_questions=_make_past_papers(),
        )
        # FBISE query must not return BISE-Lahore sources
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        for node in nodes:
            for src in node.all_sources:
                if src.board:
                    assert src.board == "FBISE", (
                        f"Expected only FBISE sources, got {src.board}"
                    )

    def test_past_paper_in_graph(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        graph = ConceptGraph(
            curriculum_store=store, textbook_mapper=mapper,
            past_paper_questions=_make_past_papers(),
        )
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        pp_sources = [
            s for node in nodes for s in node.all_sources
            if s.source_type == "PAST_PAPER"
        ]
        assert len(pp_sources) >= 1
        assert pp_sources[0].year == 2022
        assert pp_sources[0].question_number == "Q1"

    def test_model_paper_in_graph(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        model_paper_item = {
            "id": "model_q1",
            "concept": "Acceleration",
            "chapter": "Motion",
            "topic": "Acceleration",
            "board": "FBISE",
            "year": 2024,
            "page": 2,
            "question_number": "Q3(a)",
            "paper_type": "Model Paper",
            "text": "Explain uniform acceleration with an example.",
        }
        graph = ConceptGraph(
            curriculum_store=store,
            textbook_mapper=mapper,
            past_paper_questions=[model_paper_item],
        )
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        assert len(nodes) >= 1
        node = nodes[0]
        assert len(node.model_paper_sources) == 1
        mp_src = node.model_paper_sources[0]
        assert mp_src.source_type == "MODEL_PAPER"
        assert mp_src.relationship == "MODEL_PAPER_BLUEPRINT"
        assert mp_src.question_number == "Q3(a)"


# ===========================================================================
# 7. Source Priority Invariants
# ===========================================================================

class TestSourcePriority:

    def test_ai_is_lowest_priority(self):
        assert SourcePriority.AI_GENERATED.value > SourcePriority.VERIFIED_CURRICULUM.value
        assert SourcePriority.AI_GENERATED.value > SourcePriority.VERIFIED_TEXTBOOK.value
        assert SourcePriority.AI_GENERATED.value > SourcePriority.VERIFIED_PAST_PAPER.value
        assert SourcePriority.AI_GENERATED.value > SourcePriority.APPROVED_TEACHER_CONTENT.value

    def test_curriculum_is_highest_priority(self):
        assert SourcePriority.VERIFIED_CURRICULUM.value == min(p.value for p in SourcePriority)

    def test_priority_labels_no_predictive_language(self):
        for p in SourcePriority:
            label = p.label.lower()
            assert "guarantee" not in label
            assert "predict" not in label

    def test_ai_label_warns(self):
        assert "not authoritative" in SourcePriority.AI_GENERATED.label.lower()

    def test_evidence_source_priority_field(self):
        src = EvidenceSource(
            source_type="AI_GENERATED",
            source_id="x",
            priority=SourcePriority.AI_GENERATED,
        )
        assert src.priority_label == SourcePriority.AI_GENERATED.label


# ===========================================================================
# 8. Metadata Retrieval
# ===========================================================================

class TestMetadataRetrieval:

    def test_retrieve_acceleration_returns_curriculum_first(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration physics class 10",
            board="FBISE", class_level="10", subject="Physics",
            concept="Acceleration",
        ))
        assert len(results) > 0
        # First result must be curriculum (highest priority)
        assert results[0].top_priority == SourcePriority.VERIFIED_CURRICULUM
        assert results[0].retrieval_strategy == "metadata"

    def test_retrieve_returns_retrieval_result_type(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="Newton's second law",
            board="FBISE", class_level="10", subject="Physics",
        ))
        assert all(isinstance(r, RetrievalResult) for r in results)

    def test_retrieve_board_isolation(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics",
            concept="Acceleration",
        ))
        for result in results:
            for src in result.sources:
                if src.board:
                    assert src.board == "FBISE"

    def test_retrieve_top_k_respected(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="physics",
            board="FBISE", class_level="10", subject="Physics",
            top_k=2,
        ))
        assert len(results) <= 2


# ===========================================================================
# 9. Keyword Retrieval
# ===========================================================================

class TestKeywordRetrieval:

    def test_keyword_retrieves_past_paper_text_match(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="car accelerates from rest velocity seconds calculate",
            board="FBISE", class_level="10", subject="Physics",
            min_keyword_similarity=0.05,
        ))
        sources_types = [s.source_type for r in results for s in r.sources]
        # Should find the past paper via keyword
        assert "PAST_PAPER" in sources_types or "CURRICULUM" in sources_types

    def test_keyword_result_has_similarity_score(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="car accelerates velocity seconds calculate",
            board="FBISE", class_level="10", subject="Physics",
            concept=None,
            min_keyword_similarity=0.01,
        ))
        keyword_results = [r for r in results if r.retrieval_strategy == "keyword"]
        for r in keyword_results:
            assert r.similarity_score is not None
            assert 0.0 < r.similarity_score <= 1.0

    def test_keyword_no_cross_board_contamination(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="body starts from rest reaches velocity",
            board="FBISE", class_level="10", subject="Physics",
            min_keyword_similarity=0.05,
        ))
        for r in results:
            for src in r.sources:
                if src.board:
                    assert src.board == "FBISE", (
                        f"Keyword result must not return BISE-Lahore (got {src.board})"
                    )


# ===========================================================================
# 10. Semantic Retrieval (MockVectorBackend)
# ===========================================================================

class TestSemanticRetrieval:

    def _unit_vec(self, dim: int, val: float = 1.0) -> list[float]:
        """Normalised vector pointing in the first dimension."""
        vec = [0.0] * dim
        vec[0] = val
        mag = math.sqrt(sum(x * x for x in vec))
        return [x / mag for x in vec]

    def test_semantic_retrieval_returns_results(self):
        dim = 8  # Small dimension for tests
        pg_client, mock_backend = PgVectorClient.with_mock()

        # Store a vector for a curriculum item
        asyncio.run(mock_backend.upsert(
            source_type="CURRICULUM",
            source_id="curr-001",
            embedding=self._unit_vec(dim, 1.0),
            embedding_model="test-model",
        ))

        def embed_fn(text: str) -> list[float]:
            return self._unit_vec(dim, 1.0)  # identical vector → similarity = 1.0

        retriever = _make_retriever(pgvector=pg_client, embed_fn=embed_fn)
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics",
            min_semantic_similarity=0.5,
        ))

        semantic_results = [r for r in results if r.retrieval_strategy == "semantic"]
        assert len(semantic_results) >= 1
        assert semantic_results[0].similarity_score >= 0.99  # effectively 1.0

    def test_semantic_unavailable_returns_empty(self):
        """When pgvector is unavailable, semantic strategy returns nothing."""
        retriever = _make_retriever(pgvector=PgVectorClient.unavailable())
        results = asyncio.run(retriever.retrieve(
            query="some query",
            board="FBISE", class_level="10", subject="Physics",
        ))
        semantic = [r for r in results if r.retrieval_strategy == "semantic"]
        assert len(semantic) == 0

    def test_vector_search_respects_min_similarity(self):
        dim = 4
        pg_client, mock_backend = PgVectorClient.with_mock()

        # Store orthogonal vector (similarity = 0.0)
        asyncio.run(mock_backend.upsert(
            source_type="PAST_PAPER", source_id="ppq-x",
            embedding=[1.0, 0.0, 0.0, 0.0], embedding_model="test",
        ))

        def embed_fn(text: str) -> list[float]:
            return [0.0, 0.0, 0.0, 1.0]  # orthogonal → sim=0.0

        retriever = _make_retriever(pgvector=pg_client, embed_fn=embed_fn)
        results = asyncio.run(retriever.retrieve(
            query="anything",
            board="FBISE", class_level="10", subject="Physics",
            min_semantic_similarity=0.5,
        ))
        sim_results = [r for r in results if r.retrieval_strategy == "semantic"]
        # Orthogonal vector must not appear at 0.5 threshold
        assert len(sim_results) == 0


# ===========================================================================
# 11. Hybrid Merge and Deduplication
# ===========================================================================

class TestHybridMerge:

    def test_deduplication_across_strategies(self):
        """A source that matches by both keyword and metadata must appear only once."""
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration velocity calculate",
            board="FBISE", class_level="10", subject="Physics",
            concept="Acceleration",
            min_keyword_similarity=0.01,
        ))
        source_ids = [s.source_id for r in results for s in r.sources]
        # No duplicate source_id
        assert len(source_ids) == len(set(source_ids)), "Duplicate source IDs detected"

    def test_results_sorted_by_priority(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="physics acceleration",
            board="FBISE", class_level="10", subject="Physics",
            min_keyword_similarity=0.01,
        ))
        priorities = [r.top_priority.value for r in results]
        assert priorities == sorted(priorities), (
            "Results must be sorted by source priority (lowest value first)"
        )


# ===========================================================================
# 12. AI Exclusion
# ===========================================================================

class TestAIExclusion:

    def test_ai_excluded_from_results_by_default(self):
        retriever = _make_retriever(include_ai_in_store=True)
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics",
            include_ai_generated=False,  # default
        ))
        for r in results:
            assert not r.is_ai_only, "Result must not be AI-only when include_ai=False"
            for src in r.sources:
                assert src.priority != SourcePriority.AI_GENERATED, (
                    "AI sources must not appear when include_ai_generated=False"
                )

    def test_ai_included_when_requested(self):
        retriever = _make_retriever(include_ai_in_store=True)
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics",
            include_ai_generated=True,
        ))
        all_sources = [s for r in results for s in r.sources]
        ai_sources = [s for s in all_sources if s.priority == SourcePriority.AI_GENERATED]
        assert len(ai_sources) > 0, "AI sources must appear when include_ai_generated=True"

    def test_ai_never_ranked_above_human_content(self):
        retriever = _make_retriever(include_ai_in_store=True)
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics",
            include_ai_generated=True,
        ))
        if len(results) < 2:
            return  # nothing to compare
        # First result must not be AI if human-verified evidence exists
        human_results = [r for r in results if r.top_priority != SourcePriority.AI_GENERATED]
        ai_results = [r for r in results if r.top_priority == SourcePriority.AI_GENERATED]
        if human_results and ai_results:
            # The first human result must appear before the first AI result
            first_human_idx = results.index(human_results[0])
            first_ai_idx = results.index(ai_results[0])
            assert first_human_idx < first_ai_idx, (
                "Human-verified evidence must rank above AI-generated content"
            )


# ===========================================================================
# 13. RetrievalResult Provenance
# ===========================================================================

class TestRetrievalResultProvenance:

    def test_result_has_board(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        assert len(results) > 0
        for r in results:
            assert r.board == "FBISE"

    def test_evidence_source_has_concept(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        for r in results:
            for src in r.sources:
                # Curriculum and textbook sources must carry concept
                if src.source_type in ("CURRICULUM", "TEXTBOOK"):
                    assert src.concept, (
                        f"EvidenceSource of type {src.source_type} must have concept set"
                    )

    def test_past_paper_source_has_question_number(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        pp_sources = [
            s for r in results for s in r.sources if s.source_type == "PAST_PAPER"
        ]
        for src in pp_sources:
            assert src.year is not None
            assert src.question_number is not None

    def test_provenance_summary_is_non_empty(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        for r in results:
            summary = r.provenance_summary()
            assert summary and summary != "No provenance"

    def test_retrieval_result_has_text(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        for r in results:
            assert r.text.strip(), "Every RetrievalResult must have non-empty text"

    def test_result_is_not_ai_only_for_curriculum_query(self):
        retriever = _make_retriever()
        results = asyncio.run(retriever.retrieve(
            query="acceleration",
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration",
        ))
        # The first result has curriculum evidence — must not be AI-only
        assert results[0].is_ai_only is False


# ===========================================================================
# 14. Curriculum Version Note
# ===========================================================================

class TestCurriculumVersionNote:

    def test_version_note_surfaced_when_versions_mixed(self):
        store, v2022_id, v2025_id = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)

        graph = ConceptGraph(curriculum_store=store, textbook_mapper=mapper)
        # Query without year filter → may span both versions
        nodes = graph.gather(
            board="FBISE", class_level="10", subject="Physics", concept="Acceleration"
        )
        # We have Acceleration in both v2022 and v2025 — mixing should be detected
        version_notes = [node.curriculum_version_note for node in nodes if node.curriculum_version_note]
        assert len(version_notes) > 0, (
            "CurriculumVersionNote must be set when evidence spans multiple versions"
        )
        note = version_notes[0]
        assert len(note.versions_mixed) == 2

    def test_version_note_message_is_informative(self):
        store, v2022_id, v2025_id = _make_curriculum_store()
        note = store.check_version_mixing(
            store.items_for_version(v2022_id) + store.items_for_version(v2025_id),
            "FBISE",
        )
        assert note is not None
        assert "2022" in note.message
        assert "2025" in note.message
        # Must instruct user to verify
        assert "verify" in note.message.lower()

    def test_no_version_note_when_single_version(self):
        store, v2022_id, _ = _make_curriculum_store()
        mapper = _make_textbook_mapper(v2022_id)
        graph = ConceptGraph(curriculum_store=store, textbook_mapper=mapper)
        nodes = graph.gather(
            board="BISE-Lahore", class_level="10", subject="Physics", concept="Acceleration"
        )
        for node in nodes:
            assert node.curriculum_version_note is None
