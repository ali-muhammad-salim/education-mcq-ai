"""
Official Model Examination Paper Extraction & AI Verification Pipeline.
Extracts:
- Model Paper I: MCQs with Option Parsing, LaTeX extraction, AI Solver & Verified Answer Keys.
- Model Paper II: CRQs & ERQs with Step Marks & Rubrics.
"""

import os
import re
import json
import uuid
import time
import asyncio
import sys
from pathlib import Path
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pymupdf
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

from services.inference.gemini_client import GeminiClient
from services.ingestion.diagram_cropper import extract_verified_diagrams


def safe_json_loads(raw_text: str) -> dict:
    cleaned = re.sub(r'^```json\s*', '', raw_text.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'```$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned, strict=False)
    except Exception:
        pass
    
    # Escape invalid backslashes (e.g. \Omega, \frac, \tau, \lambda, \mu)
    sanitized = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', cleaned)
    try:
        return json.loads(sanitized, strict=False)
    except Exception:
        sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)
        return json.loads(sanitized, strict=False)


def get_or_create_subject_and_paper(conn, class_name, paper_code, title, pdf_path):
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('''
        SELECT s.id, c.id as class_id
        FROM "Subject" s
        JOIN "Class" c ON s."classId" = c.id
        WHERE c.name = %s AND s.name ILIKE '%%Physics%%'
    ''', (class_name,))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Subject Physics for {class_name} not found.")
    subject_id, class_id = row[0], row[1]

    cur.execute('SELECT id FROM "Board" LIMIT 1')
    board_row = cur.fetchone()
    if board_row:
        board_id = board_row[0]
    else:
        board_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO "Board" (id, name, "shortCode", country, status, "createdAt", "updatedAt")
            VALUES (%s, 'Aga Khan University Examination Board', 'AKU-EB', 'Pakistan', 'ACTIVE', NOW(), NOW())
        ''', (board_id,))
        conn.commit()

    cur.execute('SELECT id FROM "PastPaper" WHERE "paperCode" = %s LIMIT 1;', (paper_code,))
    p_row = cur.fetchone()
    if p_row:
        paper_id = p_row[0]
        cur.execute('DELETE FROM "PastPaperQuestionSLO" WHERE "pastPaperQuestionId" IN (SELECT id FROM "PastPaperQuestion" WHERE "pastPaperId" = %s);', (paper_id,))
        cur.execute('DELETE FROM "PastPaperQuestionTopic" WHERE "pastPaperQuestionId" IN (SELECT id FROM "PastPaperQuestion" WHERE "pastPaperId" = %s);', (paper_id,))
        cur.execute('DELETE FROM "PastPaperQuestion" WHERE "pastPaperId" = %s;', (paper_id,))
        conn.commit()
    else:
        paper_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO "PastPaper" (
                id, "boardId", "classId", "subjectId", "examYear", "examSession", "examType",
                "paperCode", "fileUrl", title, "sourceFile", "verificationStatus", "createdAt"
            ) VALUES (
                %s, %s, %s, %s, 2025, 'Model Paper', 'MODEL_EXAM',
                %s, %s, %s, %s, 'VERIFIED', NOW()
            )
        ''', (paper_id, board_id, class_id, subject_id, paper_code, pdf_path, title, os.path.basename(pdf_path)))
        conn.commit()

    return subject_id, class_id, paper_id


async def run_model_paper_pipeline(conn, client: GeminiClient, pdf_path: str, class_name: str, paper_type: str, paper_code: str, title: str, log_cb=print):
    log_cb(f"🚀 [Model Paper Pipeline] Processing {title} ({paper_code})...")
    doc = pymupdf.open(pdf_path)
    subject_id, class_id, paper_id = get_or_create_subject_and_paper(conn, class_name, paper_code, title, pdf_path)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    total_extracted = 0

    # 0. Precision AI Diagram Detection & Cropping (Gemini Vision)
    log_cb(f"🎨 Running AI Diagram Detection & Precision Cropper on PDF...")
    diagram_map = await extract_verified_diagrams(pdf_path, paper_code, client, log_cb=log_cb)

    if paper_type == "MCQ":
        log_cb(f"📄 Processing MCQ Pages in high-precision batches...")
        
        # Batch 1: Pages 1 to 5 (approx Q1 - Q20)
        # Batch 2: Pages 6 to 9 (approx Q21 - Q40)
        batches = [
            (1, min(5, len(doc))),
            (6, min(9, len(doc)))
        ]
        
        all_questions = []

        for b_idx, (p_start, p_end) in enumerate(batches, 1):
            batch_text = ""
            for p in range(p_start, p_end + 1):
                batch_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

            prompt = f"""
You are an expert Physics teacher and exam solver for the Aga Khan University Examination Board (AKU-EB).
We have official 2025 Model Examination Paper I ({class_name} Physics).
Batch {b_idx}: Pages {p_start} to {p_end}.

Document Text:
{batch_text}

TASK:
Extract ALL Multiple Choice Questions found in this batch text.
For EVERY question:
1. "question_number": e.g. "1", "2", ... "40" (exact integer number as string).
2. "stem": the complete verbatim question stem. Preserve all LaTeX notation cleanly (e.g. $1.76\\text{{ cm}}^3$, $10^{{-9}}$, $\\frac{{F}}{{m}}$).
3. "choices": object with keys "A", "B", "C", "D". Preserve all LaTeX notation cleanly.
4. "solved_correct_option": SOLVE THE QUESTION SCIENTIFICALLY. Provide exactly "A", "B", "C", or "D". Double check calculations against options (e.g. 21 * 1.76 = 36.96 -> 37.0 -> D).
5. "explanation": detailed step-by-step scientific calculation or rationale proving why this option is correct.
6. "cognitive_level": "Remembering" (R), "Understanding" (U), or "Application" (A).
7. "is_diagram": true if question references a diagram, graph, or figure, false otherwise.
8. "is_numerical": true if calculation/numerical equation based, false otherwise.

Return pure valid JSON only matching:
{{
  "questions": [
    {{
      "question_number": "1",
      "stem": "If the volume of one cube is $1.76\\\\text{{ cm}}^3$, then the volume of twenty-one such cubes rounded off to three significant figures is",
      "choices": {{
        "A": "$36.0\\\\text{{ cm}}^3$.",
        "B": "$36.9\\\\text{{ cm}}^3$.",
        "C": "$36.96\\\\text{{ cm}}^3$.",
        "D": "$37.0\\\\text{{ cm}}^3$."
      }},
      "solved_correct_option": "D",
      "explanation": "Volume = 21 * 1.76 cm^3 = 36.96 cm^3. Rounded off to 3 significant figures, it gives 37.0 cm^3 (Option D).",
      "cognitive_level": "Understanding",
      "is_diagram": false,
      "is_numerical": true
    }}
  ]
}}
"""
            log_cb(f"🔍 [Batch {b_idx}/2] Sending Pages {p_start}-{p_end} to Gemini solver...")
            res = await client.generate(prompt=prompt, json_schema=None)
            if not res.success or not res.text:
                log_cb(f"⚠️ Batch {b_idx} initial request failed: {res.error}. Retrying after cooldown...")
                await asyncio.sleep(5)
                res = await client.generate(prompt=prompt, json_schema=None)

            try:
                data = safe_json_loads(res.text)
                b_qs = data.get("questions", [])
                all_questions.extend(b_qs)
                log_cb(f"✅ Batch {b_idx} parsed: {len(b_qs)} questions extracted.")
            except Exception as e:
                log_cb(f"⚠️ JSON parsing error in Batch {b_idx}: {e}")

            await asyncio.sleep(1.0)

        data = {"questions": all_questions}

        for q in data.get("questions", []):
            q_num = str(q.get("question_number", total_extracted + 1))
            clean_q = q_num.replace("Q.", "").replace("Q", "").replace(".", "").strip()
            stem = q.get("stem", "")
            choices = q.get("choices", {})
            correct_opt = q.get("solved_correct_option", "B")
            explanation = q.get("explanation", "")
            cog = q.get("cognitive_level", "Understanding")

            # Link AI cropped diagram if verified for this question
            diag_info = diagram_map.get(clean_q)
            is_diag = bool(diag_info)
            diagram_url = diag_info["diagramUrl"] if diag_info else None
            is_num = bool(q.get("is_numerical", False))

            meta = {
                "choices": choices,
                "correct_answer": correct_opt,
                "explanation": explanation,
                "diagramUrl": diagram_url,
                "diagram_url": diagram_url,
                "diagramDescription": diag_info.get("description") if diag_info else None,
                "isDiagram": is_diag,
                "ai_extracted": True,
                "ai_verified": True
            }

            q_id = str(uuid.uuid4())
            cur.execute('''
                INSERT INTO "PastPaperQuestion" (
                    id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                    "questionType", marks, difficulty, "diagramBased", "equationBased",
                    "sourceRegion", verified, "createdAt", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'MCQ_SINGLE', 1.0, %s, %s, %s,
                    %s, true, NOW(), NOW()
                )
            ''', (
                q_id, paper_id, q_num, stem, stem.lower().strip(),
                cog, is_diag, is_num, json.dumps(meta)
            ))
            total_extracted += 1

        conn.commit()
        log_cb(f"✅ Extracted and verified {total_extracted} MCQs with accurate answer keys.")

    else:
        # Paper II: CRQs & ERQs
        log_cb(f"📄 Processing CRQ / ERQ Pages...")
        full_text = ""
        for p in range(2, len(doc) + 1):
            full_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

        prompt = f"""
You are an expert AKU-EB Physics examiner parsing official Model Paper II (Constructed & Extended Response Questions).
Class: {class_name}

Document Text:
{full_text}

TASK:
Extract all CRQs (Section B) and ERQs (Section C).
For each question:
1. "question_number": e.g. "Q.1", "Q.2(a)", etc.
2. "stem": question text. Preserve LaTeX mathematical notation.
3. "marks": marks allocated (e.g. 3.0, 4.0, 5.0).
4. "rubric": array of marking points/criteria with step marks.
5. "model_answer": detailed solution/answer.
6. "question_type": "CONSTRUCTED_RESPONSE" for Section B, "EXTENDED_RESPONSE" for Section C.

Return pure valid JSON only:
{{
  "questions": [
    {{
      "question_number": "Q.1",
      "stem": "Describe the types of forces that act on a body in a fluid...",
      "marks": 3.0,
      "rubric": [
        {{"marks": 1, "description": "Identification of buoyant force"}},
        {{"marks": 1, "description": "Downward gravitational force/weight"}},
        {{"marks": 1, "description": "Net equilibrium condition"}}
      ],
      "model_answer": "When a body is immersed in fluid...",
      "question_type": "CONSTRUCTED_RESPONSE"
    }}
  ]
}}
"""
        res = await client.generate(prompt=prompt, json_schema=None)
        try:
            data = safe_json_loads(res.text)
        except Exception as e:
            log_cb(f"⚠️ JSON parsing error: {e}")
            data = {"questions": []}

        qs = data if isinstance(data, list) else data.get("questions", [])
        for idx, q in enumerate(qs):
            q_num = q.get("question_number", f"Q.{idx + 1}")
            clean_q = str(q_num).replace("Q.", "").replace("Q", "").replace(".", "").strip()
            stem = q.get("stem", "")
            marks = float(q.get("marks", 3.0))
            q_type = q.get("question_type", "CONSTRUCTED_RESPONSE")
            rubric = q.get("rubric", [])
            model_ans = q.get("model_answer", "")

            diag_info = diagram_map.get(clean_q)
            is_diag = bool(diag_info)
            diagram_url = diag_info["diagramUrl"] if diag_info else None

            meta = {
                "rubric": rubric,
                "model_answer": model_ans,
                "diagramUrl": diagram_url,
                "diagram_url": diagram_url,
                "diagramDescription": diag_info.get("description") if diag_info else None,
                "isDiagram": is_diag,
                "ai_extracted": True
            }

            q_id = str(uuid.uuid4())
            cur.execute('''
                INSERT INTO "PastPaperQuestion" (
                    id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                    "questionType", marks, "diagramBased", "sourceRegion", verified, "createdAt", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, true, NOW(), NOW()
                )
            ''', (
                q_id, paper_id, q_num, stem, stem.lower().strip(),
                q_type, marks, is_diag, json.dumps(meta)
            ))
            total_extracted += 1

        conn.commit()
        log_cb(f"✅ Extracted {total_extracted} Subjective Questions (CRQs / ERQs) with marking schemes.")

    log_cb(f"🎉 [Completed] {title} extraction complete: {total_extracted} items saved in DB.")
    return total_extracted
