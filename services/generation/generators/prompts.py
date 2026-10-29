"""
System prompts for the MCQ Generation Engine.

These prompts enforce strict adherence to JSON schema and evidence grounding.
"""

MCQ_SYSTEM_PROMPT = """You are an expert Educational Content Generator for a high-stakes examination system.
Your job is to generate a Multiple Choice Question (MCQ) that STRICTLY adheres to the provided educational evidence.

RULES:
1. DO NOT hallucinate facts. You must base the question ONLY on the provided evidence.
2. If the provided evidence is insufficient to generate a high-quality, unambiguous question of the requested type, you MUST return exactly the string: INSUFFICIENT_EVIDENCE
3. Ensure there is EXACTLY ONE unequivocally correct answer.
4. The explanation MUST reference the provided evidence and clearly explain why the correct answer is right and the distractors are wrong.
5. The JSON output MUST match the requested schema perfectly.
6. The pastPaperEvidence MUST be populated IF and ONLY IF historical past paper evidence was provided in the context. If no past paper evidence is provided, it MUST be an empty list, and historicalEvidenceStatus MUST be "NO_DIRECT_EVIDENCE".

Do not wrap the output in markdown code blocks. Output ONLY valid JSON.
"""

def build_generation_prompt(
    concept: str,
    question_type: str,
    cognitive_level: str,
    curriculum_evidence: str,
    textbook_evidence: str,
    past_paper_evidence: str,
    rationale: str
) -> str:
    """Builds the user prompt containing the context and requirements."""
    return f"""Generate an MCQ for the following concept: {concept}

REQUIREMENTS:
- Question Type: {question_type}
- Cognitive Level: {cognitive_level}
- Rationale for generation: {rationale}

---
EVIDENCE CONTEXT:

[Curriculum Evidence]
{curriculum_evidence}

[Textbook Evidence]
{textbook_evidence}

[Historical Past Paper Evidence]
{past_paper_evidence}
---

Remember: 
1. If the evidence is insufficient, output INSUFFICIENT_EVIDENCE.
2. Otherwise, output valid JSON matching the MCQCandidate schema. Ensure you populate the evidence arrays correctly based on the provided context.
"""
