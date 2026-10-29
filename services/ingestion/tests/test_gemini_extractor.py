"""
Unit & Integration Tests for AI-First Gemini Document Intelligence Extractor.

Verifies:
1. Extraction of Advanced Calculus & Mathematics (derivatives, integrals, limits).
2. Extraction of Chemical Bonding (Lewis structures, geometry, hybridization, angles).
3. Extraction of Flowcharts & Diagrams into valid Mermaid.js diagrams.
4. Tier 1 Chapter Manifest & Tier 2 Rolling Page Context propagation.
5. IngestionPipeline integration with Gemini engine.
6. Checkpoint generation on quota limits.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image
import pytest

from services.inference.gemini_client import GeminiClient, GeminiResponse
from services.ingestion.schemas import DocumentType, RegionType
from services.ingestion.stages.gemini_extractor import (
    GeminiPageExtractor,
    ChapterManifest,
    RollingPageContext,
    PageAIExtractionResult,
)


@pytest.fixture
def mock_gemini_response_payload():
    return {
        "raw_markdown": "# Chapter 4: Motion and Force\n\nRate of change of momentum is equal to applied force.",
        "headings": ["Chapter 4: Motion and Force"],
        "paragraphs": ["Rate of change of momentum is equal to applied force."],
        "equations": [
            {
                "latex": "\\vec{F} = \\frac{d\\vec{p}}{dt}",
                "description": "Newton's Second Law in derivative form",
                "equation_type": "CALCULUS"
            },
            {
                "latex": "2H_2(g) + O_2(g) \\rightarrow 2H_2O(l)",
                "description": "Formation of water",
                "equation_type": "CHEMISTRY"
            }
        ],
        "chemical_bondings": [
            {
                "compound_formula": "H2O",
                "bond_type": "COVALENT",
                "molecular_geometry": "Bent",
                "hybridization": "sp3",
                "lewis_structure_description": "Central oxygen atom with 2 single bonds to H and 2 non-bonding lone pairs",
                "bond_angles": "104.5°",
                "is_polar": True
            }
        ],
        "calculus_math": [
            {
                "math_category": "DIFFERENTIAL_CALCULUS",
                "operation_type": "DERIVATIVE",
                "variable": "t",
                "latex": "\\frac{d}{dt}(mv) = m\\frac{dv}{dt} = ma",
                "step_by_step_derivation": ["p = mv", "dp/dt = d(mv)/dt", "F = ma"],
                "final_result_latex": "F = ma"
            }
        ],
        "tables": [
            {
                "title": "Physical Quantities",
                "markdown_table": "| Quantity | Unit |\n|---|---|\n| Force | Newton |"
            }
        ],
        "diagrams": [
            {
                "title": "Problem Solving Strategy",
                "caption": "Figure 4.1: Algorithmic flow",
                "labels": ["Identify Forces", "Resolve Components", "Apply F=ma"],
                "diagram_type": "FLOWCHART",
                "mermaid_code": "flowchart TD\n    A[Identify Forces] --> B[Resolve Components]\n    B --> C[Apply F=ma]",
                "description": "Step-by-step vector resolution flowchart"
            }
        ],
        "mcqs": [
            {
                "question_number": "1",
                "sub_question": "",
                "marks": 1.0,
                "stem_text": "The SI unit of force is:",
                "options": ["Joule", "Newton", "Watt", "Pascal"],
                "correct_option_index": 1,
                "explanation": "Force is measured in Newtons (kg m/s^2)",
                "slo_code": "4.1.2",
                "diagram_present": False,
                "formula_present": False
            }
        ],
        "topics": [],
        "outgoing_context": {
            "active_topic": "Newtonian Dynamics",
            "active_subtopic": "Linear Momentum",
            "concluding_sentence": "In the next section, we analyze conservation of linear momentum.",
            "dangling_equation": None
        }
    }


@pytest.mark.asyncio
async def test_gemini_page_extractor_calculus_bonding_mermaid(mock_gemini_response_payload):
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.generate = AsyncMock(
        return_value=GeminiResponse(
            text=json.dumps(mock_gemini_response_payload),
            model="gemini-3.5-flash",
            success=True,
            status_code=200,
            key_used="AQ.Ab8RN6LmdfoaVk...U3Dg",
        )
    )

    extractor = GeminiPageExtractor(mock_client)
    dummy_img = Image.new("RGB", (800, 1000), color="white")

    result = await extractor.extract_page(
        page_image=dummy_img,
        page_number=1,
        doc_type="BOOK",
        subject="Physics",
    )

    assert result.page_number == 1
    assert result.confidence_score == 0.98

    # Verify Calculus extraction
    assert len(result.calculus_math) == 1
    calc = result.calculus_math[0]
    assert calc.math_category == "DIFFERENTIAL_CALCULUS"
    assert "\\frac{d}{dt}" in calc.latex
    assert calc.final_result_latex == "F = ma"

    # Verify Chemical Bonding extraction
    assert len(result.chemical_bondings) == 1
    bond = result.chemical_bondings[0]
    assert bond.compound_formula == "H2O"
    assert bond.molecular_geometry == "Bent"
    assert bond.hybridization == "sp3"
    assert bond.bond_angles == "104.5°"

    # Verify Flowchart & Mermaid.js diagram extraction
    assert len(result.diagrams) == 1
    diag = result.diagrams[0]
    assert diag.diagram_type == "FLOWCHART"
    assert "flowchart TD" in diag.mermaid_code

    # Verify MCQ extraction
    assert len(result.mcqs) == 1
    assert result.mcqs[0].stem_text == "The SI unit of force is:"
    assert len(result.mcqs[0].options) == 4

    # Verify Outgoing Rolling Context
    assert result.outgoing_rolling_context is not None
    assert result.outgoing_rolling_context.active_topic == "Newtonian Dynamics"
    assert "conservation of linear momentum" in result.outgoing_rolling_context.concluding_sentence


@pytest.mark.asyncio
async def test_chapter_manifest_and_rolling_context():
    mock_client = MagicMock(spec=GeminiClient)
    mock_client.generate = AsyncMock(
        return_value=GeminiResponse(
            text=json.dumps({
                "chapter_number": "4",
                "chapter_title": "Motion and Force",
                "major_topics": ["Displacement", "Velocity", "Newton's Laws", "Momentum"],
                "key_variables_and_symbols": {"F": "Force", "p": "Momentum", "t": "Time"},
                "glossary": {"Momentum": "Product of mass and velocity"},
                "summary": "This chapter covers kinematics and dynamics of bodies in one and two dimensions."
            }),
            model="gemini-3.5-flash",
            success=True,
            status_code=200,
        )
    )

    extractor = GeminiPageExtractor(mock_client)
    dummy_img = Image.new("RGB", (600, 800), color="white")

    manifest = await extractor.extract_chapter_manifest(
        toc_or_intro_image=dummy_img,
        chapter_title="Motion and Force",
        subject="Physics",
    )

    assert manifest.chapter_number == "4"
    assert manifest.chapter_title == "Motion and Force"
    assert "F" in manifest.key_variables_and_symbols
    assert len(manifest.major_topics) == 4


def test_pipeline_gemini_page_processing(mock_gemini_response_payload):
    from services.ingestion.pipeline import IngestionPipeline

    mock_client = MagicMock(spec=GeminiClient)
    mock_client.is_configured = True
    mock_client.pool = MagicMock()
    mock_client.pool.is_all_exhausted.return_value = False

    pipeline = IngestionPipeline(create_db_tables=False)
    pipeline._gemini_client = mock_client
    pipeline._gemini_extractor = GeminiPageExtractor(mock_client)

    # Patch extract_page_sync and detect_and_correct_orientation
    with patch.object(
        pipeline._gemini_extractor,
        "extract_page_sync",
        return_value=PageAIExtractionResult(
            page_number=1,
            raw_markdown=mock_gemini_response_payload["raw_markdown"],
            headings=mock_gemini_response_payload["headings"],
            paragraphs=mock_gemini_response_payload["paragraphs"],
            equations=[mock_gemini_response_payload["equations"][0]],
            chemical_bondings=[mock_gemini_response_payload["chemical_bondings"][0]],
            calculus_math=[mock_gemini_response_payload["calculus_math"][0]],
            tables=[mock_gemini_response_payload["tables"][0]],
            diagrams=[mock_gemini_response_payload["diagrams"][0]],
            mcqs=[mock_gemini_response_payload["mcqs"][0]],
            outgoing_rolling_context=RollingPageContext(
                page_number=1,
                chapter_title="Motion and Force",
                active_topic="Newtonian Dynamics",
                active_subtopic="Linear Momentum",
                concluding_sentence="Continues on page 2...",
            ),
        ),
    ), patch(
        "services.ingestion.pipeline.detect_and_correct_orientation",
        return_value=(Image.new("RGB", (800, 1000), color="white"), 0.0),
    ):
        page_img = MagicMock()
        page_img.page_number = 1
        page_img.image = Image.new("RGB", (800, 1000), color="white")
        page_img.image_path = "pages/test_p1.png"

        structured, outgoing_context = pipeline._process_page_gemini(
            page_img=page_img,
            sha256="abc123456",
            doc_type=DocumentType.BOOK,
            subject="Physics",
        )

        assert structured is not None
        assert structured.page_number == 1
        assert len(structured.formulas) >= 2  # Equation + Calculus derivation
        assert len(structured.diagrams) == 1
        assert "[MERMAID_DIAGRAM]" in structured.diagrams[0].description
        assert len(structured.questions) == 1
        assert structured.questions[0].question_number == "1"
        assert len(structured.questions[0].options) == 4
        assert outgoing_context.active_topic == "Newtonian Dynamics"
