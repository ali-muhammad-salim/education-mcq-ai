import pytest
from unittest.mock import MagicMock
from services.past_paper.engine import PastPaperEngine
from services.past_paper.schemas import ExtractedQuestion, PaperMetadata, ClassifiedField
from services.past_paper.question_classifier import classify_question, set_router_factory

class MockSession:
    def __init__(self, rows):
        self.rows = rows

    def execute(self, query, params=None):
        mock_result = MagicMock()
        # Ensure we return the rows configured
        if "SELECT sv.id" in str(query):
            mock_result.fetchall.return_value = self.rows.get("version", [])
        elif "SELECT s.id, s.code" in str(query):
            mock_result.fetchall.return_value = self.rows.get("slos", [])
        else:
            mock_result.fetchall.return_value = []
        return mock_result

class MockRepo:
    def __init__(self, rows):
        self.rows = rows

    def _SessionFactory(self):
        class ContextManager:
            def __init__(self, rows):
                self.session = MockSession(rows)
            def __enter__(self):
                return self.session
            def __exit__(self, exc_type, exc_val, exc_tb):
                pass
        return ContextManager(self.rows)

class MockRouter:
    def __init__(self, generate_resp, embeddings):
        self.generate_resp = generate_resp
        self.embeddings = embeddings

    def embed(self, texts):
        mock_resp = MagicMock()
        mock_resp.success = True
        mock_resp.embeddings = self.embeddings
        return mock_resp

    def generate(self, prompt, **kwargs):
        mock_resp = MagicMock()
        mock_resp.success = True
        mock_resp.text = self.generate_resp
        return mock_resp

def test_rag_classification_engine_integration():
    db_rows = {
        "version": [("v1", 2020, 2030)],
        "slos": [
            ("slo1", "1.1.1", "Understand vector forces", "t1", "Forces", 0.95),
            ("slo2", "1.1.2", "Calculate acceleration", "t1", "Forces", 0.8)
        ]
    }
    repo = MockRepo(db_rows)

    # Mock the LLM JSON response
    llm_json = """
    {
      "slo_id": {"value": "slo2", "confidence": 0.9},
      "topic_id": {"value": "t1", "confidence": 0.9},
      "command_word": {"value": "Calculate", "confidence": 1.0},
      "chapter": {"value": "Motion", "confidence": 0.8},
      "topic": {"value": "Forces", "confidence": 0.8},
      "concept": {"value": "Acceleration", "confidence": 0.8},
      "learning_objective": {"value": "Calculate acceleration", "confidence": 0.9},
      "question_type": {"value": "NUMERICAL", "confidence": 1.0},
      "difficulty": {"value": "MEDIUM", "confidence": 0.8},
      "cognitive_level": {"value": "APPLY", "confidence": 0.8},
      "numerical_or_conceptual": {"value": "NUMERICAL", "confidence": 0.9},
      "formula_based": true,
      "diagram_based": false,
      "graph_based": false,
      "equation_based": true
    }
    """
    router = MockRouter(llm_json, [[0.1] * 768])
    set_router_factory(lambda: router)

    engine = PastPaperEngine()
    engine.ingest_paper(
        text="Q1. Calculate the acceleration.",
        metadata_hint={"board": "FBISE", "year": "2025", "subject": "Physics", "class_level": "10"}
    )
    
    # Run classify
    classified_count = engine.classify_all(use_llm=True, repo=repo)
    
    assert classified_count == 1
    
    # Check that classification assigned the RAG IDs properly
    classifications = engine.store.all_classifications()
    assert len(classifications) == 1
    
    cls = list(classifications.values())[0]
    
    assert cls.classified_by == "LLM"
    assert cls.slo_id.value == "slo2"
    assert cls.topic_id.value == "t1"
    assert cls.command_word.value == "Calculate"
    assert cls.cognitive_level.value == "APPLY"
    assert cls.needs_review == []

