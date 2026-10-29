"""
Evidence-Based Study Priority & Practice Engine.

Calculates multi-dimensional study priority rankings for Student Learning Outcomes (SLOs)
and concepts based strictly on verified curriculum requirements, official model papers,
and historical examination evidence.

NON-NEGOTIABLE PRINCIPLES:
1. The official syllabus is the ground truth of required learning scope.
2. An SLO that has never appeared in past papers must NEVER be marked as unimportant.
3. Priority rankings are relative study recommendations, NOT probabilistic guarantees
   of what will appear on future exams.
4. Chronological holdouts are strictly supported to prevent temporal data leakage.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from services.past_paper.schemas import (
    EvidenceLabel,
    HistoricalStats,
)
from services.past_paper.store import PastPaperStore


class PriorityCategory(str, Enum):
    HIGH_STUDY_PRIORITY = "HIGH_STUDY_PRIORITY"
    IMPORTANT_FOUNDATIONAL_CONCEPT = "IMPORTANT_FOUNDATIONAL_CONCEPT"
    PRACTICE_RECOMMENDED = "PRACTICE_RECOMMENDED"
    HISTORICAL_PATTERN_OBSERVED = "HISTORICAL_PATTERN_OBSERVED"
    LIMITED_HISTORICAL_EVIDENCE = "LIMITED_HISTORICAL_EVIDENCE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class PriorityWeights(BaseModel):
    """Configurable weights for study priority scoring."""
    curriculum_weight: float = 0.35
    historical_frequency_weight: float = 0.25
    examiner_style_weight: float = 0.15
    model_paper_weight: float = 0.15
    data_quality_weight: float = 0.10


class PriorityDimensionScores(BaseModel):
    """The 5 separate constituent measures mandated by the curriculum-first design."""
    curriculum_priority: float = Field(ge=0.0, le=1.0, description="Curriculum priority (cognitive level, foundational status)")
    historical_frequency: float = Field(ge=0.0, le=1.0, description="Past paper appearance frequency and recency")
    examiner_style_emphasis: float = Field(ge=0.0, le=1.0, description="Distinct question styles observed (numerical, graph, diagram)")
    model_paper_emphasis: float = Field(ge=0.0, le=1.0, description="Represented in official model/specimen papers")
    source_data_quality: float = Field(ge=0.0, le=1.0, description="Confidence of mappings and provenance verification")


class ConceptStudyPriority(BaseModel):
    """Evidence-grounded study priority assessment for a single concept/SLO."""
    board: str
    class_level: str
    subject: str
    chapter: str
    topic: str
    concept: str
    slo_code: Optional[str] = None

    scores: PriorityDimensionScores
    overall_priority_score: float = Field(ge=0.0, le=1.0, description="Normalized relative study priority (0.0 to 1.0)")
    category: PriorityCategory

    justification: str
    supporting_syllabus_evidence: List[str] = Field(default_factory=list)
    supporting_historical_evidence: List[str] = Field(default_factory=list)
    recommended_question_formats: List[str] = Field(default_factory=list)

    disclaimer: str = (
        "This ranking reflects relative study preparation priority based on official syllabus "
        "requirements and historical evidence. It is NOT a prediction or guarantee that any "
        "specific question will appear in future examinations."
    )


class BalancedPracticeBlueprint(BaseModel):
    """Syllabus-balanced practice test specifications."""
    board: str
    class_level: str
    subject: str
    total_marks: int = 40
    mcq_count: int = 15
    crq_count: int = 4
    erq_count: int = 1
    selected_concepts: List[str] = Field(default_factory=list)
    slo_coverage_ratio: float = 0.0
    coverage_rationale: str = ""


class StudyPriorityEngine:
    """
    Computes explainable, multi-dimensional study priorities without prediction leakage.
    """

    def __init__(self, weights: Optional[PriorityWeights] = None):
        self.weights = weights or PriorityWeights()

    def evaluate_concept(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        topic: str,
        concept: str,
        stats: Optional[HistoricalStats] = None,
        in_model_paper: bool = False,
        cognitive_level: str = "U",  # R, U, A
        is_curriculum_mandated: bool = True,
        mapping_confidence: float = 1.0,
        slo_code: Optional[str] = None,
    ) -> ConceptStudyPriority:
        """
        Evaluate a single concept or SLO across all 5 dimensions.
        """
        # 1. Curriculum Priority Score
        # Application (A) > Understanding (U) > Recall (R) in AKU-EB / modern examination blueprints
        cog_score = {"A": 0.9, "U": 0.7, "R": 0.5}.get(cognitive_level.upper(), 0.6)
        curriculum_score = cog_score if is_curriculum_mandated else 0.2

        # 2. Historical Frequency Score
        if stats and stats.years_appeared:
            # 4+ years = 1.0, 3 years = 0.75, 2 years = 0.5, 1 year = 0.25
            unique_years = len(set(stats.years_appeared))
            hist_score = min(1.0, unique_years * 0.25)
        else:
            hist_score = 0.0

        # 3. Examiner Style Emphasis Score
        # Evaluates richness of testing modalities (numerical, graph, diagram, multi-type)
        style_score = 0.0
        patterns: List[str] = []
        if stats:
            if stats.numerical_frequency > 0:
                style_score += 0.35
                patterns.append("Numerical Problem")
            if stats.diagram_frequency > 0:
                style_score += 0.30
                patterns.append("Diagram Analysis")
            if stats.graph_frequency > 0:
                style_score += 0.25
                patterns.append("Graphical Interpretation")
            if stats.question_type_distribution:
                style_score += 0.10
            style_score = min(1.0, style_score)
        else:
            patterns.append("Standard Conceptual Question")

        # 4. Model Paper Emphasis
        model_score = 0.9 if in_model_paper else 0.2

        # 5. Source Data Quality
        quality_score = max(0.1, min(1.0, mapping_confidence))

        # Overall Weighted Score
        w = self.weights
        overall = (
            w.curriculum_weight * curriculum_score
            + w.historical_frequency_weight * hist_score
            + w.examiner_style_weight * style_score
            + w.model_paper_weight * model_score
            + w.data_quality_weight * quality_score
        )
        overall = round(min(1.0, max(0.0, overall)), 3)

        # Categorization Logic
        if not is_curriculum_mandated:
            category = PriorityCategory.INSUFFICIENT_DATA
            justification = "Concept is not confirmed in current official syllabus."
        elif hist_score >= 0.75 or (in_model_paper and hist_score >= 0.5):
            category = PriorityCategory.HIGH_STUDY_PRIORITY
            justification = "High curriculum importance reinforced by frequent historical assessment and/or model paper presence."
        elif hist_score == 0.0 and curriculum_score >= 0.7:
            category = PriorityCategory.IMPORTANT_FOUNDATIONAL_CONCEPT
            justification = "Curriculum-mandated core concept that requires thorough preparation regardless of past paper absence."
        elif len(patterns) > 1 and hist_score >= 0.25:
            category = PriorityCategory.HISTORICAL_PATTERN_OBSERVED
            justification = f"Observed historical patterns across examination styles: {', '.join(patterns)}."
        elif hist_score > 0:
            category = PriorityCategory.PRACTICE_RECOMMENDED
            justification = "Present in historical papers with opportunities for reinforcement practice."
        else:
            category = PriorityCategory.LIMITED_HISTORICAL_EVIDENCE
            justification = "Official syllabus requirement with limited past examination occurrences."

        # Compile Evidence Trails
        syllabus_evidence = [
            f"Curriculum Mandated: {is_curriculum_mandated}",
            f"Cognitive Demand: {cognitive_level} ({'Application' if cognitive_level == 'A' else 'Understanding' if cognitive_level == 'U' else 'Recall'})",
        ]
        if slo_code:
            syllabus_evidence.append(f"Official SLO Code: {slo_code}")

        historical_evidence = []
        if stats and stats.years_appeared:
            historical_evidence.append(f"Appeared in {len(stats.years_appeared)} examination years: {sorted(stats.years_appeared)}")
            historical_evidence.append(f"Total questions recorded: {stats.number_of_questions}")
        else:
            historical_evidence.append("No historical examination questions recorded in current dataset.")

        if in_model_paper:
            historical_evidence.append("Included in official specimen / model paper.")

        return ConceptStudyPriority(
            board=board,
            class_level=class_level,
            subject=subject,
            chapter=chapter,
            topic=topic,
            concept=concept,
            slo_code=slo_code,
            scores=PriorityDimensionScores(
                curriculum_priority=round(curriculum_score, 3),
                historical_frequency=round(hist_score, 3),
                examiner_style_emphasis=round(style_score, 3),
                model_paper_emphasis=round(model_score, 3),
                source_data_quality=round(quality_score, 3),
            ),
            overall_priority_score=overall,
            category=category,
            justification=justification,
            supporting_syllabus_evidence=syllabus_evidence,
            supporting_historical_evidence=historical_evidence,
            recommended_question_formats=patterns or ["MCQ", "Short Constructed Response"],
        )

    def evaluate_chapter(
        self,
        store: PastPaperStore,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        known_concepts: Optional[List[str]] = None,
        model_paper_concepts: Optional[Set[str]] = None,
        cutoff_year: Optional[int] = None,
    ) -> List[ConceptStudyPriority]:
        """
        Rank all concepts in a chapter.
        Supports CHRONOLOGICAL HOLDOUT: if cutoff_year is specified, only past papers
        conducted BEFORE or ON cutoff_year are taken into account.
        """
        stats_list = store.stats_for_chapter(chapter, board=board, subject=subject)
        stats_by_concept: Dict[str, HistoricalStats] = {}

        for s in stats_list:
            if cutoff_year is not None:
                # Filter occurrences and years to strictly precede cutoff_year
                filtered_years = [y for y in s.years_appeared if y <= cutoff_year]
                filtered_occs = [o for o in s.occurrences if o.year <= cutoff_year]
                if filtered_years:
                    filtered_stats = s.model_copy(update={
                        "years_appeared": filtered_years,
                        "number_of_questions": len(filtered_occs),
                        "occurrences": filtered_occs,
                    })
                    stats_by_concept[s.concept] = filtered_stats
            else:
                stats_by_concept[s.concept] = s

        # Concepts to assess: all known curriculum concepts + any in stats
        concepts_to_eval = set(known_concepts or []) | set(stats_by_concept.keys())
        if not concepts_to_eval:
            return []

        results: List[ConceptStudyPriority] = []
        model_set = model_paper_concepts or set()

        for c in sorted(concepts_to_eval):
            st = stats_by_concept.get(c)
            res = self.evaluate_concept(
                board=board,
                class_level=class_level,
                subject=subject,
                chapter=chapter,
                topic=st.topic if st else "Core Chapter Content",
                concept=c,
                stats=st,
                in_model_paper=(c in model_set),
                cognitive_level="U",
                is_curriculum_mandated=True,
            )
            results.append(res)

        # Sort descending by overall priority score
        results.sort(key=lambda x: x.overall_priority_score, reverse=True)
        return results

    def generate_balanced_practice_blueprint(
        self,
        priorities: List[ConceptStudyPriority],
        total_mcqs: int = 15,
        total_crqs: int = 4,
        total_erqs: int = 1,
    ) -> BalancedPracticeBlueprint:
        """
        Generates a balanced practice test blueprint ensuring broad syllabus coverage
        rather than exclusively over-indexing on frequent past paper topics.
        """
        if not priorities:
            return BalancedPracticeBlueprint(
                board="UNKNOWN", class_level="UNKNOWN", subject="UNKNOWN",
                coverage_rationale="No concept priorities supplied."
            )

        # Select a blend:
        # 50% High Study Priority / Frequent
        # 30% Foundational / Less tested concepts
        # 20% Random/Rotational syllabus coverage
        high_pri = [p for p in priorities if p.category == PriorityCategory.HIGH_STUDY_PRIORITY]
        foundational = [p for p in priorities if p.category == PriorityCategory.IMPORTANT_FOUNDATIONAL_CONCEPT]
        others = [p for p in priorities if p not in high_pri and p not in foundational]

        selected: List[str] = []
        # Take from high priority
        for p in high_pri[:max(1, total_mcqs // 2)]:
            selected.append(p.concept)
        # Take from foundational
        for p in foundational[:max(1, total_mcqs // 3)]:
            if p.concept not in selected:
                selected.append(p.concept)
        # Fill remainder with other syllabus concepts
        for p in others:
            if len(selected) >= (total_mcqs + total_crqs):
                break
            if p.concept not in selected:
                selected.append(p.concept)

        p0 = priorities[0]
        coverage_ratio = len(selected) / len(priorities) if priorities else 0.0

        return BalancedPracticeBlueprint(
            board=p0.board,
            class_level=p0.class_level,
            subject=p0.subject,
            total_marks=(total_mcqs * 1) + (total_crqs * 4) + (total_erqs * 9),
            mcq_count=total_mcqs,
            crq_count=total_crqs,
            erq_count=total_erqs,
            selected_concepts=selected,
            slo_coverage_ratio=round(coverage_ratio, 3),
            coverage_rationale=(
                f"Balanced selection across {len(selected)} unique concepts. "
                "Combines high-priority historical patterns with foundational syllabus "
                "requirements to prevent preparation blind spots."
            ),
        )
