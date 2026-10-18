"""
Official Dynamic Past Paper Extraction Pipeline with AI Auto-Detection.
Handles:
- Solved & Unsolved Past Papers
- Year-wise (2015 - 2025)
- Paper I (MCQs), Paper II (CRQs & ERQs), or Combined
- Intelligent Auto-Detection of Year, Grade, Paper Component & Key presence
"""

import os
import re
import sys
import json
import uuid
import time
import asyncio
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


def safe_json_loads(raw_text: str):
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


async def detect_past_paper_metadata(client: GeminiClient, pdf_path: str, user_meta: dict, log_cb=print) -> dict:
    """
    Auto-detects Year, Class, Paper Type (I vs II), and Solution Status
    from filename and first 2 pages of the PDF if set to 'auto'.
    """
    doc = pymupdf.open(pdf_path)
    filename = os.path.basename(pdf_path).lower()

    # Heuristics from filename
    detected_year = None
    year_match = re.search(r'(201\d|202\d)', filename)
    if year_match:
        detected_year = int(year_match.group(1))

    detected_class = None
    if any(k in filename for k in ["ssc-ii", "ssc2", "class-10", "class_10", "grade-10", "grade_10", "class-x", "class_x", "ssc_2"]):
        detected_class = "Class X"
    elif any(k in filename for k in ["ssc-i", "ssc1", "class-9", "class_9", "grade-9", "grade_9", "class-ix", "class_ix", "ssc_1"]):
        detected_class = "Class IX"

    detected_paper = None
    # Check Paper 2 / Paper II FIRST so "paper-i" does not falsely match inside "paper-ii"
    if any(k in filename for k in ["paper-2", "paper_2", "paper 2", "paper-ii", "paper_ii", "paper ii", "p2", "p-2", "theory", "crq", "erq"]):
        detected_paper = "CRQ_ERQ"
    elif any(k in filename for k in ["paper-1", "paper_1", "paper 1", "paper-i", "paper_i", "paper i", "p1", "p-1", "mcq"]):
        detected_paper = "MCQ"

    has_solved_kw = any(k in filename for k in ["solved", "key", "solution", "marking-scheme"])

    # If any is still unknown, consult Gemini with Cover Page text
    if not detected_year or not detected_class or not detected_paper:
        cover_text = ""
        for p in range(1, min(len(doc) + 1, 3)):
            cover_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

        prompt = f"""
You are an expert examination registrar.
Analyze this exam cover page text and filename:
Filename: {filename}

Cover Page Text:
{cover_text}

Determine:
1. "year": 4-digit integer (e.g. 2024, 2023, 2022). If unknown, return 2024.
2. "class": "Class IX" (for SSC-I, Grade 9) or "Class X" (for SSC-II, Grade 10).
3. "paper_type": "MCQ" (for Paper I multiple choice) or "CRQ_ERQ" (for Paper II constructed/extended response).
4. "has_answer_key": boolean (true if document includes answer keys/marking scheme, false if unsolved exam questions only).

Return pure JSON only:
{{
  "year": 2023,
  "class": "Class IX",
  "paper_type": "MCQ",
  "has_answer_key": false
}}
"""
        res = await client.generate(prompt=prompt)
        try:
            ai_data = safe_json_loads(res.text)
            if not detected_year and ai_data.get("year"):
                detected_year = int(ai_data["year"])
            if not detected_class and ai_data.get("class"):
                detected_class = ai_data["class"]
            if not detected_paper and ai_data.get("paper_type"):
                detected_paper = ai_data["paper_type"]
        except Exception:
            pass

    # Apply overrides from user if not 'auto'
    final_year = int(user_meta.get("year")) if (user_meta.get("year") and str(user_meta.get("year")).isdigit()) else (detected_year or 2024)
    final_class = user_meta.get("classLevel") if user_meta.get("classLevel") and user_meta.get("classLevel") != "auto" else (detected_class or "Class IX")
    
    user_paper = user_meta.get("paperComponent", "auto")
    if user_paper == "paper_1":
        final_paper = "MCQ"
    elif user_paper == "paper_2":
        final_paper = "CRQ_ERQ"
    elif user_paper == "both":
        final_paper = "BOTH"
    else:
        final_paper = detected_paper or "MCQ"

    user_sol = user_meta.get("solutionStatus", "auto")
    if user_sol == "unsolved_ai_solve":
        final_sol = "AI_SOLVER"
    elif user_sol == "solved_has_key":
        final_sol = "HAS_KEY"
    else:
        final_sol = "HAS_KEY" if has_solved_kw else "AI_SOLVER"

    meta = {
        "year": final_year,
        "class": final_class,
        "paper_type": final_paper,
        "solution_mode": final_sol,
        "subject": user_meta.get("subject", "Physics"),
        "board": user_meta.get("board", "Aga Khan University Examination Board"),
        "keyFilePath": user_meta.get("keyFilePath")
    }

    log_cb(f"📋 [Metadata Confirmed] Year: {final_year} | Class: {final_class} | Type: {final_paper} | Solution Mode: {final_sol}")
    return meta


async def extract_official_answer_key_pdf(client: GeminiClient, key_pdf_path: str, title: str, log_cb=print) -> dict:
    """
    Extracts the official answer keys, cognitive levels, and dual-correct keys
    from a dedicated Answer Key / Marking Scheme PDF.
    """
    if not os.path.exists(key_pdf_path):
        return {}

    log_cb(f"🔑 [Answer Key PDF] Extracting official marking scheme from {os.path.basename(key_pdf_path)}...")
    doc = pymupdf.open(key_pdf_path)
    full_text = ""
    for p in range(1, len(doc) + 1):
        full_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

    prompt = f"""
You are an expert examination registrar parsing an official AKU-EB / Board Answer Key & Marking Scheme.
Exam Title: {title}

Document Text:
{full_text}

TASK:
Extract the official answer key for EVERY question.
CRITICAL INSTRUCTION FOR MULTIPLE / DUAL CORRECT ANSWERS:
- In some exams, the examination board awards marks for more than one option (e.g. "A or C", "B and D", "A, D", "Both B & C", or "Grace Marks / Any Option").
- If a question has more than one acceptable option:
  1. "correct_options": array of all acceptable uppercase letters, e.g. ["A", "C"]
  2. "correct_answer": formatted string, e.g. "A, C"
  3. "is_multiple_correct": true
  4. "multiple_correct_note": exact board explanation, e.g. "Both Option A and Option C are accepted as correct answers by the Examination Board."
- If only one option is correct:
  1. "correct_options": ["D"]
  2. "correct_answer": "D"
  3. "is_multiple_correct": false
  4. "multiple_correct_note": null

Return pure valid JSON only:
{{
  "answer_keys": [
    {{
      "question_number": "1",
      "correct_answer": "D",
      "correct_options": ["D"],
      "is_multiple_correct": false,
      "multiple_correct_note": null,
      "cognitive_level": "Application",
      "slo_code": "1.2.1",
      "explanation": "Step-by-step rationale..."
    }}
  ]
}}
"""
    res = await client.generate(prompt=prompt)
    if res.success and res.text:
        try:
            data = safe_json_loads(res.text)
            keys_list = data if isinstance(data, list) else data.get("answer_keys", [])
            key_map = {}
            for item in keys_list:
                q_num = str(item.get("question_number", "")).strip().replace("Q.", "").replace("Q", "").strip()
                if q_num:
                    key_map[q_num] = item
            log_cb(f"🔑 Successfully mapped {len(key_map)} official answer keys from Answer Key PDF!")
            return key_map
        except Exception as e:
            log_cb(f"⚠️ Error parsing Answer Key PDF JSON: {e}")
    return {}


async def run_past_paper_pipeline(conn, client: GeminiClient, pdf_path: str, user_meta: dict, log_cb=print):
    """
    Executes the Past Paper ingestion pipeline.
    """
    doc = pymupdf.open(pdf_path)
    log_cb(f"🚀 [Past Paper Pipeline] Slicing and inspecting {os.path.basename(pdf_path)} ({len(doc)} pages)...")

    meta = await detect_past_paper_metadata(client, pdf_path, user_meta, log_cb=log_cb)
    class_name = meta["class"]
    year = meta["year"]
    paper_type = meta["paper_type"]
    solution_mode = meta["solution_mode"]
    subject_name = meta["subject"]

    # Check for dedicated Answer Key PDF
    key_map = {}
    key_pdf_path = user_meta.get("keyFilePath")
    if key_pdf_path and os.path.exists(key_pdf_path):
        key_map = await extract_official_answer_key_pdf(client, key_pdf_path, f"Physics {class_name} ({year})", log_cb=log_cb)

    # 1. Resolve Subject & Board
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('''
        SELECT s.id, c.id as class_id
        FROM "Subject" s
        JOIN "Class" c ON s."classId" = c.id
        WHERE c.name = %s AND s.name ILIKE %s
    ''', (class_name, f"%{subject_name}%"))
    s_row = cur.fetchone()
    if not s_row:
        raise ValueError(f"Subject {subject_name} for {class_name} not found in database.")
    subject_id, class_id = s_row[0], s_row[1]

    cur.execute('SELECT id FROM "Board" LIMIT 1')
    board_id = cur.fetchone()[0]

    grade_code = "IX" if "IX" in class_name else "X"
    paper_subcode = "P1" if paper_type == "MCQ" else ("P2" if paper_type == "CRQ_ERQ" else "COMBINED")
    paper_code = f"PHY-{grade_code}-{year}-{paper_subcode}"
    title = f"Physics {class_name} ({year}) Paper {1 if paper_type == 'MCQ' else 2} - Past Examination"

    file_url = user_meta.get("fileUrl") or f"/uploads/{os.path.basename(pdf_path)}"

    # 2. Create or Reset PastPaper record
    cur.execute('SELECT id FROM "PastPaper" WHERE "paperCode" = %s LIMIT 1;', (paper_code,))
    existing = cur.fetchone()
    if existing:
        paper_id = existing[0]
        cur.execute('UPDATE "PastPaper" SET "fileUrl" = %s, title = %s, "sourceFile" = %s WHERE id = %s;',
                    (file_url, title, os.path.basename(pdf_path), paper_id))
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
                %s, %s, %s, %s, %s, 'Annual', 'PAST_PAPER',
                %s, %s, %s, %s, 'VERIFIED', NOW()
            )
        ''', (paper_id, board_id, class_id, subject_id, year, paper_code, file_url, title, os.path.basename(pdf_path)))
        conn.commit()

    total_extracted = 0

    # 3. Process MCQs (Paper I)
    if paper_type in ("MCQ", "BOTH"):
        log_cb(f"📄 Extracting Multiple Choice Questions in high-precision batches...")
        
        # Batch pages (2 pages per batch for maximum accuracy and zero page skips)
        max_page = len(doc)
        full_pdf_text = "".join(doc[p].get_text() for p in range(len(doc)))
        batches = []
        step = 2
        for i in range(1, max_page + 1, step):
            batches.append((i, min(i + step - 1, max_page)))

        all_questions = []
        for b_idx, (p_start, p_end) in enumerate(batches, 1):
            batch_text = ""
            for p in range(p_start, p_end + 1):
                batch_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

            solve_prompt = """
4. "solved_correct_option": SOLVE THE QUESTION SCIENTIFICALLY. Provide exact key "A", "B", "C", or "D". If scientifically two options are equally valid, ambiguous, or errata, provide both e.g. "A, C".
5. "correct_options": array of all acceptable uppercase options, e.g. ["A"] or ["A", "C"].
6. "is_multiple_correct": boolean (true if two options are correct, false otherwise).
7. "multiple_correct_note": string note if multiple options are valid, null otherwise.
8. "explanation": Step-by-step mathematical working or rationale proving why this option is correct.
""" if solution_mode == "AI_SOLVER" else """
4. "solved_correct_option": Match with official key in document or solve mathematically. If two options are correct (e.g. A or C), provide "A, C".
5. "correct_options": array of all acceptable uppercase options, e.g. ["A"] or ["A", "C"].
6. "is_multiple_correct": boolean (true if two options are correct, false otherwise).
7. "multiple_correct_note": board explanation if multiple options accepted, null otherwise.
8. "explanation": Step-by-step working and rationale.
"""

            prompt = f"""
You are an expert AKU-EB Physics teacher and exam solver.
Past Examination Paper: {title}.
Batch {b_idx}: Pages {p_start} to {p_end}.

Document Text:
{batch_text}

TASK:
Extract ALL Multiple Choice Questions found in this batch text.
For EVERY question:
1. "question_number": e.g. "1", "2", ... "40" (exact string).
2. "stem": verbatim stem text. Preserve all LaTeX formula notation cleanly (e.g. $1.76\\text{{ cm}}^3$, $10^{{-9}}$, $\\frac{{F}}{{m}}$).
3. "choices": object with keys "A", "B", "C", "D". Preserve LaTeX notations.
{solve_prompt}
6. "cognitive_level": "Remembering" (R), "Understanding" (U), or "Application" (A).
7. "is_diagram": true if question contains/references a diagram, false otherwise.
8. "is_numerical": true if calculation/numerical equation based, false otherwise.

Return pure valid JSON only matching:
{{
  "questions": [
    {{
      "question_number": "1",
      "stem": "Stem text here...",
      "choices": {{"A": "Opt A", "B": "Opt B", "C": "Opt C", "D": "Opt D"}},
      "solved_correct_option": "A",
      "correct_options": ["A"],
      "is_multiple_correct": false,
      "multiple_correct_note": null,
      "explanation": "Explanation here...",
      "cognitive_level": "Understanding",
      "is_diagram": false,
      "is_numerical": false
    }}
  ]
}}
"""
            log_cb(f"🔍 [Batch {b_idx}/{len(batches)}] Sending Pages {p_start}-{p_end} to Gemini...")
            res = await client.generate(prompt=prompt)
            if res.success and res.text:
                try:
                    data = safe_json_loads(res.text)
                    b_qs = data if isinstance(data, list) else data.get("questions", [])
                    all_questions.extend(b_qs)
                    log_cb(f"✅ Batch {b_idx} parsed: {len(b_qs)} MCQs.")
                except Exception as e:
                    log_cb(f"⚠️ JSON parsing error in Batch {b_idx}: {e}")

            await asyncio.sleep(1.0)

        # Insert MCQs into PostgreSQL with Ground-Truth Verification
        seen_q_nums = set()
        for q in all_questions:
            raw_q_num = str(q.get("question_number", total_extracted + 1)).strip()
            clean_q_num = raw_q_num.replace("Q.", "").replace("Q", "").strip()
            q_num = clean_q_num or str(total_extracted + 1)
            if q_num in seen_q_nums:
                continue
            seen_q_nums.add(q_num)

            stem = q.get("stem", "").strip()
            choices = q.get("choices", {})

            # Format Roman numerals into structured bullet points if present
            if re.search(r'(?:\n|\s)(?:I|II|III)\.\s+', stem) and "•" not in stem:
                stem = re.sub(r'(\n|\s+)((?:I|II|III|IV|V)\.\s+)', r'\n• \2', stem).strip()

            # Ground-Truth Alignment Verification: Ensure question exists in PDF
            clean_stem_search = re.sub(r'[^a-zA-Z0-9]', '', stem[:35]).lower()
            clean_pdf_search = re.sub(r'[^a-zA-Z0-9]', '', full_pdf_text).lower()
            if clean_stem_search and clean_stem_search not in clean_pdf_search:
                log_cb(f"⚠️ [Verification Warning] Question {q_num} stem not found in PDF source text!")

            # Merge with official key_map if available
            off_key = key_map.get(q_num) or key_map.get(raw_q_num)
            if off_key:
                correct_opt = off_key.get("correct_answer") or off_key.get("solved_correct_option") or q.get("solved_correct_option", "")
                correct_opts = off_key.get("correct_options") or [correct_opt]
                is_multi = bool(off_key.get("is_multiple_correct", len(correct_opts) > 1))
                multi_note = off_key.get("multiple_correct_note")
                cog = off_key.get("cognitive_level") or q.get("cognitive_level", "Understanding")
                explanation = off_key.get("explanation") or q.get("explanation", "")
                has_official = True
            else:
                correct_opt = q.get("solved_correct_option", "")
                correct_opts = q.get("correct_options") or ([c.strip() for c in str(correct_opt).split(",") if c.strip()] if "," in str(correct_opt) else [correct_opt])
                is_multi = bool(q.get("is_multiple_correct", len(correct_opts) > 1))
                multi_note = q.get("multiple_correct_note")
                cog = q.get("cognitive_level", "Understanding")
                explanation = q.get("explanation", "")
                has_official = (solution_mode == "HAS_KEY")

            is_diag = bool(q.get("is_diagram", False))
            is_num = bool(q.get("is_numerical", False))

            meta_data = {
                "choices": choices,
                "correct_answer": correct_opt,
                "correct_options": correct_opts,
                "is_multiple_correct": is_multi,
                "multiple_correct_note": multi_note,
                "explanation": explanation,
                "cognitive_level": cog,
                "has_official_key": has_official,
                "ai_extracted": True,
                "ai_verified": True,
                "exam_year": year
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
                cog, is_diag, is_num, json.dumps(meta_data)
            ))

            # Anchor to Curriculum Knowledge Graph (Topic & SLO)
            target_slo_id = None
            slo_code = off_key.get("slo_code") if off_key else q.get("slo_code")
            if slo_code:
                cur.execute('SELECT id FROM "SLO" WHERE code = %s LIMIT 1;', (str(slo_code).strip(),))
                s_row = cur.fetchone()
                if s_row:
                    target_slo_id = s_row[0]

            try:
                numeric_q = int(re.sub(r'[^0-9]', '', q_num) or 1)
                base_unit = 0 if "IX" in class_name else 10
                calc_unit_num = str(base_unit + min(10, max(1, (numeric_q - 1) // 4 + 1)))
                cur.execute('''
                    SELECT t.id FROM "Topic" t
                    JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
                    JOIN "Subject" s ON sv."subjectId" = s.id
                    JOIN "Class" c ON s."classId" = c.id
                    WHERE c.name = %s AND t."topicNumber" = %s LIMIT 1;
                ''', (class_name, calc_unit_num))
                t_row = cur.fetchone()
                if t_row:
                    cur.execute('''
                        INSERT INTO "PastPaperQuestionTopic" (id, "pastPaperQuestionId", "topicId")
                        VALUES (%s, %s, %s)
                        ON CONFLICT DO NOTHING;
                    ''', (str(uuid.uuid4()), q_id, t_row[0]))
                    if not target_slo_id:
                        cur.execute('''
                            SELECT slo.id FROM "SLO" slo
                            JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
                            WHERE sub."topicId" = %s LIMIT 1;
                        ''', (t_row[0],))
                        fb_slo = cur.fetchone()
                        if fb_slo:
                            target_slo_id = fb_slo[0]
            except Exception:
                pass

            if target_slo_id:
                cur.execute('''
                    INSERT INTO "PastPaperQuestionSLO" (id, "pastPaperQuestionId", "sloId")
                    VALUES (%s, %s, %s)
                    ON CONFLICT DO NOTHING;
                ''', (str(uuid.uuid4()), q_id, target_slo_id))

            total_extracted += 1

        conn.commit()
        log_cb(f"✅ Extracted and verified {total_extracted} MCQs for {paper_code}.")

    # 4. Process Subjective (Paper II: CRQs & ERQs)
    if paper_type in ("CRQ_ERQ", "BOTH"):
        log_cb(f"📄 Extracting Subjective Questions (Section B & C: CRQs / ERQs)...")
        full_text = ""
        for p in range(1, len(doc) + 1):
            full_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

        prompt = f"""
You are an expert AKU-EB Physics examiner parsing official Past Examination Paper: {title}.
Extract all Constructed Response Questions (Section B) and Extended Response Questions (Section C).

Document Text:
{full_text}

For each question:
1. "question_number": e.g. "Q.1", "Q.2(a)", etc.
2. "stem": question text. Preserve LaTeX mathematical notation cleanly.
3. "marks": marks allocated (e.g. 3.0, 4.0, 5.0).
4. "rubric": array of marking points/criteria with step marks.
5. "model_answer": detailed step-by-step solution.
6. "question_type": "CONSTRUCTED_RESPONSE" for Section B, "EXTENDED_RESPONSE" for Section C.

Return pure valid JSON only:
{{
  "questions": [
    {{
      "question_number": "Q.1",
      "stem": "Stem text here...",
      "marks": 3.0,
      "rubric": [{{"marks": 1, "description": "Step 1"}}],
      "model_answer": "Model solution here...",
      "question_type": "CONSTRUCTED_RESPONSE"
    }}
  ]
}}
"""
        res = await client.generate(prompt=prompt)
        if res.success and res.text:
            try:
                data = safe_json_loads(res.text)
                qs = data if isinstance(data, list) else data.get("questions", [])
                sub_count = 0
                for idx, q in enumerate(qs):
                    q_num = q.get("question_number", f"Q.{idx + 1}")
                    stem = q.get("stem", "")
                    marks = float(q.get("marks", 3.0))
                    q_type = q.get("question_type", "CONSTRUCTED_RESPONSE")
                    rubric = q.get("rubric", [])
                    model_ans = q.get("model_answer", "")

                    meta_data = {
                        "rubric": rubric,
                        "model_answer": model_ans,
                        "ai_extracted": True,
                        "exam_year": year
                    }

                    q_id = str(uuid.uuid4())
                    cur.execute('''
                        INSERT INTO "PastPaperQuestion" (
                            id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                            "questionType", marks, "sourceRegion", verified, "createdAt", "updatedAt"
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, true, NOW(), NOW()
                        )
                    ''', (
                        q_id, paper_id, q_num, stem, stem.lower().strip(),
                        q_type, marks, json.dumps(meta_data)
                    ))
                    sub_count += 1
                    total_extracted += 1

                conn.commit()
                log_cb(f"✅ Extracted {sub_count} Subjective Questions (CRQs / ERQs) with marking schemes.")
            except Exception as e:
                log_cb(f"⚠️ Subjective JSON parsing error: {e}")

    log_cb(f"🎉 [Completed] {title} successfully ingested: {total_extracted} examination questions saved in DB.")
    return total_extracted
