"""
Stage 12 – Curriculum Extraction.

Extracts Topics, Subtopics, SLOs, Command Words, and Cognitive Levels
from a curriculum document using an LLM.
"""

import json
import logging
import httpx
import re
from typing import Any

from services.ingestion.config import settings
from services.ingestion.schemas import IngestionResult, CurriculumExtraction

logger = logging.getLogger(__name__)

def extract_curriculum(result: IngestionResult, repo: Any = None) -> None:
    """
    Extracts curriculum components from the OCR'd text of a curriculum document
    and saves them using the repository (or logs them).
    """
    if not settings.vision_enabled:
        logger.warning("Vision/LLM is disabled, skipping curriculum extraction.")
        return

    pages_text = []
    for page in result.pages:
        page_content = []
        for region in page.regions:
            if region.text:
                page_content.append(region.text)
        if page_content:
            pages_text.append("\n".join(page_content))
    
    if not pages_text:
        logger.warning("No text found in document for curriculum extraction.")
        return

    # Chunking: process 10 pages at a time to stay within context windows
    chunk_size = 10
    all_extracted_data = CurriculumExtraction()
    needs_review = False
    
    for i in range(0, len(pages_text), chunk_size):
        chunk_text = "\n---\n".join(pages_text[i:i+chunk_size])
        logger.info(f"Extracting curriculum from pages {i+1} to min({i+chunk_size}, {len(pages_text)})...")
        
        # Deterministic regex for SLO codes to guide the LLM
        found_slo_codes = set(re.findall(r'\b\d+\.\d+\.\d+\b', chunk_text))
        
        prompt = _build_curriculum_prompt(chunk_text, list(found_slo_codes))

        try:
            payload = {
                "model": settings.ollama_vision_model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            }

            with httpx.Client(timeout=settings.ollama_timeout_seconds * 3) as client:
                response = client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            raw_response = data.get("response", "{}")
            extracted_dict = _parse_response(raw_response)
            
            # Pydantic-based validation
            try:
                validated_chunk = CurriculumExtraction.model_validate(extracted_dict)
            except Exception as val_exc:
                logger.warning(f"Validation failed for chunk, marking for review: {val_exc}")
                needs_review = True
                continue

            if validated_chunk.topics:
                all_extracted_data.topics.extend(validated_chunk.topics)
                
            if validated_chunk.exam_specification and not all_extracted_data.exam_specification:
                all_extracted_data.exam_specification = validated_chunk.exam_specification

        except Exception as exc:
            logger.error("Curriculum extraction failed for chunk: %s", exc)
            result.errors.append({"curriculum_extraction_error": str(exc)})
            needs_review = True
            
    logger.info("Successfully extracted curriculum components.")
    logger.info(f"Found {len(all_extracted_data.topics)} topics total.")
    
    # Dump to dict for persistence
    final_dict = all_extracted_data.model_dump()
    if needs_review:
        final_dict["_needs_review"] = True
        logger.warning("Extraction marked for review due to low confidence or validation errors.")

    result.errors.append({"curriculum_extraction": "Success", "data": final_dict, "needs_review": needs_review})
    
    # Save to DB Document metadata
    if repo and result.doc_id:
        from sqlalchemy import text
        with repo._SessionFactory() as session:
            # Fetch existing metadata
            res = session.execute(
                text("SELECT metadata_json FROM ingest_documents WHERE id = :doc_id"),
                {"doc_id": result.doc_id}
            ).fetchone()
            
            if res:
                metadata = res[0] or {}
                metadata["curriculum_data"] = final_dict
                metadata["curriculum_needs_review"] = needs_review
                
                # Update metadata
                session.execute(
                    text("UPDATE ingest_documents SET metadata_json = :metadata WHERE id = :doc_id"),
                    {"metadata": json.dumps(metadata), "doc_id": result.doc_id}
                )
                session.commit()
                logger.info("Saved extracted curriculum to document metadata.")


def _build_curriculum_prompt(text: str, found_slo_codes: list[str] = None) -> str:
    hint_text = ""
    if found_slo_codes:
        hint_text = f"HINT: The following SLO codes were detected in the text using regex: {', '.join(found_slo_codes)}. Make sure to extract all of them accurately.\n\n"

    return (
        "You are an educational curriculum extraction assistant for the AKU-EB board. "
        "Your task is to analyze the provided syllabus text and extract a structured representation "
        "of the academic hierarchy. It is critical that you accurately extract Command Words (e.g., Describe, Explain, Calculate) "
        "and Cognitive Levels (e.g., K for Knowledge, U for Understanding, A for Application) for each SLO.\n\n"
        "Return a JSON object with the following structure:\n"
        "{\n"
        "  \"exam_specification\": {\n"
        "    \"paperCode\": \"Paper I / II\",\n"
        "    \"durationMin\": 180,\n"
        "    \"totalMarks\": 100,\n"
        "    \"sections\": [{\"name\": \"Section A\", \"type\": \"MCQ\", \"count\": 30, \"marksEach\": 1}],\n"
        "    \"cognitiveSplit\": {\"K\": 30, \"U\": 40, \"A\": 30}\n"
        "  },\n"
        "  \"topics\": [\n"
        "    {\n"
        "      \"name\": \"Topic Name\",\n"
        "      \"topicNumber\": \"1\",\n"
        "      \"subtopics\": [\n"
        "        {\n"
        "          \"name\": \"Subtopic Name\",\n"
        "          \"subtopicNumber\": \"1.1\",\n"
        "          \"slos\": [\n"
        "            {\n"
        "              \"sloCode\": \"1.1.1\",\n"
        "              \"description\": \"Students should be able to define X...\",\n"
        "              \"commandWords\": [\"Define\"],\n"
        "              \"cognitiveLevel\": \"K\",\n"
        "              \"practical\": false\n"
        "            }\n"
        "          ]\n"
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Ensure structural integrity. If a Command Word or Cognitive Level is missing, leave it as an empty list/string. "
        "Try to infer sloCode (e.g. 1.1.1) if visible, or derive it from the subtopic and order. "
        "Look for the 'Exam Specification' or 'Scheme of Assessment' section and populate exam_specification if found.\n\n"
        f"{hint_text}"
        "Analyze the following text and extract the topics, subtopics, and SLOs:\n\n"
        f"{text}"
    )


def _parse_response(raw: str) -> dict[str, Any]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {"topics": [], "exam_specification": {}}
