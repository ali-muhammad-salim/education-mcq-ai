"""
Book Historical Analysis Pipeline — Orchestrator.

Runs all 7 stages in order for every chapter of an uploaded book and
produces a BookAnalysisReport.

async def analyze(ingestion_result, board, class_level, ...) -> BookAnalysisReport

Graceful degradation:
- Stage 7 (MCQ generation) is skipped if llm_callable is None.
  In that case review_status = PENDING_GENERATION.
- All other stages always complete.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from services.ingestion.schemas import IngestionResult
from services.past_paper.store import PastPaperStore
from services.knowledge.curriculum_store import CurriculumStore
from services.knowledge.concept_graph import ConceptGraph
from services.knowledge.textbook_mapper import TextbookMapper
from services.validation.orchestrator import MCQValidator

from services.book_analysis.schemas import (
    BookAnalysisReport,
    ChapterAnalysisReport,
    DetectedBookMetadata,
    ReviewStatus,
)
from services.book_analysis.stage1_extractor import BookUnderstandingExtractor
from services.book_analysis.stage2_mapper import CurriculumMapper
from services.book_analysis.stage3_searcher import HistoricalSearcher
from services.book_analysis.stage4_comparator import EvidenceComparator
from services.book_analysis.stage5_diff import EditionDiffAnalyzer
from services.book_analysis.stage6_planner import MCQPriorityPlanner
from services.book_analysis.stage7_generator import MCQCandidateGenerator

logger = logging.getLogger(__name__)


class BookAnalysisPipeline:
    """
    Orchestrates all 7 stages of the Book Historical Analysis Engine.

    Usage:
        pipeline = BookAnalysisPipeline(
            past_paper_store=store,
            curriculum_store=curriculum,
            concept_graph=graph,
            textbook_mapper=mapper,
            llm_callable=None,      # None → Stage 7 degrades gracefully
        )
        report = await pipeline.analyze(ingestion_result, board="FBISE", class_level="10")
    """

    def __init__(
        self,
        past_paper_store: PastPaperStore,
        curriculum_store: CurriculumStore,
        concept_graph: ConceptGraph,
        textbook_mapper: TextbookMapper,
        validator: Optional[MCQValidator] = None,
        llm_callable=None,
        edition_diff_analyzer: Optional[EditionDiffAnalyzer] = None,
    ) -> None:
        self._store = past_paper_store
        self._stage1 = BookUnderstandingExtractor()
        self._stage2 = CurriculumMapper(curriculum_store, concept_graph, textbook_mapper)
        self._stage3 = HistoricalSearcher(past_paper_store)
        self._stage4 = EvidenceComparator()
        self._stage5 = edition_diff_analyzer or EditionDiffAnalyzer()
        self._stage6 = MCQPriorityPlanner()
        self._stage7 = MCQCandidateGenerator(
            past_paper_store=past_paper_store,
            validator=validator or MCQValidator(),
            llm_callable=llm_callable,
        )

    async def analyze(
        self,
        ingestion_result: IngestionResult,
        board: str,
        class_level: str,
        subject: Optional[str] = None,
        book_id: str = "unknown-book",
        book_title: str = "",
        book_edition: str = "",
        curriculum_version_id: str = "default",
        previous_edition: Optional[str] = None,
        max_candidates_per_concept: int = 3,
        # Allow caller to override metadata detection
        board_hint: Optional[str] = None,
        class_hint: Optional[str] = None,
        subject_hint: Optional[str] = None,
        edition_hint: Optional[str] = None,
    ) -> BookAnalysisReport:
        """
        Run the full 7-stage analysis and return a BookAnalysisReport.
        """
        now = datetime.now(timezone.utc).isoformat()
        logger.info(
            "BookAnalysisPipeline: Starting analysis of '%s' — board=%s class=%s",
            ingestion_result.file_path, board, class_level,
        )

        # ---- Stage 1: Extract ----
        logger.info("Stage 1: Extracting book content...")
        metadata, chapters = self._stage1.extract(
            ingestion_result,
            board_hint=board_hint or board,
            class_hint=class_hint or class_level,
            subject_hint=subject_hint or subject,
            edition_hint=edition_hint or book_edition,
        )
        resolved_subject = metadata.subject.value or subject or "Unknown"
        resolved_title = metadata.title.value or book_title or ingestion_result.file_path

        chapter_reports: list[ChapterAnalysisReport] = []

        for chapter in chapters:
            logger.info("Analyzing chapter: '%s'", chapter.chapter_title)

            # ---- Stage 2: Map to curriculum ----
            logger.info("  Stage 2: Curriculum mapping...")
            curriculum_mappings = self._stage2.map_chapter(
                chapter=chapter,
                book_id=book_id,
                book_title=resolved_title,
                book_edition=book_edition,
                board_short_code=board,
                curriculum_version_id=curriculum_version_id,
                class_level=class_level,
                subject=resolved_subject,
            )

            # ---- Stage 3: Historical search ----
            logger.info("  Stage 3: Historical search...")
            historical_evidence = self._stage3.search_chapter(
                chapter=chapter,
                board=board,
                class_level=class_level,
                subject=resolved_subject,
            )

            # ---- Stage 4: Evidence comparison ----
            logger.info("  Stage 4: Evidence comparison...")
            evidence_table, new_concepts = self._stage4.compare(
                concepts=chapter.concepts,
                evidence_list=historical_evidence,
            )
            chapter_summary = self._stage4.summary_for_chapter(evidence_table)
            chapter_summary["chapter"] = chapter.chapter_title
            chapter_summary["page_start"] = chapter.page_start
            chapter_summary["page_end"] = chapter.page_end
            chapter_summary["topic_count"] = len(chapter.topics)
            chapter_summary["formula_count"] = chapter.formula_count
            chapter_summary["diagram_count"] = chapter.diagram_count

            # ---- Stage 5: Edition diff ----
            logger.info("  Stage 5: Edition diff...")
            edition_changes = self._stage5.diff_chapter(
                chapter=chapter,
                book_title=resolved_title,
                current_edition=book_edition or "current",
                previous_edition=previous_edition,
            )

            # ---- Stage 6: Priority plan ----
            logger.info("  Stage 6: MCQ priority planning...")
            priority_plan = self._stage6.plan_chapter(
                chapter=chapter,
                curriculum_mappings=curriculum_mappings,
                historical_evidence=historical_evidence,
                board=board,
                class_level=class_level,
                subject=resolved_subject,
            )

            # ---- Stage 7: Generate candidates ----
            logger.info("  Stage 7: Generating MCQ candidates...")
            candidates, gen_status = await self._stage7.generate_for_plan(
                plan=priority_plan,
                historical_evidence=historical_evidence,
                curriculum_mappings=curriculum_mappings,
                board=board,
                class_level=class_level,
                subject=resolved_subject,
                max_candidates_per_concept=max_candidates_per_concept,
            )

            # Determine review status
            if gen_status == ReviewStatus.PENDING_GENERATION:
                review_status = ReviewStatus.PENDING_GENERATION
            elif any(c.validation_status.value == "FAIL" for c in candidates):
                review_status = ReviewStatus.NEEDS_REVIEW
            elif candidates:
                review_status = ReviewStatus.READY
            else:
                review_status = ReviewStatus.PENDING

            # Collect all past-paper matches (flat)
            all_pp_matches = []
            for ev in historical_evidence:
                all_pp_matches.extend(ev.past_paper_matches)

            # Pattern analysis from stage 3 (via search)
            pattern_report = self._stage3._search.findQuestionPatterns(
                board=board, subject=resolved_subject, chapter=chapter.chapter_title
            )

            chapter_report = ChapterAnalysisReport(
                board=board,
                class_level=class_level,
                subject=resolved_subject,
                generated_at=now,
                chapter_summary=chapter_summary,
                detected_concepts=chapter.concepts,
                curriculum_mapping=curriculum_mappings,
                historical_evidence=historical_evidence,
                related_past_paper_questions=all_pp_matches,
                new_concepts=new_concepts,
                changed_concepts=edition_changes,
                question_pattern_analysis=pattern_report.patterns,
                recommended_mcq_coverage=priority_plan,
                generated_mcq_candidates=candidates,
                validation_results=[
                    {
                        "concept": c.candidate.concept,
                        "status": c.validation_status.value,
                        "notes": c.validation_notes,
                    }
                    for c in candidates
                ],
                review_status=review_status,
            )
            chapter_reports.append(chapter_report)

        # ---- Aggregate ----
        total_concepts = sum(len(r.detected_concepts) for r in chapter_reports)
        total_new = sum(len(r.new_concepts) for r in chapter_reports)
        total_pp = sum(len(r.related_past_paper_questions) for r in chapter_reports)
        total_gen = sum(len(r.generated_mcq_candidates) for r in chapter_reports)
        total_passed = sum(
            sum(1 for c in r.generated_mcq_candidates if c.validation_status.value == "PASS")
            for r in chapter_reports
        )

        overall_status = ReviewStatus.PENDING_GENERATION
        if all(r.review_status != ReviewStatus.PENDING_GENERATION for r in chapter_reports):
            if any(r.review_status == ReviewStatus.NEEDS_REVIEW for r in chapter_reports):
                overall_status = ReviewStatus.NEEDS_REVIEW
            elif chapter_reports:
                overall_status = ReviewStatus.READY
            else:
                overall_status = ReviewStatus.PENDING

        report = BookAnalysisReport(
            book_title=resolved_title,
            book_edition=book_edition,
            board=board,
            class_level=class_level,
            subject=resolved_subject,
            generated_at=now,
            metadata=metadata,
            chapters=chapter_reports,
            total_concepts=total_concepts,
            total_new_concepts=total_new,
            total_past_paper_matches=total_pp,
            total_candidates_generated=total_gen,
            total_candidates_passed=total_passed,
            review_status=overall_status,
        )

        logger.info(
            "BookAnalysisPipeline: Complete — %d chapters, %d concepts, "
            "%d new concepts, %d past-paper matches, %d candidates generated (%d passed).",
            len(chapters), total_concepts, total_new,
            total_pp, total_gen, total_passed,
        )
        return report
