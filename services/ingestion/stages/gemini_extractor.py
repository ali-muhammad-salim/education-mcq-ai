"""
AI-First Document Intelligence Extractor powered by Google Gemini Vision.

Provides direct multimodal page extraction for educational materials:
- Syllabi (Topics, Subtopics, SLOs, Cognitive Levels R/U/A)
- Textbooks (Chapters, Explanations, Worked Examples, Diagrams, Tables, Equations)
- Past Papers & Model Papers (MCQs, CRQs, ERQs, Numerical Problems, Subparts, Marks)
- Advanced Science & Mathematics:
  * Calculus: Derivatives (Leibniz/Lagrange), Integrals (definite/indefinite), Limits, Series
  * Chemistry: Balanced equations, state symbols, Chemical Bonding (Lewis structures, geometry, hybridization)
  * Flowcharts & System Diagrams: Converted into structured Mermaid.js diagrams
- Hierarchical Rolling Chapter Context:
  * Tier 1: Chapter Manifest (macro outline, key symbols, topic roadmap)
  * Tier 2: Rolling Page Context (preceding page context passed to ensure seamless cross-page continuity)
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import re
import logging
from typing import Any, Dict, List, Optional
from PIL import Image
from pydantic import BaseModel, Field

from services.inference.gemini_client import GeminiClient, GeminiResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Structured Schemas for Gemini Output
# ---------------------------------------------------------------------------

class SafeGeminiBaseModel(BaseModel):
    model_config = {"extra": "ignore"}


class ExtractedSLOItem(SafeGeminiBaseModel):
    code: str = Field(default="", description="SLO code e.g. 1.1.1 or 2.3.4")
    description: str = Field(default="", description="Exact learning outcome wording")
    cognitive_level: str = Field(default="U", description="R (Recall), U (Understanding), A (Application)")


class ExtractedSubtopicItem(SafeGeminiBaseModel):
    subtopic_number: str = ""
    name: str = ""
    slos: List[ExtractedSLOItem] = Field(default_factory=list)


class ExtractedTopicItem(SafeGeminiBaseModel):
    topic_number: str = ""
    name: str = ""
    subtopics: List[ExtractedSubtopicItem] = Field(default_factory=list)


class ExtractedMCQItem(SafeGeminiBaseModel):
    question_number: str = ""
    sub_question: Optional[str] = ""
    marks: Optional[float] = 1.0
    stem_text: str = ""
    options: List[str] = Field(default_factory=list, description="Exact options A, B, C, D in order")
    correct_option_index: Optional[int] = Field(default=None, description="0 for A, 1 for B, 2 for C, 3 for D")
    explanation: Optional[str] = ""
    slo_code: Optional[str] = None
    diagram_present: bool = False
    formula_present: bool = False


class ExtractedEquationItem(SafeGeminiBaseModel):
    latex: str = Field(default="", description="Exact mathematical or chemical formula in LaTeX")
    description: str = ""
    equation_type: str = "MATH"  # "MATH" | "CHEMISTRY" | "CALCULUS" | "PHYSICS"


class ExtractedChemicalBondingItem(SafeGeminiBaseModel):
    """Chemical bonding and molecular structure details."""
    compound_formula: str = ""
    bond_type: str = "COVALENT"  # "COVALENT", "IONIC", "COORDINATE_DATIVE", "HYDROGEN", "METALLIC"
    molecular_geometry: str = ""  # e.g., "Linear", "Bent", "Trigonal Planar", "Tetrahedral", "Octahedral"
    hybridization: str = ""        # e.g., "sp", "sp2", "sp3", "sp3d", "sp3d2"
    lewis_structure_description: str = ""  # description of lone pairs, bonding pairs, central atom
    bond_angles: str = ""         # e.g., "104.5°", "109.5°", "120°"
    is_polar: bool = False


class ExtractedCalculusMathItem(SafeGeminiBaseModel):
    """Calculus, advanced trigonometry, and analytical mathematics."""
    math_category: str = "CALCULUS"  # "DIFFERENTIAL_CALCULUS", "INTEGRAL_CALCULUS", "LIMITS", "TRIGONOMETRY", "SERIES", "VECTORS", "MATRICES"
    operation_type: str = ""         # "DERIVATIVE", "DEFINITE_INTEGRAL", "INDEFINITE_INTEGRAL", "LIMIT", "TRIG_IDENTITY"
    variable: str = "x"
    latex: str = ""
    step_by_step_derivation: List[str] = Field(default_factory=list)
    final_result_latex: str = ""


class ExtractedTableItem(SafeGeminiBaseModel):
    title: str = ""
    markdown_table: str = ""


class ExtractedDiagramItem(SafeGeminiBaseModel):
    title: str = ""
    caption: str = ""
    labels: List[str] = Field(default_factory=list)
    diagram_type: str = "DIAGRAM"  # "FLOWCHART", "CIRCUIT", "GRAPH", "APPARATUS", "BIOLOGICAL", "GEOMETRIC"
    mermaid_code: Optional[str] = None  # Mermaid.js representation if it is a flowchart, graph, or state diagram
    description: str = ""
    is_labeling_exercise: bool = False  # True if suitable for diagram labeling practice
    unlabeled_parts: List[str] = Field(default_factory=list, description="Parts/callouts to blank out for student testing")


class ExtractedNumericalItem(SafeGeminiBaseModel):
    """
    Extracted physics/chemistry/math numerical problem.
    Distinguishes worked examples, exercise problems, and past paper numericals.
    """
    problem_number: str = ""
    problem_type: str = "WORKED_EXAMPLE"  # "WORKED_EXAMPLE", "EXERCISE_NUMERICAL", "PAST_PAPER_NUMERICAL"
    statement: str = ""
    given_data: Dict[str, str] = Field(default_factory=dict, description="e.g. {'mass (m)': '5 kg', 'initial velocity (vi)': '0 m/s'}")
    to_find: List[str] = Field(default_factory=list, description="e.g. ['Final velocity (vf)', 'Distance (S)']")
    formula_used: List[str] = Field(default_factory=list, description="LaTeX formulas e.g. ['2as = v_f^2 - v_i^2']")
    step_by_step_solution: List[str] = Field(default_factory=list)
    final_answer: Optional[str] = ""
    unit: Optional[str] = ""
    marks: Optional[float] = None
    slo_code: Optional[str] = None


class ExtractedSubjectiveQuestionItem(SafeGeminiBaseModel):
    """
    Extracted CRQs (Constructed Response / Short Answer Questions)
    and ERQs (Extended Response / Long Answer Questions).
    """
    question_number: str = ""
    sub_question: Optional[str] = ""
    question_type: str = "CRQ"  # "CRQ" | "ERQ"
    stem_text: str = ""
    command_word: Optional[str] = ""  # "State", "Explain", "Differentiate", "Derive", "Calculate", "Describe"
    marks: Optional[float] = None
    model_answer: Optional[str] = ""
    marking_scheme_rubric: List[str] = Field(default_factory=list, description="Point-wise marking criteria/rubric")
    slo_code: Optional[str] = None
    diagram_required: bool = False


class ExtractedNoteDefinitionItem(SafeGeminiBaseModel):
    """
    Extracted core definitions, laws, principles, and key revision notes.
    """
    term: str = ""
    definition: str = ""
    law_or_principle_statement: Optional[str] = None
    mathematical_form: Optional[str] = None
    si_unit: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    slo_code: Optional[str] = None



class ChapterManifest(BaseModel):
    """Macro-level outline and glossary for an entire textbook chapter."""
    chapter_number: str = ""
    chapter_title: str = ""
    subject: str = ""
    major_topics: List[str] = Field(default_factory=list)
    key_variables_and_symbols: Dict[str, str] = Field(default_factory=dict)
    glossary: Dict[str, str] = Field(default_factory=dict)
    summary: str = ""


class RollingPageContext(BaseModel):
    """Context carried across consecutive pages to prevent boundary truncation."""
    model_config = {"extra": "ignore"}
    page_number: int = 0
    chapter_title: Optional[str] = ""
    active_topic: Optional[str] = ""
    active_subtopic: Optional[str] = ""
    concluding_sentence: Optional[str] = ""
    dangling_equation: Optional[str] = None
    active_table_or_list: Optional[str] = None


class PageAIExtractionResult(BaseModel):
    page_number: int
    raw_markdown: str
    headings: List[str] = Field(default_factory=list)
    paragraphs: List[str] = Field(default_factory=list)
    equations: List[ExtractedEquationItem] = Field(default_factory=list)
    chemical_bondings: List[ExtractedChemicalBondingItem] = Field(default_factory=list)
    calculus_math: List[ExtractedCalculusMathItem] = Field(default_factory=list)
    tables: List[ExtractedTableItem] = Field(default_factory=list)
    diagrams: List[ExtractedDiagramItem] = Field(default_factory=list)
    mcqs: List[ExtractedMCQItem] = Field(default_factory=list)
    numericals: List[ExtractedNumericalItem] = Field(default_factory=list)
    subjective_questions: List[ExtractedSubjectiveQuestionItem] = Field(default_factory=list)
    notes_definitions: List[ExtractedNoteDefinitionItem] = Field(default_factory=list)
    topics: List[ExtractedTopicItem] = Field(default_factory=list)
    outgoing_rolling_context: Optional[RollingPageContext] = None
    confidence_score: float = 0.95
    extraction_provider: str = "google_gemini"
    verification_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Gemini Page Extractor Class
# ---------------------------------------------------------------------------

class GeminiPageExtractor:
    """
    AI-First Page Extractor utilizing Google Gemini Vision with Multi-Key Rotation.
    """

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def _image_to_jpeg_bytes(self, image: Image.Image) -> bytes:
        buf = io.BytesIO()
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        image.save(buf, format="JPEG", quality=85)
        return buf.getvalue()

    async def extract_chapter_manifest(
        self,
        toc_or_intro_image: Image.Image,
        chapter_title: str,
        subject: str = "Physics",
    ) -> ChapterManifest:
        """
        Tier 1 Context: Extract a high-level Chapter Manifest from chapter intro/TOC page.
        """
        image_bytes = self._image_to_jpeg_bytes(toc_or_intro_image)


        prompt = f"""
You are creating a Chapter Manifest for the chapter: "{chapter_title}" in {subject}.
Analyze this chapter overview/introductory page image.

Extract:
1. "chapter_number": string
2. "chapter_title": string
3. "major_topics": list of main topic titles
4. "key_variables_and_symbols": dictionary mapping symbols to their physical meaning (e.g., {{"v_i": "initial velocity", "a": "acceleration"}})
5. "glossary": key terminology defined or used in this chapter
6. "summary": 2-3 sentence overview of what this chapter covers

Return strictly a valid JSON object matching the ChapterManifest schema.
"""
        response = await self.client.generate(
            prompt=prompt,
            image_bytes=image_bytes,
            temperature=0.1,
        )

        if not response.success:
            return ChapterManifest(
                chapter_title=chapter_title,
                subject=subject,
                summary=f"Manifest extraction skipped ({response.error})",
            )

        parsed = response.try_as_json()
        if not parsed:
            # Fallback cleaning
            cleaned = response.text.strip().removeprefix("```json").removesuffix("```").strip()
            try:
                parsed = json.loads(cleaned)
            except Exception:
                return ChapterManifest(chapter_title=chapter_title, subject=subject)

        return ChapterManifest(
            chapter_number=parsed.get("chapter_number", ""),
            chapter_title=parsed.get("chapter_title", chapter_title),
            subject=subject,
            major_topics=parsed.get("major_topics", []),
            key_variables_and_symbols=parsed.get("key_variables_and_symbols", {}),
            glossary=parsed.get("glossary", {}),
            summary=parsed.get("summary", ""),
        )

    async def extract_page(
        self,
        page_image: Image.Image,
        page_number: int,
        doc_type: str = "BOOK",  # "BOOK", "SYLLABUS", "PAST_PAPER"
        subject: str = "Physics",
        chapter_manifest: Optional[ChapterManifest] = None,
        rolling_context: Optional[RollingPageContext] = None,
        auxiliary_text: str = "",
    ) -> PageAIExtractionResult:
        """
        Extract page content directly from high-resolution image using Gemini Vision,
        informed by the Chapter Manifest (macro outline) and Rolling Context from page N-1.
        """
        image_bytes = self._image_to_jpeg_bytes(page_image)

        system_instruction = (
            "You are a principal document intelligence researcher and STEM educational specialist "
            "(Aga Khan University Examination Board, Federal Board, and Cambridge). "
            "Your highest priority is ACCURACY, FIDELITY, and COMPLETENESS.\n"
            "- Mathematical formulas: Preserve exact LaTeX notation ($$...$$ and $...$). Never flatten fractions or drop exponents.\n"
            "- Calculus: Properly preserve derivatives (\\frac{d^n y}{dx^n}), integrals (\\int_a^b), limits (\\lim_{x \\to a}), and series.\n"
            "- Chemistry: Balanced equations with state symbols (s, l, g, aq) and reaction conditions over arrows.\n"
            "- Chemical Bonding: Extract Lewis structures, molecular geometry (VSEPR), hybridization (sp, sp2, sp3), bond angles, and polarity.\n"
            "- Flowcharts: Output valid Mermaid.js syntax (flowchart TD / graph TD) with exact nodes and branch conditions.\n"
            "- Tables: Clean Markdown tables.\n"
            "- Multi-choice & past paper questions: Exact stem, options A-D, marks, and explanations."
        )

        manifest_context_str = ""
        if chapter_manifest:
            manifest_context_str = (
                f"\n--- CHAPTER MANIFEST (MACRO OUTLINE) ---\n"
                f"Chapter: {chapter_manifest.chapter_number} - {chapter_manifest.chapter_title}\n"
                f"Subject: {chapter_manifest.subject}\n"
                f"Symbols Glossary: {json.dumps(chapter_manifest.key_variables_and_symbols)}\n"
            )

        rolling_context_str = ""
        if rolling_context:
            rolling_context_str = (
                f"\n--- PRECEDING PAGE CONTEXT (PAGE {rolling_context.page_number}) ---\n"
                f"Active Topic: {rolling_context.active_topic}\n"
                f"Active Subtopic: {rolling_context.active_subtopic}\n"
                f"Preceding Concluding Sentence: {rolling_context.concluding_sentence}\n"
            )
            if rolling_context.dangling_equation:
                rolling_context_str += f"Dangling equation continuing from previous page: {rolling_context.dangling_equation}\n"

        prompt = f"""
Analyze this high-resolution page (Page {page_number}) of type: {doc_type} ({subject}).
{manifest_context_str}
{rolling_context_str}

Extract everything on this page with maximum fidelity. Output strictly a valid JSON object matching this structure:
{{
  "raw_markdown": "Full page transcript in clean Markdown preserving headings and flow",
  "headings": ["Heading 1", "Heading 2"],
  "paragraphs": ["Paragraph 1", "Paragraph 2"],
  "equations": [
    {{
      "latex": "\\\\frac{{dy}}{{dx}} = 3x^2 + 2x",
      "description": "Derivative of polynomial function",
      "equation_type": "CALCULUS"
    }}
  ],
  "chemical_bondings": [
    {{
      "compound_formula": "H2O",
      "bond_type": "COVALENT",
      "molecular_geometry": "Bent",
      "hybridization": "sp3",
      "lewis_structure_description": "Central O with 2 single bonds to H and 2 lone pairs",
      "bond_angles": "104.5°",
      "is_polar": true
    }}
  ],
  "calculus_math": [
    {{
      "math_category": "INTEGRAL_CALCULUS",
      "operation_type": "DEFINITE_INTEGRAL",
      "variable": "x",
      "latex": "\\\\int_{{0}}^{{\\\\pi}} \\\\sin(x) dx",
      "step_by_step_derivation": ["[-\\\\cos(x)]_{{0}}^{{\\\\pi}}", "-\\\\cos(\\\\pi) - (-\\\\cos(0))", "1 + 1 = 2"],
      "final_result_latex": "2"
    }}
  ],
  "tables": [
    {{
      "title": "Table Title",
      "markdown_table": "| Col 1 | Col 2 |\\n|---|---|\\n| Val 1 | Val 2 |"
    }}
  ],
  "diagrams": [
    {{
      "title": "Diagram / Flowchart Title",
      "caption": "Figure caption",
      "labels": ["Node A", "Node B"],
      "diagram_type": "FLOWCHART",
      "mermaid_code": "flowchart TD\\n    A[Start] --> B{{Condition}}\\n    B -->|Yes| C[Action 1]\\n    B -->|No| D[Action 2]",
      "description": "Detailed explanation of the visual or apparatus"
    }}
  ],
  "mcqs": [
    {{
      "question_number": "1",
      "sub_question": "a",
      "marks": 1.0,
      "stem_text": "Exact question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_option_index": 0,
      "explanation": "Why option A is correct",
      "slo_code": "2.1.3",
      "diagram_present": false,
      "formula_present": true
    }}
  ],
  "numericals": [
    {{
      "problem_number": "Example 2.3 / Numerical 4",
      "problem_type": "WORKED_EXAMPLE",
      "statement": "A car accelerates uniformly from rest to 20 m/s in 5 seconds. Find its acceleration.",
      "given_data": {{"initial_velocity_vi": "0 m/s", "final_velocity_vf": "20 m/s", "time_t": "5 s"}},
      "to_find": ["acceleration_a"],
      "formula_used": ["a = \\\\frac{{v_f - v_i}}{{t}}"],
      "step_by_step_solution": ["a = (20 - 0) / 5", "a = 4 m/s^2"],
      "final_answer": "4",
      "unit": "m/s^2",
      "marks": 3.0,
      "slo_code": "2.2.1"
    }}
  ],
  "subjective_questions": [
    {{
      "question_number": "Q3",
      "sub_question": "b",
      "question_type": "CRQ",
      "stem_text": "Differentiate between scalar and vector quantities with two examples each.",
      "command_word": "Differentiate",
      "marks": 4.0,
      "model_answer": "Scalars have only magnitude (e.g. speed, mass), whereas vectors have both magnitude and direction (e.g. velocity, force).",
      "marking_scheme_rubric": ["1 mark definition of scalar", "1 mark scalar examples", "1 mark definition of vector", "1 mark vector examples"],
      "slo_code": "2.1.2",
      "diagram_required": false
    }}
  ],
  "notes_definitions": [
    {{
      "term": "Inertia",
      "definition": "The property of a body due to which it resists any change in its state of rest or uniform motion.",
      "law_or_principle_statement": "Newton's First Law of Motion",
      "mathematical_form": null,
      "si_unit": null,
      "key_points": ["Directly proportional to mass of the body", "Qualitative measure given by mass"],
      "slo_code": "3.1.1"
    }}
  ],
  "topics": [
    {{
      "topic_number": "1",
      "name": "Topic Name",
      "subtopics": [
        {{
          "subtopic_number": "1.1",
          "name": "Subtopic Name",
          "slos": [
            {{
              "code": "1.1.1",
              "description": "Exact SLO wording",
              "cognitive_level": "U"
            }}
          ]
        }}
      ]
    }}
  ],
  "outgoing_context": {{
    "active_topic": "Current main topic being discussed at the bottom of this page",
    "active_subtopic": "Current subtopic",
    "concluding_sentence": "The last 1-2 sentences at the bottom of this page (to continue smoothly onto page {page_number + 1})",
    "dangling_equation": "Any formula or derivation step left incomplete at the bottom of the page (or null if complete)"
  }}
}}
"""

        response: GeminiResponse = await self.client.generate(
            prompt=prompt,
            system_instruction=system_instruction,
            image_bytes=image_bytes,
            image_mime_type="image/jpeg",
            temperature=0.1,  # Maximum accuracy and determinism
        )

        if not response.success:
            logger.warning("Gemini extraction failed on page %d: %s", page_number, response.error)
            return PageAIExtractionResult(
                page_number=page_number,
                raw_markdown=auxiliary_text or "",
                confidence_score=0.0,
                extraction_provider="failed",
                verification_notes=f"Extraction failed: {response.error}",
            )

        # Parse JSON
        parsed = response.try_as_json()
        if not parsed:
            cleaned_text = response.text.strip()
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()
            try:
                parsed = json.loads(cleaned_text)
            except Exception:
                # Auto-heal invalid LaTeX backslashes inside JSON string literals
                try:
                    fixed_text = re.sub(r'\\(?![/u"\\bfnrt])', r'\\\\', cleaned_text)
                    parsed = json.loads(fixed_text)
                except Exception as e:
                    logger.warning("Failed to parse Gemini JSON on page %d: %s", page_number, e)
                    return PageAIExtractionResult(
                        page_number=page_number,
                        raw_markdown=response.text,
                        confidence_score=0.7,
                        extraction_provider="google_gemini_raw",
                        verification_notes="Raw response captured; JSON parsing required sanitization.",
                    )

        # Prepare outgoing rolling context for page N+1
        outgoing_ctx_raw = parsed.get("outgoing_context") or {}
        outgoing_ctx = RollingPageContext(
            page_number=page_number,
            chapter_title=chapter_manifest.chapter_title if chapter_manifest else "",
            active_topic=outgoing_ctx_raw.get("active_topic") or "",
            active_subtopic=outgoing_ctx_raw.get("active_subtopic") or "",
            concluding_sentence=outgoing_ctx_raw.get("concluding_sentence") or "",
            dangling_equation=outgoing_ctx_raw.get("dangling_equation"),
        )

        return PageAIExtractionResult(
            page_number=page_number,
            raw_markdown=parsed.get("raw_markdown", ""),
            headings=parsed.get("headings", []),
            paragraphs=parsed.get("paragraphs", []),
            equations=[ExtractedEquationItem(**eq) for eq in parsed.get("equations", [])],
            chemical_bondings=[
                ExtractedChemicalBondingItem(**cb) for cb in parsed.get("chemical_bondings", [])
            ],
            calculus_math=[
                ExtractedCalculusMathItem(**cm) for cm in parsed.get("calculus_math", [])
            ],
            tables=[ExtractedTableItem(**tb) for tb in parsed.get("tables", [])],
            diagrams=[ExtractedDiagramItem(**dg) for dg in parsed.get("diagrams", [])],
            mcqs=[ExtractedMCQItem(**mq) for mq in parsed.get("mcqs", [])],
            numericals=[ExtractedNumericalItem(**nm) for nm in parsed.get("numericals", [])],
            subjective_questions=[
                ExtractedSubjectiveQuestionItem(**sq) for sq in parsed.get("subjective_questions", [])
            ],
            notes_definitions=[
                ExtractedNoteDefinitionItem(**nd) for nd in parsed.get("notes_definitions", [])
            ],
            topics=[ExtractedTopicItem(**tp) for tp in parsed.get("topics", [])],
            outgoing_rolling_context=outgoing_ctx,
            confidence_score=0.98,
            extraction_provider="google_gemini",
            verification_notes=f"Extracted via Gemini Vision model={response.model} key={response.key_used}",
        )

    def extract_page_sync(
        self,
        page_image: Image.Image,
        page_number: int,
        doc_type: str = "BOOK",
        subject: str = "Physics",
        chapter_manifest: Optional[ChapterManifest] = None,
        rolling_context: Optional[RollingPageContext] = None,
        auxiliary_text: str = "",
    ) -> PageAIExtractionResult:
        """Synchronous wrapper for extract_page."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    return pool.submit(
                        asyncio.run,
                        self.extract_page(
                            page_image,
                            page_number,
                            doc_type,
                            subject,
                            chapter_manifest,
                            rolling_context,
                            auxiliary_text,
                        ),
                    ).result()
        except RuntimeError:
            pass
        return asyncio.run(
            self.extract_page(
                page_image,
                page_number,
                doc_type,
                subject,
                chapter_manifest,
                rolling_context,
                auxiliary_text,
            )
        )
