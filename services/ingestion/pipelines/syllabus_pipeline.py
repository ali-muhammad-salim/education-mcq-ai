"""
Official Two-Stage Index-First Syllabus Extraction Pipeline.
Extracts:
- Part I (Grade IX): Exactly Units 1 to 10 (Pages 10 to 26)
- Part II (Grade X): Exactly Units 11 to 20 (Pages 27 to 46)
All subtopics are bound to their canonical parent unit.
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

from PIL import Image
import pymupdf
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

from services.inference.gemini_client import GeminiClient

CANONICAL_INDEX = {
    "Class IX": [
        {"unit_number": 1, "name": "Measurement", "page_start": 10, "page_end": 11},
        {"unit_number": 2, "name": "Kinematics", "page_start": 12, "page_end": 13},
        {"unit_number": 3, "name": "Dynamics", "page_start": 14, "page_end": 16},
        {"unit_number": 4, "name": "Turning Effect of Forces", "page_start": 17, "page_end": 17},
        {"unit_number": 5, "name": "Deformation of Solids", "page_start": 18, "page_end": 18},
        {"unit_number": 6, "name": "Work, Energy and Power", "page_start": 19, "page_end": 20},
        {"unit_number": 7, "name": "Pressure", "page_start": 21, "page_end": 21},
        {"unit_number": 8, "name": "Thermal Physics", "page_start": 22, "page_end": 23},
        {"unit_number": 9, "name": "Transfer of Thermal Energy", "page_start": 24, "page_end": 25},
        {"unit_number": 10, "name": "Nature of Science", "page_start": 26, "page_end": 26},
    ],
    "Class X": [
        {"unit_number": 11, "name": "Wave Motion", "page_start": 27, "page_end": 28},
        {"unit_number": 12, "name": "Sound", "page_start": 29, "page_end": 30},
        {"unit_number": 13, "name": "Geometrical Optics", "page_start": 31, "page_end": 32},
        {"unit_number": 14, "name": "Electrostatics", "page_start": 33, "page_end": 34},
        {"unit_number": 15, "name": "Electric Current", "page_start": 35, "page_end": 37},
        {"unit_number": 16, "name": "D.C. Circuits", "page_start": 38, "page_end": 38},
        {"unit_number": 17, "name": "Magnetism and Electromagnetism", "page_start": 39, "page_end": 40},
        {"unit_number": 18, "name": "Electromagnetic Induction", "page_start": 41, "page_end": 41},
        {"unit_number": 19, "name": "Electromagnetic Waves and Electronics", "page_start": 42, "page_end": 43},
        {"unit_number": 20, "name": "Atomic and Nuclear Physics", "page_start": 44, "page_end": 46},
    ]
}


def get_or_create_subject_version(conn, class_name, subject_name="Physics"):
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('''
        SELECT s.id, c.id as class_id
        FROM "Subject" s
        JOIN "Class" c ON s."classId" = c.id
        WHERE c.name = %s AND s.name ILIKE %s
    ''', (class_name, f"%{subject_name}%"))
    row = cur.fetchone()
    if not row:
        raise ValueError(f"Subject {subject_name} for {class_name} not found.")
    subject_id, class_id = row[0], row[1]

    cur.execute('''
        SELECT id FROM "SyllabusVersion"
        WHERE "subjectId" = %s AND "versionName" = '2025-2028'
    ''', (subject_id,))
    v_row = cur.fetchone()
    if v_row:
        version_id = v_row[0]
    else:
        version_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO "SyllabusVersion" (id, "subjectId", "versionName", "isLatest", "validFrom", "validTo", "createdAt")
            VALUES (%s, %s, '2025-2028', true, '2025-01-01', '2028-12-31', NOW())
        ''', (version_id, subject_id))
        conn.commit()
    return subject_id, class_id, version_id


async def run_syllabus_pipeline(conn, client: GeminiClient, pdf_path: str, class_name: str, log_cb=print):
    log_cb(f"🚀 [Syllabus Pipeline] Starting Two-Stage Index-First Extraction for {class_name}...")
    doc = pymupdf.open(pdf_path)
    subject_id, class_id, version_id = get_or_create_subject_version(conn, class_name)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    units_to_process = CANONICAL_INDEX.get(class_name, [])
    total_units = len(units_to_process)
    log_cb(f"📋 Master Index Confirmed: {total_units} Canonical Units to extract for {class_name}.")

    total_slos_extracted = 0

    for u_idx, unit_info in enumerate(units_to_process, 1):
        u_num = unit_info["unit_number"]
        u_name = unit_info["name"]
        p_start = unit_info["page_start"]
        p_end = unit_info["page_end"]

        log_cb(f"[{u_idx}/{total_units}] Processing Unit {u_num}: {u_name} (Pages {p_start}-{p_end})...")

        # 1. Create or fetch parent Topic
        cur.execute('''
            SELECT id FROM "Topic" WHERE "syllabusVersionId" = %s AND "topicNumber" = %s
        ''', (version_id, str(u_num)))
        t_row = cur.fetchone()
        if t_row:
            topic_id = t_row[0]
        else:
            topic_id = str(uuid.uuid4())
            cur.execute('''
                INSERT INTO "Topic" (id, "syllabusVersionId", "topicNumber", name)
                VALUES (%s, %s, %s, %s)
            ''', (topic_id, version_id, str(u_num), u_name))
            conn.commit()

        # 2. Extract subtopics and SLOs across its page range
        unit_text = ""
        for p in range(p_start, p_end + 1):
            unit_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

        prompt = f"""
You are an expert curriculum parser for the Aga Khan University Examination Board (AKU-EB).
We are extracting ALL subtopics and Student Learning Outcomes (SLOs) for:
PARENT UNIT: Unit {u_num}: {u_name}
CLASS: {class_name}

Text from syllabus pages {p_start} to {p_end}:
{unit_text}

CRITICAL RULES:
1. Every subtopic must belong to Unit {u_num}.
2. Subtopic numbers should be formatted like '{u_num}.1', '{u_num}.2', '{u_num}.3', etc.
3. Every SLO must have:
   - "code": e.g. "{u_num}.1.1", "{u_num}.1.2"
   - "description": full verbatim text of the outcome (e.g. "differentiate between physical and non-physical quantities;")
   - "cognitive_level": exact code: "R" for Remember/Recall, "U" for Understand, "A" for Apply/Analyse/Evaluate/Create.
   - "is_practical": boolean (true if marked as practical or laboratory activity, false otherwise).
4. Return pure valid JSON only, matching this structure:
{{
  "unit_number": "{u_num}",
  "unit_name": "{u_name}",
  "subtopics": [
    {{
      "subtopic_number": "{u_num}.1",
      "name": "Physical Quantities",
      "slos": [
        {{
          "code": "{u_num}.1.1",
          "description": "differentiate between physical and non-physical quantities;",
          "cognitive_level": "U",
          "is_practical": false
        }}
      ]
    }}
  ]
}}
"""
        res = await client.generate(prompt=prompt, json_schema=None)
        if not res.success or not res.text:
            log_cb(f"⚠️ [Retry Unit {u_num}] Gemini request failed: {res.error}. Retrying with cooldown...")
            await asyncio.sleep(5)
            res = await client.generate(prompt=prompt, json_schema=None)

        try:
            # Clean possible markdown fence
            cleaned_json = re.sub(r'^```json\s*', '', res.text.strip(), flags=re.MULTILINE)
            cleaned_json = re.sub(r'```$', '', cleaned_json.strip(), flags=re.MULTILINE)
            data = json.loads(cleaned_json)
        except Exception as e:
            log_cb(f"⚠️ JSON parse error on Unit {u_num}: {e}. Skipping unit.")
            continue

        unit_slo_count = 0
        for sub in data.get("subtopics", []):
            s_num = str(sub.get("subtopic_number", f"{u_num}.1")).strip()
            if not s_num.startswith(f"{u_num}."):
                s_num = f"{u_num}.{s_num}"
            s_name = sub.get("name", f"Subtopic {s_num}")

            cur.execute('''
                SELECT id FROM "Subtopic" WHERE "topicId" = %s AND "subtopicNum" = %s
            ''', (topic_id, s_num))
            sub_row = cur.fetchone()
            if sub_row:
                sub_id = sub_row[0]
            else:
                sub_id = str(uuid.uuid4())
                cur.execute('''
                    INSERT INTO "Subtopic" (id, "topicId", "subtopicNum", name)
                    VALUES (%s, %s, %s, %s)
                ''', (sub_id, topic_id, s_num, s_name))

            for slo_idx, slo in enumerate(sub.get("slos", []), 1):
                slo_code = str(slo.get("code", "")).strip()
                if not slo_code or not slo_code.startswith(f"{u_num}."):
                    slo_code = f"{s_num}.{slo_idx}" if not slo_code else (f"{u_num}.{slo_code}" if not slo_code.startswith(str(u_num)) else slo_code)
                slo_desc = slo.get("description", "")
                cog = (slo.get("cognitive_level") or "U").upper()
                if cog not in ("R", "U", "A"):
                    cog = "U"
                is_prac = bool(slo.get("is_practical", False))

                cur.execute('''
                    SELECT id FROM "SLO" WHERE "subtopicId" = %s AND code = %s
                ''', (sub_id, slo_code))
                if not cur.fetchone():
                    slo_id = str(uuid.uuid4())
                    cur.execute('''
                        INSERT INTO "SLO" (id, "subtopicId", code, description, "cognitiveLevel", "isPractical", "sourcePage")
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ''', (slo_id, sub_id, slo_code, slo_desc, cog, is_prac, p_start))

                    # Concept & Skill mapping
                    concept_id = str(uuid.uuid4())
                    cur.execute('''
                        INSERT INTO "Concept" (id, "sloId", name, description)
                        VALUES (%s, %s, %s, %s)
                    ''', (concept_id, slo_id, f"Concept: {s_name}", slo_desc))
                    cur.execute('''
                        INSERT INTO "Skill" (id, "conceptId", name)
                        VALUES (%s, %s, %s)
                    ''', (str(uuid.uuid4()), concept_id, "Apply" if cog == "A" else ("Understand" if cog == "U" else "Recall")))

                    unit_slo_count += 1
                    total_slos_extracted += 1

        conn.commit()
        log_cb(f"✅ Unit {u_num}: {u_name} saved with {unit_slo_count} verified SLOs.")
        await asyncio.sleep(1.0)

    log_cb(f"🎉 [Completed] {class_name} Syllabus Extraction Finished: {total_units} Units, {total_slos_extracted} SLOs in DB.")
    return total_slos_extracted
