"""
Unit tests for ResourceCompiler — Chapter-wise granular resource compilation.
"""

import pytest
from services.knowledge.resource_compiler import (
    ResourceCompiler,
    CompiledNumerical,
    CompiledMCQ,
    CompiledSubjectiveQA,
    CompiledDefinitionNote,
    CompiledDiagramLabeling,
)


@pytest.fixture
def sample_items():
    return [
        # Numerical - Worked Example
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "NUMERICAL",
            "problem_number": "Example 2.1",
            "problem_type": "WORKED_EXAMPLE",
            "statement": "A car starts from rest with acceleration 2 m/s^2. Find its velocity after 10 s.",
            "given_data": {"v_i": "0 m/s", "a": "2 m/s^2", "t": "10 s"},
            "to_find": ["v_f"],
            "formula_used": ["v_f = v_i + at"],
            "step_by_step_solution": ["v_f = 0 + (2)(10)", "v_f = 20 m/s"],
            "final_answer": "20",
            "unit": "m/s",
            "slo_code": "2.2.1",
            "source_reference": "National Book Foundation Physics 9, p.38",
        },
        # Numerical - Exercise
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "NUMERICAL",
            "problem_number": "Exercise 2.5",
            "problem_type": "EXERCISE_NUMERICAL",
            "statement": "A train slows down from 80 km/h to 20 km/h in 400 m. Find retardation.",
            "given_data": {"v_i": "22.2 m/s", "v_f": "5.56 m/s", "S": "400 m"},
            "to_find": ["a"],
            "formula_used": ["2aS = v_f^2 - v_i^2"],
            "step_by_step_solution": ["2a(400) = (5.56)^2 - (22.2)^2"],
            "final_answer": "-0.58",
            "unit": "m/s^2",
            "slo_code": "2.2.2",
            "source_reference": "National Book Foundation Physics 9, p.56",
        },
        # Book MCQ
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "MCQ",
            "source_type": "BOOK",
            "question_number": "1",
            "stem_text": "A body is said to be in motion if it changes its position with respect to its:",
            "options": ["Mass", "Weight", "Surroundings", "Speed"],
            "correct_option_index": 2,
            "explanation": "Motion is relative and defined with respect to surroundings.",
            "slo_code": "2.1.1",
            "source_reference": "Textbook Review Exercise Q1",
        },
        # Past Paper MCQ (Active SLO)
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "MCQ",
            "source_type": "PAST_PAPER",
            "question_number": "3",
            "stem_text": "The rate of change of displacement is called:",
            "options": ["Speed", "Velocity", "Acceleration", "Deceleration"],
            "correct_option_index": 1,
            "explanation": "Velocity is the rate of change of displacement.",
            "slo_code": "2.1.3",
            "source_reference": "FBISE 2023 Annual Q3",
            "year": 2023,
        },
        # Past Paper MCQ (Obsolete SLO - not in syllabus)
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "MCQ",
            "source_type": "PAST_PAPER",
            "question_number": "8",
            "stem_text": "Old obsolete kinematics question",
            "options": ["A", "B", "C", "D"],
            "correct_option_index": 0,
            "explanation": "Removed from 2024 syllabus",
            "slo_code": "OLD.99.1",
            "source_reference": "FBISE 2018 Annual Q8",
            "year": 2018,
        },
        # Definition
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "DEFINITION",
            "term": "Uniform Velocity",
            "definition": "A body has uniform velocity if it covers equal displacements in equal intervals of time.",
            "mathematical_form": "v = \\frac{S}{t}",
            "si_unit": "m/s",
            "key_points": ["Direction remains constant", "Magnitude remains constant"],
            "slo_code": "2.1.3",
        },
        # Subjective CRQ
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "SUBJECTIVE",
            "question_type": "CRQ",
            "question_number": "Q2(i)",
            "command_word": "Differentiate",
            "stem_text": "Differentiate between distance and displacement.",
            "marks": 3.0,
            "model_answer": "Distance is scalar and path-dependent, displacement is vector and shortest straight path.",
            "marking_scheme_rubric": ["1 mark distance definition", "1 mark displacement definition", "1 mark scalar vs vector"],
            "slo_code": "2.1.2",
            "source_reference": "Textbook Conceptual Questions",
        },
        # Diagram Labeling
        {
            "board": "FBISE",
            "class_level": "9",
            "subject": "Physics",
            "chapter": "Kinematics",
            "item_category": "DIAGRAM_LABELING",
            "title": "Speed-Time Graph for Uniform Acceleration",
            "caption": "Figure 2.14: Analysis of gradient and area",
            "diagram_type": "GRAPH",
            "labels": ["Origin (0,0)", "Slope (Acceleration)", "Area under line (Distance)"],
            "mermaid_code": None,
            "description": "Slope gives acceleration while area under graph gives distance travelled.",
            "slo_code": "2.3.2",
            "source_reference": "Textbook Fig 2.14",
        },
    ]


def test_compile_chapter_numericals(sample_items):
    compiler = ResourceCompiler(sample_items)
    
    # All numericals
    all_nums = compiler.compile_chapter_numericals("FBISE", "9", "Physics", "Kinematics")
    assert len(all_nums) == 2
    assert all_nums[0].problem_number == "Example 2.1"
    assert all_nums[0].final_answer == "20"
    assert all_nums[0].unit == "m/s"

    # Filtered by type
    worked_only = compiler.compile_chapter_numericals(
        "FBISE", "9", "Physics", "Kinematics", numerical_type="WORKED_EXAMPLE"
    )
    assert len(worked_only) == 1
    assert worked_only[0].problem_type == "WORKED_EXAMPLE"

    exercise_only = compiler.compile_chapter_numericals(
        "FBISE", "9", "Physics", "Kinematics", numerical_type="EXERCISE_NUMERICAL"
    )
    assert len(exercise_only) == 1
    assert exercise_only[0].problem_number == "Exercise 2.5"


def test_compile_chapter_mcqs_and_syllabus_filter(sample_items):
    compiler = ResourceCompiler(sample_items)

    # Book MCQs only
    book_mcqs = compiler.compile_chapter_mcqs(
        "FBISE", "9", "Physics", "Kinematics", source_type="BOOK"
    )
    assert len(book_mcqs) == 1
    assert book_mcqs[0].correct_option_index == 2

    # Past Paper MCQs with Active SLO filter
    active_slos = {"2.1.1", "2.1.2", "2.1.3", "2.2.1", "2.2.2"}
    filtered_past_mcqs = compiler.compile_chapter_mcqs(
        "FBISE", "9", "Physics", "Kinematics", source_type="PAST_PAPER", active_slos=active_slos
    )
    # The obsolete past paper MCQ (OLD.99.1) should be excluded
    assert len(filtered_past_mcqs) == 1
    assert filtered_past_mcqs[0].question_number == "3"
    assert filtered_past_mcqs[0].slo_code == "2.1.3"


def test_compile_chapter_notes_and_crq(sample_items):
    compiler = ResourceCompiler(sample_items)
    
    defs = compiler.compile_chapter_definitions("FBISE", "9", "Physics", "Kinematics")
    assert len(defs) == 1
    assert defs[0].term == "Uniform Velocity"
    assert defs[0].si_unit == "m/s"

    crqs = compiler.compile_chapter_subjective_qa("FBISE", "9", "Physics", "Kinematics", question_type="CRQ")
    assert len(crqs) == 1
    assert crqs[0].command_word == "Differentiate"
    assert crqs[0].marks == 3.0


def test_compile_diagram_labeling(sample_items):
    compiler = ResourceCompiler(sample_items)
    diagrams = compiler.compile_chapter_diagram_labeling("FBISE", "9", "Physics", "Kinematics")
    assert len(diagrams) == 1
    assert len(diagrams[0].labels) == 3
    assert len(diagrams[0].blank_exercise_labels) == 3
    assert "Part 1: ________________________" in diagrams[0].blank_exercise_labels[0]


def test_compile_full_bundle_and_markdown_exporters(sample_items):
    compiler = ResourceCompiler(sample_items)
    active_slos = {"2.1.1", "2.1.2", "2.1.3", "2.2.1", "2.2.2"}
    bundle = compiler.compile_chapter_bundle("FBISE", "9", "Physics", "Kinematics", active_slos=active_slos)

    assert len(bundle.numericals) == 2
    assert len(bundle.book_mcqs) == 1
    assert len(bundle.past_paper_mcqs) == 1
    assert len(bundle.definitions_and_laws) == 1
    assert len(bundle.crqs) == 1
    assert len(bundle.diagram_labelings) == 1

    # Verify Markdown outputs
    num_md = ResourceCompiler.export_numericals_to_markdown(bundle.numericals)
    assert "Chapter Numericals Workbook" in num_md
    assert "Problem 1 (Example 2.1)" in num_md
    assert "20 m/s" in num_md

    mcq_md = ResourceCompiler.export_mcqs_to_markdown(bundle.book_mcqs)
    assert "(Correct Answer)" in mcq_md

    notes_md = ResourceCompiler.export_notes_to_markdown(bundle)
    assert "Key Terminology, Definitions & Laws" in notes_md
    assert "Uniform Velocity" in notes_md
    assert "Constructed Response Questions (CRQs - Short Answer)" in notes_md

    diag_md = ResourceCompiler.export_diagram_labeling_to_markdown(bundle.diagram_labelings)
    assert "Student Worksheet" in diag_md
    assert "Click to Reveal Teacher Master Key" in diag_md
