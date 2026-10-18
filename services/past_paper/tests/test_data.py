"""
Synthetic test data for the Past Paper Intelligence Engine.

Design goals
------------
* 2 boards × 4 years × multiple questions per year.
* Same concept expressed with different wording
  (e.g. "rate of change of velocity" == "acceleration").
* Same numerical pattern with different values
  (F=ma with m=5,a=3 in 2022; m=10,a=2 in 2024).
* Unrelated questions that superficially mention the same word ("force")
  but test entirely different concepts — must NOT be auto-linked.
* A concept that appears in only 1 year (LOW evidence).
* A concept that appears in 4+ years (HIGH evidence).
* Multi-board isolation: FBISE vs BISE-Lahore.
"""

from __future__ import annotations

from services.past_paper.schemas import ExtractedQuestion, QuestionClassification, ClassifiedField

# ===========================================================================
# FBISE Physics — Chapter: Motion
# ===========================================================================

# --- Acceleration ---
Q_FBISE_2022_Q1 = ExtractedQuestion(
    paper_id="fbise_2022",
    year=2022,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="1",
    sub_question_number="",
    marks=2.0,
    question_type="SHORT",
    text=(
        "Define acceleration. A car starts from rest and reaches a velocity of 20 m/s "
        "in 5 seconds. Calculate its acceleration."
    ),
    page=3,
)

Q_FBISE_2023_Q2 = ExtractedQuestion(
    paper_id="fbise_2023",
    year=2023,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="2",
    sub_question_number="a",
    marks=3.0,
    question_type="SHORT",
    text=(
        "What is meant by the rate of change of velocity? "
        "A bus increases its velocity from 10 m/s to 40 m/s in 6 seconds. "
        "Find the rate of change of velocity."
    ),
    page=4,
)

Q_FBISE_2024_Q3 = ExtractedQuestion(
    paper_id="fbise_2024",
    year=2024,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="3",
    sub_question_number="",
    marks=2.0,
    question_type="NUMERICAL",
    text=(
        "A train decelerates uniformly from 30 m/s to 10 m/s in 4 seconds. "
        "Determine the deceleration (negative acceleration) using a = Δv/Δt."
    ),
    page=5,
)

Q_FBISE_2025_Q1 = ExtractedQuestion(
    paper_id="fbise_2025",
    year=2025,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="1",
    sub_question_number="b",
    marks=2.0,
    question_type="NUMERICAL",
    text=(
        "A cyclist travelling at 15 m/s applies brakes and comes to rest in 3 seconds. "
        "Calculate the acceleration of the cyclist. [2]"
    ),
    page=2,
)

# --- Newton's Second Law ---
Q_FBISE_2022_Q4 = ExtractedQuestion(
    paper_id="fbise_2022",
    year=2022,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="4",
    sub_question_number="",
    marks=3.0,
    question_type="NUMERICAL",
    text=(
        "State Newton's second law of motion. "
        "A force of 15 N acts on a mass of 5 kg. Calculate the acceleration. "
        "Use F = ma."
    ),
    page=6,
)

Q_FBISE_2024_Q5 = ExtractedQuestion(
    paper_id="fbise_2024",
    year=2024,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="5",
    sub_question_number="",
    marks=3.0,
    question_type="NUMERICAL",
    text=(
        "Using Newton's second law (F = ma), find the force required to give a mass of "
        "10 kg an acceleration of 2 m/s²."
    ),
    page=7,
)

# --- Velocity-Time Graph (only 2022 — MODERATE / LOW evidence) ---
Q_FBISE_2022_Q5 = ExtractedQuestion(
    paper_id="fbise_2022",
    year=2022,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="5",
    sub_question_number="",
    marks=4.0,
    question_type="GRAPH",
    text=(
        "A velocity-time graph is drawn for a moving object. "
        "Explain how the gradient of a v-t graph gives the acceleration. "
        "Sketch a v-t graph for an object that accelerates uniformly and then "
        "moves at constant velocity."
    ),
    page=7,
    has_graph=True,
)

# --- Unrelated force question — mentions 'force' but tests friction, NOT Newton's 2nd ---
Q_FBISE_2023_Q7 = ExtractedQuestion(
    paper_id="fbise_2023",
    year=2023,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="7",
    sub_question_number="",
    marks=2.0,
    question_type="SHORT",
    text=(
        "What is friction? Explain how the frictional force between two surfaces "
        "depends on the nature of the surfaces and the normal force."
    ),
    page=9,
)

# ===========================================================================
# BISE-Lahore Physics — Chapter: Motion (same subject, different board)
# ===========================================================================

Q_BISE_2021_Q1 = ExtractedQuestion(
    paper_id="bise_lahore_2021",
    year=2021,
    board="BISE-Lahore",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="1",
    sub_question_number="",
    marks=2.0,
    question_type="SHORT",
    text=(
        "Define acceleration and write its SI unit. "
        "A vehicle starting from rest attains a velocity of 18 m/s in 9 s. "
        "Find its acceleration."
    ),
    page=2,
)

Q_BISE_2022_Q2 = ExtractedQuestion(
    paper_id="bise_lahore_2022",
    year=2022,
    board="BISE-Lahore",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="2",
    sub_question_number="",
    marks=3.0,
    question_type="NUMERICAL",
    text=(
        "A body is moving with uniform acceleration. Its velocity changes from "
        "12 m/s to 36 m/s in 4 seconds. Calculate the acceleration using the "
        "formula a = (v – u)/t."
    ),
    page=3,
)

Q_BISE_2023_Q3 = ExtractedQuestion(
    paper_id="bise_lahore_2023",
    year=2023,
    board="BISE-Lahore",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="3",
    sub_question_number="",
    marks=2.0,
    question_type="SHORT",
    text=(
        "State the relationship between force, mass and acceleration (F = ma). "
        "A net force of 20 N is applied to a 10 kg object. Find its acceleration."
    ),
    page=4,
)

Q_BISE_2024_Q4 = ExtractedQuestion(
    paper_id="bise_lahore_2024",
    year=2024,
    board="BISE-Lahore",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="4",
    sub_question_number="",
    marks=4.0,
    question_type="NUMERICAL",
    text=(
        "The rate of change of velocity of a car is 3 m/s². "
        "If the car has a mass of 1200 kg, calculate the net force acting on it."
    ),
    page=5,
)

# ===========================================================================
# FBISE Physics — Chapter: Electricity (different chapter entirely)
# ===========================================================================

Q_FBISE_2022_ELEC = ExtractedQuestion(
    paper_id="fbise_2022",
    year=2022,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="9",
    sub_question_number="",
    marks=2.0,
    question_type="SHORT",
    text=(
        "State Ohm's law. A resistor has a resistance of 10 Ω. "
        "If a current of 3 A flows through it, find the voltage across it using V = IR."
    ),
    page=12,
)

Q_FBISE_2023_ELEC = ExtractedQuestion(
    paper_id="fbise_2023",
    year=2023,
    board="FBISE",
    class_level="10",
    subject="Physics",
    session="Annual",
    question_number="10",
    sub_question_number="",
    marks=3.0,
    question_type="NUMERICAL",
    text=(
        "Using Ohm's law (V = IR), calculate the current flowing through a "
        "wire of resistance 5 Ω when a voltage of 20 V is applied across it."
    ),
    page=14,
)

# ===========================================================================
# Pre-built classifications
# (normally produced by the classifier; supplied directly in tests)
# ===========================================================================

def make_classification(qid: str, chapter: str, topic: str, concept: str,
                        question_type: str = "SHORT", difficulty: str = "MEDIUM",
                        cognitive: str = "APPLY", numerical: str = "NUMERICAL",
                        formula_based: bool = False, diagram_based: bool = False,
                        graph_based: bool = False, equation_based: bool = False,
                        confidence: float = 0.9) -> QuestionClassification:
    """Helper to build a QuestionClassification with a given confidence."""
    return QuestionClassification(
        question_id=qid,
        chapter=ClassifiedField(value=chapter, confidence=confidence),
        topic=ClassifiedField(value=topic, confidence=confidence),
        concept=ClassifiedField(value=concept, confidence=confidence),
        question_type=ClassifiedField(value=question_type, confidence=confidence),
        difficulty=ClassifiedField(value=difficulty, confidence=confidence),
        cognitive_level=ClassifiedField(value=cognitive, confidence=confidence),
        numerical_or_conceptual=ClassifiedField(value=numerical, confidence=confidence),
        formula_based=formula_based,
        formula_based_confidence=0.9 if formula_based else 0.0,
        diagram_based=diagram_based,
        diagram_based_confidence=0.9 if diagram_based else 0.0,
        graph_based=graph_based,
        graph_based_confidence=0.9 if graph_based else 0.0,
        equation_based=equation_based,
        equation_based_confidence=0.9 if equation_based else 0.0,
        classified_by="HUMAN",  # test data is treated as human-verified
    )


# ---------------------------------------------------------------------------
# Named classification fixtures
# ---------------------------------------------------------------------------

# FBISE — Acceleration (4 questions, 4 years → HIGH evidence)
CLS_FBISE_2022_Q1 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="SHORT", numerical="CONCEPTUAL",
    formula_based=True, equation_based=True,
)

CLS_FBISE_2023_Q2 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="SHORT", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
    # concept wording differs ("rate of change of velocity") but same concept
)

CLS_FBISE_2024_Q3 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
)

CLS_FBISE_2025_Q1 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
)

# FBISE — Newton's Second Law (2 years → MODERATE evidence)
CLS_FBISE_2022_Q4 = lambda qid: make_classification(
    qid, "Force and Laws of Motion", "Newton's Second Law", "Newton's Second Law",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
)

CLS_FBISE_2024_Q5 = lambda qid: make_classification(
    qid, "Force and Laws of Motion", "Newton's Second Law", "Newton's Second Law",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
)

# FBISE — V-T Graph (1 year only → LOW evidence)
CLS_FBISE_2022_Q5 = lambda qid: make_classification(
    qid, "Motion", "Velocity-Time Graphs", "Velocity-Time Graphs",
    question_type="GRAPH", difficulty="HARD",
    cognitive="ANALYSE", numerical="CONCEPTUAL",
    graph_based=True,
)

# FBISE — Friction (unrelated, must NOT be linked to Newton's 2nd despite mentioning 'force')
CLS_FBISE_2023_Q7 = lambda qid: make_classification(
    qid, "Force and Laws of Motion", "Friction", "Friction",
    question_type="SHORT", numerical="CONCEPTUAL",
)

# BISE-Lahore — Acceleration (4 years → HIGH evidence independently)
CLS_BISE_2021_Q1 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="SHORT", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
    confidence=0.88,
)
CLS_BISE_2022_Q2 = lambda qid: make_classification(
    qid, "Motion", "Acceleration", "Acceleration",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
    confidence=0.91,
)
CLS_BISE_2023_Q3 = lambda qid: make_classification(
    qid, "Force and Laws of Motion", "Newton's Second Law", "Newton's Second Law",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
    confidence=0.90,
)
CLS_BISE_2024_Q4 = lambda qid: make_classification(
    qid, "Force and Laws of Motion", "Newton's Second Law", "Newton's Second Law",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
    confidence=0.89,
)

# Electricity
CLS_FBISE_2022_ELEC = lambda qid: make_classification(
    qid, "Electricity", "Ohm's Law", "Ohm's Law",
    question_type="SHORT", numerical="CONCEPTUAL",
    formula_based=True, equation_based=True,
)
CLS_FBISE_2023_ELEC = lambda qid: make_classification(
    qid, "Electricity", "Ohm's Law", "Ohm's Law",
    question_type="NUMERICAL", numerical="NUMERICAL",
    formula_based=True, equation_based=True,
)


# ===========================================================================
# Convenience: load all FBISE data
# ===========================================================================

ALL_FBISE_QUESTIONS = [
    Q_FBISE_2022_Q1,
    Q_FBISE_2023_Q2,
    Q_FBISE_2024_Q3,
    Q_FBISE_2025_Q1,
    Q_FBISE_2022_Q4,
    Q_FBISE_2024_Q5,
    Q_FBISE_2022_Q5,
    Q_FBISE_2023_Q7,
    Q_FBISE_2022_ELEC,
    Q_FBISE_2023_ELEC,
]

ALL_BISE_QUESTIONS = [
    Q_BISE_2021_Q1,
    Q_BISE_2022_Q2,
    Q_BISE_2023_Q3,
    Q_BISE_2024_Q4,
]

ALL_QUESTIONS = ALL_FBISE_QUESTIONS + ALL_BISE_QUESTIONS

CLASSIFICATION_MAP = {
    # These lambdas take a question_id and return QuestionClassification
    "fbise_q1_2022": CLS_FBISE_2022_Q1,
    "fbise_q2a_2023": CLS_FBISE_2023_Q2,
    "fbise_q3_2024": CLS_FBISE_2024_Q3,
    "fbise_q1b_2025": CLS_FBISE_2025_Q1,
    "fbise_q4_2022": CLS_FBISE_2022_Q4,
    "fbise_q5_2024": CLS_FBISE_2024_Q5,
    "fbise_q5_graph_2022": CLS_FBISE_2022_Q5,
    "fbise_q7_2023": CLS_FBISE_2023_Q7,
    "fbise_q9_2022": CLS_FBISE_2022_ELEC,
    "fbise_q10_2023": CLS_FBISE_2023_ELEC,
    "bise_q1_2021": CLS_BISE_2021_Q1,
    "bise_q2_2022": CLS_BISE_2022_Q2,
    "bise_q3_2023": CLS_BISE_2023_Q3,
    "bise_q4_2024": CLS_BISE_2024_Q4,
}
