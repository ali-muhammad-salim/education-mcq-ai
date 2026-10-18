"""
Question Classifier.

Classifies each ExtractedQuestion against the curriculum hierarchy.

Strategy (in priority order)
-----------------------------
1. Try the LLM (ModelRouter.generate with think=False, JSON output).
2. If LLM is unavailable or returns low-confidence output, fall back to
   rule-based keyword heuristics.
3. Always emit a `classified_by` field so callers know the source.
4. Low-confidence fields are listed in `needs_review`.

The classifier never treats an LLM output as authoritative — every field
carries an explicit confidence score.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable, Optional

from services.past_paper.schemas import (
    ClassifiedField,
    ExtractedQuestion,
    QuestionClassification,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router factory — injected at runtime to allow mocking in tests
# ---------------------------------------------------------------------------

# Type alias for the generate callable
_GenerateFn = Callable[[str, str, float, int, bool], Any]

_router_factory: Optional[Callable[[], Any]] = None


def set_router_factory(factory: Callable[[], Any]) -> None:
    """Inject a callable that returns a ModelRouter (or mock)."""
    global _router_factory
    _router_factory = factory


def _get_router() -> Optional[Any]:
    if _router_factory is not None:
        return _router_factory()
    try:
        from services.inference.router import get_router
        return get_router()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Keyword-based heuristics (fallback)
# ---------------------------------------------------------------------------

_CHAPTER_KEYWORDS: dict[str, list[str]] = {
    "Motion": [
        "velocity", "acceleration", "displacement", "speed", "distance",
        "rate of change", "uniform motion", "non-uniform", "kinematics",
        "projectile", "free fall", "terminal velocity",
    ],
    "Force and Laws of Motion": [
        "newton", "force", "mass", "inertia", "momentum", "impulse",
        "friction", "normal force", "free body diagram", "net force",
    ],
    "Work, Energy and Power": [
        "work", "energy", "power", "kinetic", "potential", "conservation",
        "joule", "watt",
    ],
    "Waves": [
        "wave", "frequency", "wavelength", "amplitude", "period",
        "longitudinal", "transverse", "sound", "light wave",
    ],
    "Electricity": [
        "current", "voltage", "resistance", "ohm", "circuit", "charge",
        "electric field", "capacitor", "conductor",
    ],
    "Optics": [
        "lens", "mirror", "refraction", "reflection", "focal", "image",
        "concave", "convex", "prism", "spectrum",
    ],
    "Thermal Physics": [
        "temperature", "heat", "thermal", "specific heat", "latent",
        "conduction", "convection", "radiation", "thermometer",
    ],
    "Magnetism": [
        "magnet", "magnetic field", "flux", "electromagnetic", "solenoid",
        "motor", "generator", "induction",
    ],
}

_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "Acceleration": ["acceleration", "rate of change of velocity", "a = Δv/Δt", "a = v-u/t"],
    "Newton's Second Law": ["f = ma", "force equals mass", "newton's second", "net force"],
    "Velocity-Time Graphs": ["velocity-time", "v-t graph", "gradient of v-t", "area under"],
    "Free Fall": ["free fall", "g = 9.8", "gravitational acceleration", "falling body"],
    "Projectile Motion": ["projectile", "horizontal", "vertical component"],
    "Ohm's Law": ["ohm's law", "v = ir", "resistance", "potential difference"],
    "Wave Speed": ["v = fλ", "wave speed", "frequency × wavelength"],
}

_CONCEPT_KEYWORDS: dict[str, list[str]] = {
    "Acceleration": [
        "acceleration", "rate of change of velocity", "a = Δv/Δt",
        "change in velocity", "speeding up", "slowing down",
    ],
    "Newton's Second Law": ["f = ma", "force", "mass times acceleration"],
    "Velocity": ["velocity", "speed in a direction", "v = d/t"],
    "Displacement": ["displacement", "distance in a direction", "net distance"],
    "Momentum": ["momentum", "p = mv", "mass × velocity"],
    "Ohm's Law": ["ohm", "v = ir", "current", "voltage", "resistance"],
    "Kinetic Energy": ["kinetic energy", "ek = ½mv²", "½mv", "moving object energy"],
    "Gravitational Potential Energy": ["potential energy", "ep = mgh", "height", "gravity"],
}

_DIFFICULTY_KEYWORDS: dict[str, list[str]] = {
    "EASY": ["define", "state", "name", "what is", "list", "write the formula"],
    "MEDIUM": ["explain", "describe", "calculate using", "find the value"],
    "HARD": ["derive", "prove", "compare", "analyse", "evaluate", "justify", "design"],
}

_COGNITIVE_KEYWORDS: dict[str, list[str]] = {
    "REMEMBER": ["define", "state", "name", "list", "recall", "write"],
    "UNDERSTAND": ["explain", "describe", "summarise", "identify", "classify"],
    "APPLY": ["calculate", "solve", "use", "apply", "find", "compute"],
    "ANALYSE": ["analyse", "compare", "differentiate", "distinguish", "examine"],
    "EVALUATE": ["evaluate", "justify", "argue", "assess", "critique"],
    "CREATE": ["design", "derive", "construct", "propose", "formulate"],
}


def _keyword_match(text: str, keyword_map: dict[str, list[str]]) -> tuple[str, float]:
    """
    Return (best_label, confidence) by counting keyword hits.
    confidence = hit_count / (1 + hit_count)  — asymptotes to 1.
    """
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for label, keywords in keyword_map.items():
        hits = sum(1 for kw in keywords if kw.lower() in text_lower)
        if hits:
            scores[label] = hits

    if not scores:
        return "UNKNOWN", 0.0

    best = max(scores, key=lambda k: scores[k])
    hits = scores[best]
    confidence = round(hits / (1 + hits), 2)
    return best, confidence


def _detect_formula_based(text: str) -> tuple[bool, float]:
    has = bool(re.search(r"[A-Za-z]\s*=\s*[A-Za-z]|[a-z]\s*[+\-×÷/]\s*[a-z]", text))
    return has, 0.75 if has else 0.0


def _detect_diagram_based(q: ExtractedQuestion) -> tuple[bool, float]:
    text_lower = q.text.lower()
    by_flag = q.has_diagram
    by_kw = any(kw in text_lower for kw in ["diagram", "figure", "sketch", "draw"])
    has = by_flag or by_kw
    return has, 0.85 if has else 0.0


def _detect_graph_based(q: ExtractedQuestion) -> tuple[bool, float]:
    text_lower = q.text.lower()
    by_flag = q.has_graph
    by_kw = any(kw in text_lower for kw in ["graph", "plot", "sketch a graph", "v-t graph"])
    has = by_flag or by_kw
    return has, 0.85 if has else 0.0


def _detect_equation_based(q: ExtractedQuestion) -> tuple[bool, float]:
    text_lower = q.text.lower()
    by_flag = q.has_formula
    # Look for equation-like strings
    by_kw = bool(re.search(r"equation|formula|express|f\s*=|v\s*=|e\s*=|p\s*=", text_lower))
    has = by_flag or by_kw
    return has, 0.80 if has else 0.0


def _numerical_or_conceptual(text: str) -> tuple[str, float]:
    text_lower = text.lower()
    numerical_kws = ["calculate", "find", "determine", "compute", "how much", "how many",
                     "what is the value", "evaluate numerically"]
    conceptual_kws = ["define", "explain", "describe", "state", "what is meant",
                      "why", "how does", "compare", "distinguish"]
    num_hits = sum(1 for kw in numerical_kws if kw in text_lower)
    con_hits = sum(1 for kw in conceptual_kws if kw in text_lower)
    if num_hits > con_hits:
        return "NUMERICAL", round(num_hits / (1 + num_hits), 2)
    if con_hits > num_hits:
        return "CONCEPTUAL", round(con_hits / (1 + con_hits), 2)
    return "CONCEPTUAL", 0.5  # default


# ---------------------------------------------------------------------------
# Rule-based classifier
# ---------------------------------------------------------------------------

def _classify_rule_based(question_id: str, q: ExtractedQuestion) -> QuestionClassification:
    """Classify a question using keyword heuristics."""
    text = q.text

    chapter, ch_conf = _keyword_match(text, _CHAPTER_KEYWORDS)
    topic, tp_conf = _keyword_match(text, _TOPIC_KEYWORDS)
    concept, cn_conf = _keyword_match(text, _CONCEPT_KEYWORDS)
    difficulty, df_conf = _keyword_match(text, _DIFFICULTY_KEYWORDS)
    cognitive, cg_conf = _keyword_match(text, _COGNITIVE_KEYWORDS)
    num_or_con, nc_conf = _numerical_or_conceptual(text)
    formula, f_conf = _detect_formula_based(text)
    diagram, d_conf = _detect_diagram_based(q)
    graph, g_conf = _detect_graph_based(q)
    equation, e_conf = _detect_equation_based(q)

    # Decide question_type from marks + keywords
    qt_val = q.question_type if q.question_type != "UNKNOWN" else (
        "MCQ" if q.marks == 1.0 else
        "NUMERICAL" if num_or_con == "NUMERICAL" else
        "SHORT"
    )

    LOW_CONF_THRESHOLD = 0.35
    needs_review = []
    if ch_conf < LOW_CONF_THRESHOLD:
        needs_review.append("chapter")
    if tp_conf < LOW_CONF_THRESHOLD:
        needs_review.append("topic")
    if cn_conf < LOW_CONF_THRESHOLD:
        needs_review.append("concept")

    return QuestionClassification(
        question_id=question_id,
        chapter=ClassifiedField(value=chapter, confidence=ch_conf),
        topic=ClassifiedField(value=topic, confidence=tp_conf),
        concept=ClassifiedField(value=concept, confidence=cn_conf),
        learning_objective=ClassifiedField(value="", confidence=0.0),
        question_type=ClassifiedField(value=qt_val, confidence=0.7),
        difficulty=ClassifiedField(value=difficulty if difficulty != "UNKNOWN" else "MEDIUM", confidence=df_conf),
        cognitive_level=ClassifiedField(value=cognitive if cognitive != "UNKNOWN" else "UNDERSTAND", confidence=cg_conf),
        numerical_or_conceptual=ClassifiedField(value=num_or_con, confidence=nc_conf),
        formula_based=formula,
        formula_based_confidence=f_conf,
        diagram_based=diagram,
        diagram_based_confidence=d_conf,
        graph_based=graph,
        graph_based_confidence=g_conf,
        equation_based=equation,
        equation_based_confidence=e_conf,
        needs_review=needs_review,
        classified_by="RULE_BASED",
    )


# ---------------------------------------------------------------------------
# LLM-based classifier
# ---------------------------------------------------------------------------

_LLM_PROMPT_TEMPLATE = """\
You are a curriculum expert. Classify the following past-paper question against the provided candidate SLOs.

Question:
\"\"\"{question_text}\"\"\"

Marks: {marks}
Subject: {subject}
Board: {board}
Year: {year}

Candidate SLOs (most similar first):
{candidate_slos}

Return ONLY a valid JSON object with this exact structure:
{{
  "slo_id": {{"value": "<matching_slo_id or UNKNOWN>", "confidence": <0.0-1.0>}},
  "topic_id": {{"value": "<matching_topic_id or UNKNOWN>", "confidence": <0.0-1.0>}},
  "command_word": {{"value": "<action word like 'Define', 'Calculate' or UNKNOWN>", "confidence": <0.0-1.0>}},
  "chapter": {{"value": "<chapter name>", "confidence": <0.0-1.0>}},
  "topic": {{"value": "<topic name>", "confidence": <0.0-1.0>}},
  "concept": {{"value": "<concept name>", "confidence": <0.0-1.0>}},
  "learning_objective": {{"value": "<one sentence description>", "confidence": <0.0-1.0>}},
  "question_type": {{"value": "MCQ|SHORT|LONG|NUMERICAL|DEFINITION|DERIVATION", "confidence": <0.0-1.0>}},
  "difficulty": {{"value": "EASY|MEDIUM|HARD", "confidence": <0.0-1.0>}},
  "cognitive_level": {{"value": "REMEMBER|UNDERSTAND|APPLY|ANALYSE|EVALUATE|CREATE", "confidence": <0.0-1.0>}},
  "numerical_or_conceptual": {{"value": "NUMERICAL|CONCEPTUAL|MIXED", "confidence": <0.0-1.0>}},
  "formula_based": false,
  "diagram_based": false,
  "graph_based": false,
  "equation_based": false
}}
"""


def _retrieve_slos(repo: Any, syllabus_version_id: str, question_text: str, router: Any, top_k: int = 5) -> list[dict]:
    """Retrieve top-k SLOs for a question using pgvector cosine similarity."""
    from sqlalchemy import text
    
    # 1. Embed the question
    try:
        resp = router.embed(texts=[question_text])
        if not resp.success or not resp.embeddings:
            logger.warning("Embedding failed for question.")
            return []
        embedding = resp.embeddings[0]
    except Exception as exc:
        logger.warning(f"Error during embedding: {exc}")
        return []
    
    # 2. Query DB
    with repo._SessionFactory() as session:
        query = text("""
            SELECT s.id, s.code, s.description, t.id as topic_id, t.name as topic_name,
                   1 - (s.embedding <=> :emb::vector) AS similarity
            FROM "SLO" s
            JOIN "Subtopic" st ON s."subtopicId" = st.id
            JOIN "Topic" t ON st."topicId" = t.id
            WHERE t."syllabusVersionId" = :version_id
              AND s.embedding IS NOT NULL
            ORDER BY s.embedding <=> :emb::vector
            LIMIT :limit
        """)
        
        rows = session.execute(query, {
            "emb": embedding,
            "version_id": syllabus_version_id,
            "limit": top_k
        }).fetchall()
        
        results = []
        for row in rows:
            results.append({
                "id": row[0],
                "code": row[1] or "",
                "description": row[2],
                "topic_id": row[3],
                "topic_name": row[4],
                "similarity": float(row[5]) if row[5] is not None else 0.0
            })
        return results


def _classify_with_llm(
    question_id: str,
    q: ExtractedQuestion,
    router: Any,
    repo: Any,
    syllabus_version_id: str,
) -> Optional[QuestionClassification]:
    """
    Attempt LLM-based classification with retrieval-augmented SLOs.
    Returns None on any failure.
    """
    # 1. Fetch relevant SLOs
    slos = _retrieve_slos(repo, syllabus_version_id, q.text, router)
    
    # Format candidates for prompt
    candidates_text = ""
    for idx, slo in enumerate(slos):
        code_str = f"[{slo['code']}] " if slo['code'] else ""
        candidates_text += f"{idx+1}. SLO ID: {slo['id']} | Topic ID: {slo['topic_id']}\n"
        candidates_text += f"   Topic: {slo['topic_name']}\n"
        candidates_text += f"   {code_str}{slo['description']}\n\n"
        
    if not candidates_text:
        candidates_text = "No candidate SLOs found in database with embeddings."

    prompt = _LLM_PROMPT_TEMPLATE.format(
        question_text=q.text[:800],
        marks=q.marks if q.marks is not None else "unknown",
        subject=q.subject,
        board=q.board,
        year=q.year,
        candidate_slos=candidates_text,
    )

    try:
        resp = router.generate(
            prompt=prompt,
            system="You are a curriculum classification expert. Return only valid JSON.",
            temperature=0.0,
            max_tokens=500,
            json_mode=True,
        )
        if not resp.success or not resp.text:
            logger.warning("LLM classification failed for Q%s: %s", q.question_number, resp.error)
            return None

        data = json.loads(resp.text)
    except Exception as exc:
        logger.warning("LLM classification error for Q%s: %s", q.question_number, exc)
        return None

    try:
        def _cf(key: str) -> ClassifiedField:
            raw = data.get(key, {})
            return ClassifiedField(
                value=raw.get("value", "UNKNOWN"),
                confidence=float(raw.get("confidence", 0.5)),
            )

        LOW_CONF_THRESHOLD = 0.5
        needs_review = []
        # We now also review if slo_id confidence is low
        for key in ("chapter", "topic", "concept", "slo_id"):
            field_data = data.get(key, {})
            if float(field_data.get("confidence", 0.0)) < LOW_CONF_THRESHOLD:
                needs_review.append(key)

        return QuestionClassification(
            question_id=question_id,
            chapter=_cf("chapter"),
            topic=_cf("topic"),
            topic_id=_cf("topic_id"),
            concept=_cf("concept"),
            learning_objective=_cf("learning_objective"),
            slo_id=_cf("slo_id"),
            command_word=_cf("command_word"),
            question_type=_cf("question_type"),
            difficulty=_cf("difficulty"),
            cognitive_level=_cf("cognitive_level"),
            numerical_or_conceptual=_cf("numerical_or_conceptual"),
            formula_based=bool(data.get("formula_based", False)),
            formula_based_confidence=0.9 if data.get("formula_based") else 0.0,
            diagram_based=bool(data.get("diagram_based", False)),
            diagram_based_confidence=0.9 if data.get("diagram_based") else 0.0,
            graph_based=bool(data.get("graph_based", False)),
            graph_based_confidence=0.9 if data.get("graph_based") else 0.0,
            equation_based=bool(data.get("equation_based", False)),
            equation_based_confidence=0.9 if data.get("equation_based") else 0.0,
            needs_review=needs_review,
            classified_by="LLM",
            raw_llm_output=resp.text,
        )

    except Exception as exc:
        logger.warning("Failed to parse LLM classification for Q%s: %s", q.question_number, exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_question(
    question_id: str,
    question: ExtractedQuestion,
    repo: Any = None,
    syllabus_version_id: str = "",
    use_llm: bool = True,
) -> QuestionClassification:
    """
    Classify a single ExtractedQuestion.

    Tries LLM first (with pgvector SLO retrieval), then falls back to rule-based.
    """
    if use_llm and repo is not None and syllabus_version_id:
        router = _get_router()
        if router is not None:
            llm_cls = _classify_with_llm(question_id, question, router, repo, syllabus_version_id)
            if llm_cls is not None:
                return llm_cls
            logger.info(
                "LLM classification unavailable for Q%s — using rule-based fallback",
                question.question_number,
            )

    return _classify_rule_based(question_id, question)


def classify_questions_batch(
    questions: list[tuple[str, ExtractedQuestion]],
    repo: Any = None,
    syllabus_version_id: str = "",
    use_llm: bool = True,
) -> list[QuestionClassification]:
    """
    Classify a list of (question_id, question) pairs.
    """
    results: list[QuestionClassification] = []
    for qid, q in questions:
        cls = classify_question(qid, q, repo, syllabus_version_id, use_llm=use_llm)
        results.append(cls)
    return results

