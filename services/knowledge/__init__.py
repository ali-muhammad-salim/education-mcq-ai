"""
Multi-Board Educational Knowledge Layer.

Public surface:

    from services.knowledge.retrieval import retrieve, retrieve_sync
    from services.knowledge.board_registry import BoardRegistry
    from services.knowledge.schemas import RetrievalResult, SourcePriority

    results = retrieve_sync(
        query="Generate MCQs about acceleration for Class 10 Physics",
        board="FBISE",
        class_level="10",
        subject="Physics",
        concept="Acceleration",
    )
"""

from services.knowledge.schemas import (  # noqa: F401
    SourcePriority,
    EvidenceSource,
    RetrievalResult,
    BoardProfile,
    CurriculumVersion,
    CurriculumItem,
    TextbookMapping,
)
from services.knowledge.board_registry import BoardRegistry  # noqa: F401
from services.knowledge.retrieval import retrieve, retrieve_sync  # noqa: F401
