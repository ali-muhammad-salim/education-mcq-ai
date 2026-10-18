"""
Past Paper Intelligence Engine.

Public surface:

    from services.past_paper.engine import PastPaperEngine

    engine = PastPaperEngine()
    engine.ingest_paper(text, metadata_hint={...})
    engine.classify_all()
    engine.build_semantic_map()
    engine.compute_historical_stats()
    report = engine.chapter_report("Motion", board="FBISE", subject="Physics")
"""

from services.past_paper.engine import PastPaperEngine  # noqa: F401
from services.past_paper.schemas import (  # noqa: F401
    PaperMetadata,
    ExtractedQuestion,
    QuestionClassification,
    SemanticRelationship,
    HistoricalStats,
    EvidenceLabel,
    ConceptOccurrence,
    ChapterReport,
)
