"""
Resource Compiler — Granular Compilation of Educational Materials.

Compiles targeted, chapter-wise student & teacher resources on-demand:
1. Chapter-Wise Numericals Workbook (Worked Examples, Textbook Exercises, Past Paper Numericals)
2. Book MCQs Booklet (Textbook review exercise MCQs with answer keys & explanations)
3. Past Papers Chapter-Wise MCQs (Syllabus-filtered past exam MCQs tagged by year & session)
4. Notes Revision Booklets (Core Definitions, Laws, Formulas, CRQs, ERQs, Marking Rubrics)
5. Diagram & Apparatus Labeling Worksheets (Student blank test sheets + Teacher answer keys)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CompiledNumerical(BaseModel):
    problem_number: str
    problem_type: str = "WORKED_EXAMPLE"  # "WORKED_EXAMPLE" | "EXERCISE_NUMERICAL" | "PAST_PAPER_NUMERICAL"
    statement: str
    given_data: Dict[str, str] = Field(default_factory=dict)
    to_find: List[str] = Field(default_factory=list)
    formula_used: List[str] = Field(default_factory=list)
    step_by_step_solution: List[str] = Field(default_factory=list)
    final_answer: str = ""
    unit: str = ""
    marks: Optional[float] = None
    slo_code: Optional[str] = None
    source_reference: str = ""


class CompiledMCQ(BaseModel):
    question_number: str
    stem_text: str
    options: List[str]
    correct_option_index: Optional[int] = None
    explanation: str = ""
    slo_code: Optional[str] = None
    source_type: str = "BOOK"  # "BOOK" | "PAST_PAPER" | "MODEL_PAPER"
    source_reference: str = ""
    year: Optional[int] = None
    marks: float = 1.0
    cognitive_level: str = "U"  # R | U | A


class CompiledSubjectiveQA(BaseModel):
    model_config = {"extra": "ignore"}
    question_number: str
    question_type: str = "CRQ"  # "CRQ" (Short) | "ERQ" (Long/Essay)
    command_word: Optional[str] = ""
    stem_text: str
    marks: Optional[float] = None
    model_answer: Optional[str] = ""
    marking_scheme_rubric: List[str] = Field(default_factory=list)
    slo_code: Optional[str] = None
    source_reference: str = ""


class CompiledDefinitionNote(BaseModel):
    term: str
    definition: str
    law_or_principle_statement: Optional[str] = None
    mathematical_form: Optional[str] = None
    si_unit: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    slo_code: Optional[str] = None


class CompiledDiagramLabeling(BaseModel):
    title: str
    caption: str = ""
    diagram_type: str = "DIAGRAM"  # "APPARATUS" | "CIRCUIT" | "BIOLOGICAL" | "FLOWCHART"
    labels: List[str] = Field(default_factory=list)  # Teacher master key
    blank_exercise_labels: List[str] = Field(default_factory=list)  # E.g. ["Part 1: ________", "Part 2: ________"]
    mermaid_code: Optional[str] = None
    description: str = ""
    slo_code: Optional[str] = None
    source_reference: str = ""


class CompiledChapterResourceBundle(BaseModel):
    board: str
    class_level: str
    subject: str
    chapter: str
    numericals: List[CompiledNumerical] = Field(default_factory=list)
    book_mcqs: List[CompiledMCQ] = Field(default_factory=list)
    past_paper_mcqs: List[CompiledMCQ] = Field(default_factory=list)
    definitions_and_laws: List[CompiledDefinitionNote] = Field(default_factory=list)
    crqs: List[CompiledSubjectiveQA] = Field(default_factory=list)
    erqs: List[CompiledSubjectiveQA] = Field(default_factory=list)
    diagram_labelings: List[CompiledDiagramLabeling] = Field(default_factory=list)


class ResourceCompiler:
    """
    Compiles distinct, chapter-wise pedagogical resources from the ingested knowledge store.
    """

    def __init__(self, raw_items: Optional[List[Dict[str, Any]]] = None):
        """
        Initialize with items or connect to repo/graph.
        """
        self.raw_items: List[Dict[str, Any]] = raw_items or []

    def add_item(self, item: Dict[str, Any]) -> None:
        self.raw_items.append(item)

    def compile_chapter_numericals(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        numerical_type: str = "ALL",  # "ALL" | "WORKED_EXAMPLE" | "EXERCISE_NUMERICAL" | "PAST_PAPER_NUMERICAL"
    ) -> List[CompiledNumerical]:
        results: List[CompiledNumerical] = []
        for it in self.raw_items:
            if (
                it.get("board", "").upper() == board.upper()
                and str(it.get("class_level", "")) == str(class_level)
                and it.get("subject", "").lower() == subject.lower()
                and str(it.get("chapter", "")).lower() == str(chapter).lower()
                and it.get("item_category") == "NUMERICAL"
            ):
                if numerical_type != "ALL" and it.get("problem_type") != numerical_type:
                    continue
                results.append(
                    CompiledNumerical(
                        problem_number=it.get("problem_number", ""),
                        problem_type=it.get("problem_type", "WORKED_EXAMPLE"),
                        statement=it.get("statement", ""),
                        given_data=it.get("given_data", {}),
                        to_find=it.get("to_find", []),
                        formula_used=it.get("formula_used", []),
                        step_by_step_solution=it.get("step_by_step_solution", []),
                        final_answer=it.get("final_answer", ""),
                        unit=it.get("unit", ""),
                        marks=it.get("marks"),
                        slo_code=it.get("slo_code"),
                        source_reference=it.get("source_reference", ""),
                    )
                )
        return results

    def compile_chapter_mcqs(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        source_type: str = "ALL",  # "ALL" | "BOOK" | "PAST_PAPER" | "MODEL_PAPER"
        active_slos: Optional[set[str]] = None,
    ) -> List[CompiledMCQ]:
        results: List[CompiledMCQ] = []
        for it in self.raw_items:
            if (
                it.get("board", "").upper() == board.upper()
                and str(it.get("class_level", "")) == str(class_level)
                and it.get("subject", "").lower() == subject.lower()
                and str(it.get("chapter", "")).lower() == str(chapter).lower()
                and it.get("item_category") == "MCQ"
            ):
                item_src = it.get("source_type", "BOOK")
                if source_type != "ALL" and item_src != source_type:
                    continue
                
                # Syllabus Filter: if active_slos is specified and this is a past paper MCQ,
                # ensure it belongs to an active SLO
                slo = it.get("slo_code")
                if item_src == "PAST_PAPER" and active_slos is not None:
                    if not slo or slo not in active_slos:
                        continue  # Exclude obsolete past paper questions

                results.append(
                    CompiledMCQ(
                        question_number=it.get("question_number", ""),
                        stem_text=it.get("stem_text", ""),
                        options=it.get("options", []),
                        correct_option_index=it.get("correct_option_index"),
                        explanation=it.get("explanation", ""),
                        slo_code=slo,
                        source_type=item_src,
                        source_reference=it.get("source_reference", ""),
                        year=it.get("year"),
                        marks=it.get("marks", 1.0),
                        cognitive_level=it.get("cognitive_level", "U"),
                    )
                )
        return results

    def compile_chapter_subjective_qa(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        question_type: str = "ALL",  # "ALL" | "CRQ" | "ERQ"
    ) -> List[CompiledSubjectiveQA]:
        results: List[CompiledSubjectiveQA] = []
        for it in self.raw_items:
            if (
                it.get("board", "").upper() == board.upper()
                and str(it.get("class_level", "")) == str(class_level)
                and it.get("subject", "").lower() == subject.lower()
                and str(it.get("chapter", "")).lower() == str(chapter).lower()
                and it.get("item_category") == "SUBJECTIVE"
            ):
                qtype = it.get("question_type", "CRQ")
                if question_type != "ALL" and qtype != question_type:
                    continue
                results.append(
                    CompiledSubjectiveQA(
                        question_number=it.get("question_number", ""),
                        question_type=qtype,
                        command_word=it.get("command_word", ""),
                        stem_text=it.get("stem_text", ""),
                        marks=it.get("marks"),
                        model_answer=it.get("model_answer", ""),
                        marking_scheme_rubric=it.get("marking_scheme_rubric", []),
                        slo_code=it.get("slo_code"),
                        source_reference=it.get("source_reference", ""),
                    )
                )
        return results

    def compile_chapter_definitions(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
    ) -> List[CompiledDefinitionNote]:
        results: List[CompiledDefinitionNote] = []
        for it in self.raw_items:
            if (
                it.get("board", "").upper() == board.upper()
                and str(it.get("class_level", "")) == str(class_level)
                and it.get("subject", "").lower() == subject.lower()
                and str(it.get("chapter", "")).lower() == str(chapter).lower()
                and it.get("item_category") == "DEFINITION"
            ):
                results.append(
                    CompiledDefinitionNote(
                        term=it.get("term", ""),
                        definition=it.get("definition", ""),
                        law_or_principle_statement=it.get("law_or_principle_statement"),
                        mathematical_form=it.get("mathematical_form"),
                        si_unit=it.get("si_unit"),
                        key_points=it.get("key_points", []),
                        slo_code=it.get("slo_code"),
                    )
                )
        return results

    def compile_chapter_diagram_labeling(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
    ) -> List[CompiledDiagramLabeling]:
        results: List[CompiledDiagramLabeling] = []
        for it in self.raw_items:
            if (
                it.get("board", "").upper() == board.upper()
                and str(it.get("class_level", "")) == str(class_level)
                and it.get("subject", "").lower() == subject.lower()
                and str(it.get("chapter", "")).lower() == str(chapter).lower()
                and it.get("item_category") == "DIAGRAM_LABELING"
            ):
                labels = it.get("labels", [])
                blank_labels = [f"Part {idx + 1}: ________________________" for idx in range(len(labels))]
                results.append(
                    CompiledDiagramLabeling(
                        title=it.get("title", ""),
                        caption=it.get("caption", ""),
                        diagram_type=it.get("diagram_type", "APPARATUS"),
                        labels=labels,
                        blank_exercise_labels=blank_labels,
                        mermaid_code=it.get("mermaid_code"),
                        description=it.get("description", ""),
                        slo_code=it.get("slo_code"),
                        source_reference=it.get("source_reference", ""),
                    )
                )
        return results

    def compile_chapter_bundle(
        self,
        board: str,
        class_level: str,
        subject: str,
        chapter: str,
        active_slos: Optional[set[str]] = None,
    ) -> CompiledChapterResourceBundle:
        return CompiledChapterResourceBundle(
            board=board,
            class_level=str(class_level),
            subject=subject,
            chapter=str(chapter),
            numericals=self.compile_chapter_numericals(board, class_level, subject, chapter),
            book_mcqs=self.compile_chapter_mcqs(board, class_level, subject, chapter, source_type="BOOK"),
            past_paper_mcqs=self.compile_chapter_mcqs(
                board, class_level, subject, chapter, source_type="PAST_PAPER", active_slos=active_slos
            ),
            definitions_and_laws=self.compile_chapter_definitions(board, class_level, subject, chapter),
            crqs=self.compile_chapter_subjective_qa(board, class_level, subject, chapter, question_type="CRQ"),
            erqs=self.compile_chapter_subjective_qa(board, class_level, subject, chapter, question_type="ERQ"),
            diagram_labelings=self.compile_chapter_diagram_labeling(board, class_level, subject, chapter),
        )

    # ---------------------------------------------------------------------------
    # Markdown Export Generators
    # ---------------------------------------------------------------------------

    @staticmethod
    def export_numericals_to_markdown(
        numericals: List[CompiledNumerical],
        title: str = "Chapter Numericals Workbook",
    ) -> str:
        md = [f"# {title}\n"]
        for idx, num in enumerate(numericals, 1):
            md.append(f"### Problem {idx} ({num.problem_number}) [{num.problem_type}]")
            if num.slo_code:
                md.append(f"**SLO Reference:** `{num.slo_code}` | **Source:** {num.source_reference}")
            md.append(f"\n**Problem Statement:**\n{num.statement}\n")
            if num.given_data:
                md.append("**Given Data:**")
                for k, v in num.given_data.items():
                    md.append(f"- {k} = {v}")
                md.append("")
            if num.to_find:
                md.append(f"**To Find:** {', '.join(num.to_find)}\n")
            if num.formula_used:
                md.append(f"**Formula(s):** $${', '.join(num.formula_used)}$$\n")
            if num.step_by_step_solution:
                md.append("**Step-by-Step Solution:**")
                for s in num.step_by_step_solution:
                    md.append(f"1. {s}")
                md.append("")
            md.append(f"**Final Answer:** **`{num.final_answer} {num.unit}`**\n")
            md.append("---\n")
        return "\n".join(md)

    @staticmethod
    def export_mcqs_to_markdown(
        mcqs: List[CompiledMCQ],
        title: str = "Chapter Multiple Choice Questions Bank",
    ) -> str:
        md = [f"# {title}\n"]
        for idx, mcq in enumerate(mcqs, 1):
            md.append(f"**Q{idx}. {mcq.stem_text}**")
            for o_idx, opt in enumerate(mcq.options):
                opt_letter = chr(65 + o_idx)
                is_correct = " *(Correct Answer)*" if o_idx == mcq.correct_option_index else ""
                md.append(f"- **({opt_letter})** {opt}{is_correct}")
            meta_parts = []
            if mcq.slo_code:
                meta_parts.append(f"SLO: `{mcq.slo_code}`")
            if mcq.source_reference:
                meta_parts.append(f"Source: {mcq.source_reference}")
            if mcq.cognitive_level:
                meta_parts.append(f"Cognitive: {mcq.cognitive_level}")
            if meta_parts:
                md.append(f"\n*[{' | '.join(meta_parts)}]*")
            if mcq.explanation:
                md.append(f"> **Explanation:** {mcq.explanation}")
            md.append("\n")
        return "\n".join(md)

    @staticmethod
    def export_notes_to_markdown(
        bundle: CompiledChapterResourceBundle,
    ) -> str:
        md = [f"# Comprehensive Chapter Study Notes — {bundle.chapter}\n"]
        md.append(f"**Board:** {bundle.board} | **Class:** {bundle.class_level} | **Subject:** {bundle.subject}\n")

        # 1. Definitions and Laws
        if bundle.definitions_and_laws:
            md.append("## 1. Key Terminology, Definitions & Laws\n")
            for defn in bundle.definitions_and_laws:
                md.append(f"### {defn.term}")
                md.append(f"**Definition:** {defn.definition}")
                if defn.law_or_principle_statement:
                    md.append(f"**Statement of Principle:** *\"{defn.law_or_principle_statement}\"*")
                if defn.mathematical_form:
                    md.append(f"**Formula:** $${defn.mathematical_form}$$")
                if defn.si_unit:
                    md.append(f"**SI Unit:** `{defn.si_unit}`")
                if defn.key_points:
                    md.append("**Key Characteristics:**")
                    for kp in defn.key_points:
                        md.append(f"- {kp}")
                if defn.slo_code:
                    md.append(f"*Mapped SLO: `{defn.slo_code}`*")
                md.append("\n")

        # 2. Short Answer Questions (CRQs)
        if bundle.crqs:
            md.append("## 2. Constructed Response Questions (CRQs - Short Answer)\n")
            for idx, q in enumerate(bundle.crqs, 1):
                md.append(f"**Q{idx}. {q.stem_text}** `[{q.marks or 3} Marks]`")
                if q.command_word:
                    md.append(f"*Command Word:* **{q.command_word}** | *SLO:* `{q.slo_code or 'General'}`")
                if q.model_answer:
                    md.append(f"\n**Model Answer:**\n{q.model_answer}\n")
                if q.marking_scheme_rubric:
                    md.append("**Marking Rubric:**")
                    for r in q.marking_scheme_rubric:
                        md.append(f"- {r}")
                md.append("\n---\n")

        # 3. Long Answer Questions (ERQs)
        if bundle.erqs:
            md.append("## 3. Extended Response Questions (ERQs - Long Answer / Derivations)\n")
            for idx, q in enumerate(bundle.erqs, 1):
                md.append(f"**Q{idx}. {q.stem_text}** `[{q.marks or 7} Marks]`")
                if q.model_answer:
                    md.append(f"\n**Complete Derivation / Answer:**\n{q.model_answer}\n")
                if q.marking_scheme_rubric:
                    md.append("**Marking Scheme:**")
                    for r in q.marking_scheme_rubric:
                        md.append(f"- {r}")
                md.append("\n---\n")

        return "\n".join(md)

    @staticmethod
    def export_diagram_labeling_to_markdown(
        diagrams: List[CompiledDiagramLabeling],
    ) -> str:
        md = ["# Diagram & Apparatus Labeling Practice Worksheet\n"]
        for idx, dg in enumerate(diagrams, 1):
            md.append(f"## Activity {idx}: {dg.title}")
            if dg.caption:
                md.append(f"*{dg.caption}*\n")
            if dg.mermaid_code:
                md.append(f"```mermaid\n{dg.mermaid_code}\n```\n")
            md.append("### Student Worksheet (Identify the indicated parts):")
            for blank in dg.blank_exercise_labels:
                md.append(f"- [ ] {blank}")
            md.append("\n<details><summary><b>Click to Reveal Teacher Master Key</b></summary>\n")
            for l_idx, lab in enumerate(dg.labels, 1):
                md.append(f"- **Part {l_idx}:** {lab}")
            md.append(f"\n**Functional Description:** {dg.description}")
            md.append("</details>\n\n---\n")
        return "\n".join(md)
