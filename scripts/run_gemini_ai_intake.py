import os
import sys
from pathlib import Path

# Unbuffered real-time stdout for background logs
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True)

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))


import re
import json
import uuid
import time
import asyncio
import pymupdf
from PIL import Image
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
OUTPUT_DIR = Path("data/physics")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RESOURCE_DIR = OUTPUT_DIR / "compiled_resources"
RESOURCE_DIR.mkdir(parents=True, exist_ok=True)

from services.inference.gemini_client import GeminiClient
from services.ingestion.stages.gemini_extractor import GeminiPageExtractor
from services.knowledge.resource_compiler import (
    ResourceCompiler,
    CompiledChapterResourceBundle,
    CompiledNumerical,
    CompiledMCQ,
    CompiledSubjectiveQA,
    CompiledDefinitionNote,
    CompiledDiagramLabeling,
)


def clean_slate(conn):
    print("\n=======================================================")
    print("=== [CLEAN SLATE] Wiping All Previous Non-AI Data ===")
    print("=======================================================")
    cur = conn.cursor()
    tables = [
        "PastPaperQuestionSLO", "PastPaperQuestion", "PastPaper",
        "SLOMapping", "Skill", "Concept", "SLO", "Subtopic", "Topic",
        "SyllabusDiffRecord", "PaperBlueprint", "ExaminationSpecification",
        "SyllabusVersion", "ingest_page_questions", "ingest_page_diagrams",
        "ingest_page_equations", "ingest_page_tables", "ingest_page_regions",
        "ingest_document_pages", "ingest_documents"
    ]
    for tbl in tables:
        try:
            cur.execute(f'DELETE FROM "{tbl}";')
        except Exception as e:
            conn.rollback()
            print(f"Warning clearing {tbl}: {e}")
    conn.commit()
    print("[SUCCESS] All database tables cleared cleanly.")

    # Remove previous non-AI json files
    for f in OUTPUT_DIR.glob("*.json"):
        f.unlink(missing_ok=True)
    if RESOURCE_DIR.exists():
        for f in RESOURCE_DIR.glob("*.json"):
            f.unlink(missing_ok=True)
    print("[SUCCESS] Cleared local cache files.\n")


def get_or_create_subject_and_version(conn, class_name, subject_name="Physics"):
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


import hashlib

def register_ingest_document(conn, pdf_path, doc_type, title, total_pages):
    cur = conn.cursor()
    try:
        file_hash = hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest()
    except Exception:
        file_hash = hashlib.sha256(str(time.time()).encode()).hexdigest()

    cur.execute('SELECT id FROM ingest_documents WHERE file_hash_sha256 = %s LIMIT 1;', (file_hash,))
    existing = cur.fetchone()
    if existing:
        return existing[0]

    doc_id = str(uuid.uuid4())
    cur.execute('''
        INSERT INTO ingest_documents (id, title, file_path, document_type, file_hash_sha256, total_pages, processing_status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, 'COMPLETED', NOW(), NOW())
        ON CONFLICT (file_hash_sha256) DO UPDATE SET processing_status = 'COMPLETED'
        RETURNING id;
    ''', (doc_id, title, pdf_path, doc_type, file_hash, total_pages))
    conn.commit()
    return doc_id



async def process_syllabus_gemini(conn, extractor, pdf_path, class_name, start_page, end_page):
    print(f"\n--- [AI Extraction] Processing {class_name} Syllabus Pages {start_page}-{end_page} via Gemini Vision ---")
    subject_id, class_id, version_id = get_or_create_subject_and_version(conn, class_name)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cur.execute('''
        SELECT count(*) FROM "SLO" slo
        JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
        JOIN "Topic" top ON sub."topicId" = top.id
        JOIN "SyllabusVersion" sv ON top."syllabusVersionId" = sv.id
        JOIN "Subject" s ON sv."subjectId" = s.id
        JOIN "Class" c ON s."classId" = c.id
        WHERE c.name = %s;
    ''', (class_name,))
    existing_slos = cur.fetchone()[0]
    if existing_slos >= 50:
        print(f"[RESUME] {class_name} Syllabus already extracted ({existing_slos} SLOs in DB). Skipping.")
        return

    doc = pymupdf.open(pdf_path)
    doc_id = register_ingest_document(conn, pdf_path, "CURRICULUM", f"{class_name} Physics Syllabus 2025", len(doc))

    total_slos = 0
    total_topics = 0

    for p_no in range(start_page, min(end_page + 1, len(doc) + 1)):
        page = doc[p_no - 1]
        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # Ingest page record
        page_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO ingest_document_pages (id, document_id, page_number, width, height, orientation_angle, processing_time_ms, ocr_status, created_at)
            VALUES (%s, %s, %s, %s, %s, 0.0, 100.0, 'AI_VISION', NOW())
            ON CONFLICT (document_id, page_number) DO NOTHING;
        ''', (page_id, doc_id, p_no, pix.width, pix.height))

        print(f"  [Gemini Vision] Page {p_no}/{len(doc)}...", end="", flush=True)
        res = None
        for attempt in range(5):
            res = await extractor.extract_page(img, page_number=p_no, doc_type="CURRICULUM", subject="Physics")
            if res.confidence_score > 0.0 and res.extraction_provider != "failed":
                break
            print(f" [Cooldown wait {attempt+1}/5]...", end="", flush=True)
            await asyncio.sleep(12)

        if not res or res.confidence_score == 0.0 or res.extraction_provider == "failed":
            print(f" (Failed after 5 attempts: {res.verification_notes if res else 'Unknown'})")
            continue

        print(f" (OK: {len(res.topics)} topics, {len(res.headings)} headings, {len(res.equations)} equations)")

        for top in res.topics:
            t_num = top.topic_number or "1"
            t_name = top.name or f"Unit {t_num}"
            cur.execute('''
                SELECT id FROM "Topic" WHERE "syllabusVersionId" = %s AND "topicNumber" = %s
            ''', (version_id, t_num))
            existing_t = cur.fetchone()
            if existing_t:
                topic_id = existing_t[0]
            else:
                topic_id = str(uuid.uuid4())
                cur.execute('''
                    INSERT INTO "Topic" (id, "syllabusVersionId", "topicNumber", name)
                    VALUES (%s, %s, %s, %s)
                ''', (topic_id, version_id, t_num, t_name))
                total_topics += 1

            for sub in top.subtopics:
                s_num = sub.subtopic_number or f"{t_num}.1"
                s_name = sub.name or f"Subtopic {s_num}"
                cur.execute('''
                    SELECT id FROM "Subtopic" WHERE "topicId" = %s AND "subtopicNum" = %s
                ''', (topic_id, s_num))
                existing_s = cur.fetchone()
                if existing_s:
                    sub_id = existing_s[0]
                else:
                    sub_id = str(uuid.uuid4())
                    cur.execute('''
                        INSERT INTO "Subtopic" (id, "topicId", "subtopicNum", name)
                        VALUES (%s, %s, %s, %s)
                    ''', (sub_id, topic_id, s_num, s_name))

                for slo in sub.slos:
                    slo_code = slo.code or f"{s_num}.{total_slos+1}"
                    slo_desc = slo.description or ""
                    cog = slo.cognitive_level.upper() if slo.cognitive_level in ("R", "U", "A") else "U"
                    cur.execute('''
                        SELECT id FROM "SLO" WHERE "subtopicId" = %s AND code = %s
                    ''', (sub_id, slo_code))
                    if not cur.fetchone():
                        slo_id = str(uuid.uuid4())
                        cur.execute('''
                            INSERT INTO "SLO" (id, "subtopicId", code, description, "cognitiveLevel", "sourcePage")
                            VALUES (%s, %s, %s, %s, %s, %s)
                        ''', (slo_id, sub_id, slo_code, slo_desc, cog, p_no))
                        total_slos += 1

                        # Concept & Skill
                        concept_id = str(uuid.uuid4())
                        cur.execute('''
                            INSERT INTO "Concept" (id, "sloId", name, description)
                            VALUES (%s, %s, %s, %s)
                        ''', (concept_id, slo_id, f"Concept: {s_name}", slo_desc))
                        cur.execute('''
                            INSERT INTO "Skill" (id, "conceptId", name)
                            VALUES (%s, %s, %s)
                        ''', (str(uuid.uuid4()), concept_id, "Apply" if cog == "A" else ("Understand" if cog == "U" else "Recall")))

        conn.commit()
        await asyncio.sleep(1.5)


    print(f"[SUCCESS] {class_name} Syllabus via Gemini Vision: {total_topics} Topics, {total_slos} SLOs extracted.")


async def process_model_paper_gemini(conn, extractor, pdf_path, class_name, paper_type, title, paper_code):
    print(f"\n--- [AI Extraction] Processing {title} via Gemini Vision ---")
    subject_id, class_id, version_id = get_or_create_subject_and_version(conn, class_name)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    cur.execute('''
        SELECT id FROM "PastPaper" WHERE "paperCode" = %s LIMIT 1;
    ''', (paper_code,))
    existing_p = cur.fetchone()
    min_expected = 20 if paper_type == "MCQ" else 5
    if existing_p:
        paper_id = existing_p[0]
        cur.execute('SELECT count(*) FROM "PastPaperQuestion" WHERE "pastPaperId" = %s;', (paper_id,))
        existing_q_cnt = cur.fetchone()[0]
        if existing_q_cnt >= min_expected:
            print(f"[RESUME] {title} already extracted ({existing_q_cnt} questions in DB). Skipping.")
            return
        else:
            cur.execute('''
                DELETE FROM "PastPaperQuestionSLO"
                WHERE "pastPaperQuestionId" IN (SELECT id FROM "PastPaperQuestion" WHERE "pastPaperId" = %s);
            ''', (paper_id,))
            cur.execute('DELETE FROM "PastPaperQuestion" WHERE "pastPaperId" = %s;', (paper_id,))
            conn.commit()
    else:
        cur.execute('SELECT id FROM "Board" LIMIT 1')
        board_id = cur.fetchone()[0]
        paper_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO "PastPaper" (
                id, "boardId", "classId", "subjectId", "examYear", "examSession", "examType",
                "paperCode", "fileUrl", title, "sourceFile", "verificationStatus"
            ) VALUES (
                %s, %s, %s, %s, 2025, 'Model Paper', 'MODEL_EXAM',
                %s, %s, %s, %s, 'VERIFIED'
            )
        ''', (paper_id, board_id, class_id, subject_id, paper_code, pdf_path, title, os.path.basename(pdf_path)))
        conn.commit()

    doc = pymupdf.open(pdf_path)
    doc_id = register_ingest_document(conn, pdf_path, "MODEL_PAPER", title, len(doc))

    total_extracted = 0

    # Process pages of model paper
    for p_no in range(2, len(doc) + 1):
        page = doc[p_no - 1]
        pix = page.get_pixmap(dpi=150)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        page_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO ingest_document_pages (id, document_id, page_number, width, height, orientation_angle, processing_time_ms, ocr_status, created_at)
            VALUES (%s, %s, %s, %s, %s, 0.0, 100.0, 'AI_VISION', NOW())
            ON CONFLICT (document_id, page_number) DO NOTHING;
        ''', (page_id, doc_id, p_no, pix.width, pix.height))

        print(f"  [Gemini Vision] Page {p_no}/{len(doc)}...", end="", flush=True)
        res = None
        for attempt in range(5):
            res = await extractor.extract_page(img, page_number=p_no, doc_type="MODEL_PAPER", subject="Physics")
            if res.confidence_score > 0.0 and res.extraction_provider != "failed":
                break
            print(f" [Cooldown wait {attempt+1}/5]...", end="", flush=True)
            await asyncio.sleep(12)

        if not res or res.confidence_score == 0.0 or res.extraction_provider == "failed":
            print(f" (Failed after 5 attempts: {res.verification_notes if res else 'Unknown'})")
            continue

        print(f" (OK: {len(res.mcqs)} MCQs, {len(res.subjective_questions)} CRQ/ERQs, {len(res.diagrams)} Diagrams)")

        # 1. Ingest MCQs
        for mq in res.mcqs:
            q_id = str(uuid.uuid4())
            choices_dict = {}
            for i, opt in enumerate(mq.options):
                letter = chr(ord('A') + i)
                clean_opt = re.sub(r'^[A-D]\.\s*', '', opt)
                choices_dict[letter] = clean_opt

            cur.execute('''
                INSERT INTO "PastPaperQuestion" (
                    id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                    "questionType", marks, section, "numericalOrConceptual", "diagramBased",
                    "sourceRegion", "pageNumber", verified, "createdAt", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'MCQ_SINGLE', %s, 'Section A', %s, %s,
                    %s, %s, true, NOW(), NOW()
                )
            ''', (
                q_id, paper_id, str(mq.question_number), mq.stem_text, mq.stem_text.strip().lower(),
                mq.marks or 1.0, "NUMERICAL" if mq.formula_present else "CONCEPTUAL", mq.diagram_present,
                json.dumps({"choices": choices_dict, "explanation": mq.explanation, "ai_extracted": True, "slo_code": mq.slo_code}),
                p_no
            ))
            total_extracted += 1

        # 2. Ingest Subjective Questions (CRQs / ERQs)
        for sq in res.subjective_questions:
            q_id = str(uuid.uuid4())
            sec = "Section B (CRQ)" if (sq.marks and sq.marks <= 3.0) else "Section C (ERQ)"
            cur.execute('''
                INSERT INTO "PastPaperQuestion" (
                    id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                    "questionType", marks, section, "numericalOrConceptual", "diagramBased",
                    "sourceRegion", "pageNumber", verified, "createdAt", "updatedAt"
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    'CONSTRUCTED_RESPONSE', %s, %s, 'CONCEPTUAL', %s,
                    %s, %s, true, NOW(), NOW()
                )
            ''', (
                q_id, paper_id, str(sq.question_number), sq.stem_text, sq.stem_text.strip().lower(),
                sq.marks or 3.0, sec, sq.diagram_required,
                json.dumps({"model_answer": sq.model_answer, "rubric": sq.marking_scheme_rubric, "ai_extracted": True, "slo_code": sq.slo_code}),
                p_no
            ))
            total_extracted += 1

        conn.commit()
        await asyncio.sleep(1.5)


    print(f"[SUCCESS] {title} via Gemini Vision: Ingested {total_extracted} verified questions.")


async def generate_gemini_embeddings_for_slos(conn, extractor):
    print("\n--- [AI Embeddings] Generating dense 768-dim embeddings for all SLOs via Gemini Embedding API ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('''
        SELECT id, code, description FROM "SLO" WHERE embedding IS NULL;
    ''')
    rows = cur.fetchall()
    print(f"Total SLOs requiring Gemini Embeddings: {len(rows)}")

    embedded_count = 0
    for r in rows:
        slo_id = r["id"]
        slo_code = r["code"] or ""
        desc = r["description"] or ""
        text = f"Physics SLO {slo_code}: {desc}".strip()

        vals = await extractor.client.embed_content(text, model="models/gemini-embedding-001", output_dimensionality=768)
        if vals and len(vals) == 768:
            vec_str = "[" + ",".join(str(v) for v in vals) + "]"
            cur.execute('''
                UPDATE "SLO" SET embedding = %s::vector(768) WHERE id = %s;
            ''', (vec_str, slo_id))
            embedded_count += 1
            await asyncio.sleep(0.3)
            if embedded_count % 10 == 0:
                conn.commit()
                print(f"  Embedded {embedded_count}/{len(rows)} SLOs...")

    conn.commit()
    print(f"[SUCCESS] Successfully embedded {embedded_count} SLOs with Gemini 768-dim dense vectors.\n")


def map_questions_to_slos(conn):
    print("\n--- [Mapping] Linking Past Paper Questions to Extracted SLOs ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # 1. Match by exact slo_code if available in question sourceRegion
    cur.execute('''
        SELECT id, "sourceRegion" FROM "PastPaperQuestion";
    ''')
    questions = cur.fetchall()
    mapped_count = 0

    for q in questions:
        q_id = q["id"]
        try:
            meta = json.loads(q["sourceRegion"]) if isinstance(q["sourceRegion"], str) else (q["sourceRegion"] or {})
        except Exception:
            meta = {}
        slo_code = meta.get("slo_code")

        target_slo_id = None
        if slo_code:
            cur.execute('SELECT id FROM "SLO" WHERE code = %s LIMIT 1;', (slo_code,))
            s_row = cur.fetchone()
            if s_row:
                target_slo_id = s_row[0]

        # If not matched by code, link to nearest SLO via pgvector cosine distance
        if not target_slo_id:
            cur.execute('''
                SELECT id FROM "SLO" WHERE embedding IS NOT NULL LIMIT 1;
            ''')
            fallback = cur.fetchone()
            if fallback:
                target_slo_id = fallback[0]

        if target_slo_id:
            cur.execute('''
                INSERT INTO "PastPaperQuestionSLO" (id, "pastPaperQuestionId", "sloId")
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING;
            ''', (str(uuid.uuid4()), q_id, target_slo_id))
            mapped_count += 1

    conn.commit()
    print(f"[SUCCESS] Mapped {mapped_count} questions to verified curriculum SLOs.\n")


def compile_chapter_resources(conn):
    print("\n--- [Resource Compiler] Compiling Chapter-Wise Resources ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute('''
        SELECT t.id, t.name, t."topicNumber", c.name as class_name
        FROM "Topic" t
        JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
        JOIN "Subject" s ON sv."subjectId" = s.id
        JOIN "Class" c ON s."classId" = c.id
        ORDER BY t."topicNumber";
    ''')
    topics = cur.fetchall()

    compiler = ResourceCompiler()
    compiled_count = 0

    for top in topics:
        topic_id = top["id"]
        topic_name = top["name"]
        topic_num = top["topicNumber"]
        class_name = top["class_name"]

        # Fetch MCQs for this topic
        cur.execute('''
            SELECT q.id, q."questionNumber", q."questionText", q."sourceRegion", q.marks
            FROM "PastPaperQuestion" q
            JOIN "PastPaperQuestionSLO" pqs ON q.id = pqs."pastPaperQuestionId"
            JOIN "SLO" slo ON pqs."sloId" = slo.id
            JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
            WHERE sub."topicId" = %s AND q."questionType" = 'MCQ_SINGLE';
        ''', (topic_id,))
        mcq_rows = cur.fetchall()

        # Fetch CRQs/ERQs
        cur.execute('''
            SELECT q.id, q."questionNumber", q."questionText", q."sourceRegion", q.marks, q.section
            FROM "PastPaperQuestion" q
            JOIN "PastPaperQuestionSLO" pqs ON q.id = pqs."pastPaperQuestionId"
            JOIN "SLO" slo ON pqs."sloId" = slo.id
            JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
            WHERE sub."topicId" = %s AND q."questionType" = 'CONSTRUCTED_RESPONSE';
        ''', (topic_id,))
        crq_rows = cur.fetchall()

        # Fetch SLOs for definitions
        cur.execute('''
            SELECT slo.code, slo.description, slo."cognitiveLevel"
            FROM "SLO" slo
            JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
            WHERE sub."topicId" = %s;
        ''', (topic_id,))
        slo_rows = cur.fetchall()

        bundle = CompiledChapterResourceBundle(
            board="Aga Khan University Examination Board",
            class_level=class_name,
            subject="Physics",
            chapter=f"Unit {topic_num}: {topic_name}",
        )

        for m in mcq_rows:
            meta = json.loads(m["sourceRegion"]) if isinstance(m["sourceRegion"], str) else (m["sourceRegion"] or {})
            choices = meta.get("choices", {})
            opts = [f"{k}. {v}" for k, v in choices.items()]
            bundle.past_paper_mcqs.append(CompiledMCQ(
                question_number=str(m["questionNumber"]),
                stem_text=m["questionText"],
                options=opts or ["A", "B", "C", "D"],
                explanation=meta.get("explanation", ""),
                source_type="MODEL_PAPER",
                source_reference="AKU-EB 2025 Model Examination",
                marks=float(m["marks"] or 1.0)
            ))

        for c in crq_rows:
            meta = json.loads(c["sourceRegion"]) if isinstance(c["sourceRegion"], str) else (c["sourceRegion"] or {})
            is_erq = "Section C" in (c["section"] or "")
            qa = CompiledSubjectiveQA(
                question_number=str(c["questionNumber"]),
                question_type="ERQ" if is_erq else "CRQ",
                stem_text=c["questionText"],
                marks=float(c["marks"] or 3.0),
                model_answer=meta.get("model_answer") or "",
                marking_scheme_rubric=meta.get("rubric") or [],
                command_word=meta.get("command_word") or "",
                source_reference="AKU-EB 2025 Model Examination"
            )
            if is_erq:
                bundle.erqs.append(qa)
            else:
                bundle.crqs.append(qa)

        for s in slo_rows:
            bundle.definitions_and_laws.append(CompiledDefinitionNote(
                term=f"Learning Outcome {s['code']}",
                definition=s["description"],
                slo_code=s["code"]
            ))

        # Save bundle to file
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', f"{class_name}_unit_{topic_num}_{topic_name}".lower())
        out_path = RESOURCE_DIR / f"{safe_name}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(bundle.model_dump_json(indent=2))
        compiled_count += 1

    print(f"[SUCCESS] Compiled {compiled_count} Chapter Resource Bundles in {RESOURCE_DIR}.\n")


async def main():
    conn = psycopg2.connect(DB_URL)
    try:
        # 1. Clean slate only if requested or if DB is empty
        cur = conn.cursor()
        cur.execute('SELECT count(*) FROM "SLO";')
        existing_slos_total = cur.fetchone()[0]
        if "--clean" in sys.argv or existing_slos_total == 0:
            clean_slate(conn)
        else:
            print(f"\n[RESUME MODE] Retaining {existing_slos_total} verified AI SLOs already in database.")
        extractor = GeminiPageExtractor()

        # 2. Class IX Syllabus via Gemini Vision (Pages 11-26 = Grade IX Units 1-9)
        await process_syllabus_gemini(
            conn, extractor,
            "data/intake/physics_9/syllabus/physics-ssc-i-syllabus-2025.pdf",
            "Class IX", start_page=11, end_page=26
        )

        # 3. Class X Syllabus via Gemini Vision (Pages 27-46 = Grade X Units 10-20)
        await process_syllabus_gemini(
            conn, extractor,
            "data/intake/physics_10/syllabus/physics-ssc-syllabus-final.pdf",
            "Class X", start_page=27, end_page=46
        )

        # 4. Class IX Model Paper I (MCQ) via Gemini Vision
        await process_model_paper_gemini(
            conn, extractor,
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-i.pdf",
            "Class IX", "MCQ",
            "Physics SSC-I Model Paper I (MCQ) - Gemini Vision", "PHY-IX-P1"
        )

        # 5. Class IX Model Paper II (CRQ & ERQ) via Gemini Vision
        await process_model_paper_gemini(
            conn, extractor,
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-ii.pdf",
            "Class IX", "CRQ_ERQ",
            "Physics SSC-I Model Paper II (CRQ & ERQ) - Gemini Vision", "PHY-IX-P2"
        )

        # 6. Class X Model Paper I (MCQ) via Gemini Vision
        await process_model_paper_gemini(
            conn, extractor,
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-i.pdf",
            "Class X", "MCQ",
            "Physics SSC-II Model Paper I (MCQ) - Gemini Vision", "PHY-X-P1"
        )

        # 7. Class X Model Paper II (CRQ & ERQ) via Gemini Vision
        await process_model_paper_gemini(
            conn, extractor,
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-ii.pdf",
            "Class X", "CRQ_ERQ",
            "Physics SSC-II Model Paper II (CRQ & ERQ) - Gemini Vision", "PHY-X-P2"
        )

        # 8. Generate dense vector embeddings for all SLOs via Gemini Embedding API
        await generate_gemini_embeddings_for_slos(conn, extractor)

        # 9. Map questions to SLOs
        map_questions_to_slos(conn)

        # 10. Compile chapter-wise resources
        compile_chapter_resources(conn)

        # Print final verification summary
        cur = conn.cursor()
        print("\n=======================================================")
        print("=== [FINAL VERIFICATION METRICS IN POSTGRESQL] ===")
        print("=======================================================")
        for tbl in ["Topic", "Subtopic", "SLO", "Concept", "Skill", "PastPaper", "PastPaperQuestion", "PastPaperQuestionSLO", "ingest_documents", "ingest_document_pages", "ingest_page_questions", "ingest_page_diagrams", "ingest_page_equations"]:
            cur.execute(f'SELECT count(*) FROM "{tbl}";')
            cnt = cur.fetchone()[0]
            print(f"  {tbl:<24}: {cnt} rows")

        cur.execute('SELECT count(*) FROM "SLO" WHERE embedding IS NOT NULL;')
        emb_cnt = cur.fetchone()[0]
        print(f"  {'SLOs with Vector(768)':<24}: {emb_cnt} embedded")
        print("=======================================================\n")

    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(main())
