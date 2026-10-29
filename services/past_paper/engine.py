"""
Past Paper Intelligence Engine — Top-Level Orchestrator.

Usage
-----
    from services.past_paper.engine import PastPaperEngine

    engine = PastPaperEngine()
    pid = engine.ingest_paper(
        text="...",
        metadata_hint={"board": "FBISE", "year": "2025", "subject": "Physics"},
    )
    engine.classify_all(use_llm=False)   # or True when Ollama is running
    engine.build_semantic_map()
    engine.compute_historical_stats()

    report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
    print(engine.format_report(report))

    # Search APIs
    occurrences = engine.search.findPastQuestionsForConcept("Acceleration")
    similar = engine.search.findSimilarPastQuestions("rate of change of velocity")
    pattern_report = engine.search.findQuestionPatterns("FBISE", "Physics", "Motion")
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any, Optional

from services.past_paper.historical_analyzer import compute_historical_stats
from services.past_paper.metadata_extractor import extract_metadata
from services.past_paper.question_classifier import classify_question
from services.past_paper.report_generator import format_chapter_report, generate_chapter_report
from services.past_paper.schemas import (
    ChapterReport,
    ExtractedQuestion,
    PaperMetadata,
    SemanticRelationship,
)
from services.past_paper.search import PastPaperSearch
from services.past_paper.semantic_mapper import build_semantic_map
from services.past_paper.store import PastPaperStore
from services.past_paper.study_priority import (
    BalancedPracticeBlueprint,
    ConceptStudyPriority,
    PriorityCategory,
    PriorityWeights,
    StudyPriorityEngine,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simple built-in question parser (used when no pre-extracted questions given)
# ---------------------------------------------------------------------------

_QUESTION_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:Q\.?\s*)?(\d{1,3})\s*[\.\):]?\s*"  # Question number
    r"(?:\(([a-z]{1,2}(?:i{0,3}|iv|v)?)\))?\s*"         # Sub-question (optional)
    r"([\s\S]+?)(?=\n\s*(?:Q\.?\s*)?\d{1,3}[\.\):]|\Z)",  # Question text
    re.MULTILINE | re.IGNORECASE,
)
_MARKS_PATTERN = re.compile(r"\[\s*(\d+)\s*(?:marks?)?\s*\]|\(\s*(\d+)\s*marks?\s*\)", re.IGNORECASE)


def _parse_questions_from_text(
    text: str,
    paper_id: str,
    metadata: PaperMetadata,
) -> list[ExtractedQuestion]:
    """
    Simple regex-based question parser used when caller does not supply
    pre-extracted questions.

    Returns at least one question per detected Q-number / sub-question block.
    """
    questions: list[ExtractedQuestion] = []

    year_str = metadata.year.value or "0"
    try:
        year = int(year_str)
    except ValueError:
        year = 0

    board = metadata.board.value or "UNKNOWN"
    class_level = metadata.class_level.value or "UNKNOWN"
    subject = metadata.subject.value or "UNKNOWN"
    session = metadata.session.value or ""

    for match in _QUESTION_PATTERN.finditer(text):
        q_num = match.group(1)
        sub_q = match.group(2) or ""
        q_text = match.group(3).strip()

        if not q_text:
            continue

        # Detect marks
        marks_match = _MARKS_PATTERN.search(q_text)
        marks: Optional[float] = None
        if marks_match:
            raw = marks_match.group(1) or marks_match.group(2)
            try:
                marks = float(raw)
            except ValueError:
                pass

        # Detect MCQ options
        is_mcq = bool(re.search(r"^\s*(?:\([A-Da-d]\)|[A-Da-d][\.\)])\s+", q_text, re.MULTILINE))

        questions.append(ExtractedQuestion(
            paper_id=paper_id,
            year=year,
            board=board,
            class_level=class_level,
            subject=subject,
            session=session,
            question_number=q_num,
            sub_question_number=sub_q,
            marks=marks,
            question_type="MCQ" if is_mcq else "UNKNOWN",
            text=q_text,
            page=None,
        ))

    return questions


# ===========================================================================
# Engine
# ===========================================================================

class PastPaperEngine:
    """
    Top-level orchestrator for the Past Paper Intelligence Engine.

    The engine manages its own in-memory store.  All operations are
    synchronous.  The store can be inspected at any time via `engine.store`.
    """

    def __init__(self, store: Optional[PastPaperStore] = None) -> None:
        self.store = store or PastPaperStore()
        self.search = PastPaperSearch(self.store)
        self._question_id_map: dict[str, str] = {}  # paper_id → [question_ids]

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------

    def ingest_paper(
        self,
        text: str = "",
        metadata_hint: Optional[dict[str, Any]] = None,
        questions: Optional[list[ExtractedQuestion]] = None,
        paper_id: Optional[str] = None,
        source_file: Optional[str] = None,
    ) -> str:
        """
        Ingest a past paper into the engine.

        Parameters
        ----------
        text:
            Raw text of the paper (used for metadata extraction and question
            parsing if `questions` is not supplied).
        metadata_hint:
            Caller-supplied metadata overrides (verified, not inferred).
            Keys: board, class_level, subject, year, session, paper_type, paper_code.
        questions:
            Pre-extracted questions.  If supplied, text-based parsing is skipped.
        paper_id:
            Optional fixed ID. Auto-generated if omitted.
        source_file:
            Original file path for traceability.

        Returns
        -------
        paper_id : str
        """
        hint = metadata_hint or {}
        filename = source_file or ""

        # Extract metadata
        metadata = extract_metadata(text=text, filename=filename, metadata_hint=hint)

        # Add to store
        pid = paper_id or str(uuid.uuid4())
        self.store.add_paper(
            metadata=metadata,
            raw_text=text,
            paper_id=pid,
            source_file=source_file,
        )

        # Parse or register questions
        if questions is not None:
            qs = questions
        else:
            qs = _parse_questions_from_text(text, pid, metadata)

        q_ids = []
        for q in qs:
            # Ensure paper_id is set correctly
            q_with_pid = q.model_copy(update={"paper_id": pid})
            qid = self.store.add_question(q_with_pid)
            q_ids.append(qid)

        self._question_id_map[pid] = q_ids

        if metadata.verification_required:
            logger.warning(
                "Paper '%s': the following metadata fields are INFERRED and "
                "require verification: %s",
                pid,
                metadata.verification_required,
            )

        logger.info(
            "Ingested paper %s | board=%s | year=%s | %d question(s)",
            pid,
            metadata.board.value,
            metadata.year.value,
            len(qs),
        )
        return pid

    def ingest_questions_directly(
        self,
        questions: list[ExtractedQuestion],
    ) -> list[str]:
        """
        Add pre-built ExtractedQuestion objects directly to the store.

        Returns the list of assigned question IDs.
        """
        ids = []
        for q in questions:
            qid = self.store.add_question(q)
            ids.append(qid)
        return ids

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    def classify_all(self, use_llm: bool = True, repo: Any = None, syllabus_version_id: str = "") -> int:
        """
        Classify all unclassified questions in the store.

        Parameters
        ----------
        use_llm:
            If True, attempt LLM-based classification before keyword fallback.
        repo:
            Optional dependency-injected repository (e.g. Database client) for RAG lookup.
        syllabus_version_id:
            If empty and repo is provided, the engine will attempt to resolve it
            per question using services.knowledge.version_resolver.

        Returns
        -------
        Number of questions classified in this call.
        """
        from services.knowledge.version_resolver import resolve_from_db

        classified = 0
        existing_ids = set(self.store.all_classifications().keys())

        for qid, q in self.store._questions.items():
            if qid in existing_ids:
                continue

            q_syl_id = syllabus_version_id
            if not q_syl_id and repo:
                try:
                    c_level = int(q.class_level) if str(q.class_level).isdigit() else 0
                    if c_level > 0 and q.year > 0:
                        res = resolve_from_db(
                            repo, 
                            board_name=q.board, 
                            subject_name=q.subject, 
                            class_level=c_level, 
                            exam_year=q.year
                        )
                        if res.version_id:
                            q_syl_id = res.version_id
                except Exception as e:
                    logger.warning(f"Failed to resolve syllabus version for QID {qid}: {e}")

            cls = classify_question(
                qid, 
                q, 
                repo=repo, 
                syllabus_version_id=q_syl_id, 
                use_llm=use_llm
            )
            self.store.add_classification(qid, cls)
            classified += 1

        logger.info("classify_all: classified %d question(s).", classified)
        return classified

    # ------------------------------------------------------------------
    # Semantic mapping
    # ------------------------------------------------------------------

    def build_semantic_map(
        self,
        similarity_threshold: float = 0.82,
        use_embeddings: bool = True,
        use_llm_reasons: bool = True,
    ) -> list[SemanticRelationship]:
        """
        Build semantic relationships between all classified questions.

        Returns the list of new relationships.
        """
        pairs = self.store.classified_questions()
        if not pairs:
            logger.warning("build_semantic_map: no classified questions — run classify_all first.")
            return []

        # Build (id, question, classification) triples
        triples = []
        for q, cls in pairs:
            # Find the ID for this question
            for qid, stored_q in self.store._questions.items():
                if stored_q is q:
                    triples.append((qid, q, cls))
                    break

        relationships = build_semantic_map(
            questions=triples,
            similarity_threshold=similarity_threshold,
            use_embeddings=use_embeddings,
            use_llm_reasons=use_llm_reasons,
        )

        for rel in relationships:
            self.store.add_relationship(rel)

        logger.info("build_semantic_map: created %d relationship(s).", len(relationships))
        return relationships

    # ------------------------------------------------------------------
    # Historical analysis
    # ------------------------------------------------------------------

    def compute_historical_stats(self):
        """
        Compute HistoricalStats for all classified concept groups.

        Returns the list of HistoricalStats objects.
        """
        return compute_historical_stats(self.store)

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------

    def chapter_report(
        self,
        chapter: str,
        board: Optional[str] = None,
        class_level: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> ChapterReport:
        """
        Generate a ChapterReport for the given chapter.

        Requires that compute_historical_stats() has been called first.
        """
        return generate_chapter_report(
            store=self.store,
            chapter=chapter,
            board=board,
            class_level=class_level,
            subject=subject,
        )

    @staticmethod
    def format_report(report: ChapterReport) -> str:
        """Return a human-readable text rendering of a ChapterReport."""
        return format_chapter_report(report)

    # ------------------------------------------------------------------
    # Evidence-Based Study Priority & Practice Engine
    # ------------------------------------------------------------------

    def study_priorities(
        self,
        chapter: str,
        board: str = "ALL",
        class_level: str = "ALL",
        subject: str = "ALL",
        known_concepts: Optional[list[str]] = None,
        model_paper_concepts: Optional[set[str]] = None,
        cutoff_year: Optional[int] = None,
        weights: Optional[PriorityWeights] = None,
    ) -> list[ConceptStudyPriority]:
        """
        Compute multi-dimensional study priority rankings for concepts in a chapter.
        Supports chronological holdout via cutoff_year to prevent data leakage.
        """
        engine = StudyPriorityEngine(weights=weights)
        return engine.evaluate_chapter(
            store=self.store,
            board=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            known_concepts=known_concepts,
            model_paper_concepts=model_paper_concepts,
            cutoff_year=cutoff_year,
        )

    def balanced_practice_blueprint(
        self,
        priorities: list[ConceptStudyPriority],
        total_mcqs: int = 15,
        total_crqs: int = 4,
        total_erqs: int = 1,
    ) -> BalancedPracticeBlueprint:
        """
        Generate a syllabus-balanced practice test blueprint covering both
        high-priority patterns and foundational concepts.
        """
        engine = StudyPriorityEngine()
        return engine.generate_balanced_practice_blueprint(
            priorities=priorities,
            total_mcqs=total_mcqs,
            total_crqs=total_crqs,
            total_erqs=total_erqs,
        )

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    def summary(self) -> dict[str, Any]:
        """Return a diagnostic summary of the engine state."""
        return self.store.summary()

