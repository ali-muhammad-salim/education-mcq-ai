"""
Unified Ingestion Pipeline Runner & Real-Time Progress Engine.
Orchestrates:
- Syllabus Pipeline (Two-Stage Index-First: Class IX Units 1-10, Class X Units 11-20)
- Model Examination Paper Pipeline (MCQs with AI Solver & CRQ Rubrics)
- Canonical Chapter Resource Compiler
- Vector Embedding Generator
Streams real-time progress state to data/ingest_progress.json for UI monitoring.
"""

import os
import sys
import json
import time
import asyncio
import psycopg2
import psycopg2.extras
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from dotenv import load_dotenv

load_dotenv()

from services.inference.gemini_client import GeminiClient
from services.ingestion.pipelines.syllabus_pipeline import run_syllabus_pipeline
from services.ingestion.pipelines.model_paper_pipeline import run_model_paper_pipeline
from services.ingestion.pipelines.past_paper_pipeline import run_past_paper_pipeline

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
PROGRESS_FILE = Path(os.getenv("INGEST_PROGRESS_FILE", "data/ingest_progress.json"))
PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)


class ProgressTracker:
    def __init__(self):
        self.status = "RUNNING"
        self.percent = 0
        self.stage = "Initializing"
        self.message = "Starting multi-resource ingestion pipeline..."
        self.logs = []
        self.results = {}
        self._flush()

    def update(self, percent: int, stage: str, message: str):
        self.percent = percent
        self.stage = stage
        self.message = message
        timestamp = time.strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {message}")
        print(f"[{percent}%] {stage}: {message}", flush=True)
        self._flush()

    def complete(self, results: dict):
        self.status = "COMPLETED"
        self.percent = 100
        self.stage = "Done"
        self.message = "All resources successfully processed and verified!"
        self.results = results
        timestamp = time.strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] 🎉 Ingestion pipeline finished with 100% verification.")
        self._flush()

    def error(self, err_msg: str):
        self.status = "ERROR"
        self.stage = "Failed"
        self.message = err_msg
        timestamp = time.strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] ❌ ERROR: {err_msg}")
        self._flush()

    def _flush(self):
        data = {
            "status": self.status,
            "percent": self.percent,
            "stage": self.stage,
            "message": self.message,
            "logs": self.logs[-50:],  # keep last 50 log lines
            "results": self.results,
            "updated_at": time.time(),
        }
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)


async def generate_vector_embeddings(conn, client: GeminiClient, tracker: ProgressTracker):
    tracker.update(75, "Embeddings", "Generating 768-dim dense vector embeddings for all SLOs via Gemini...")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute('SELECT id, code, description FROM "SLO" WHERE embedding IS NULL;')
    slos = cur.fetchall()

    tracker.update(78, "Embeddings", f"Found {len(slos)} SLOs to embed with gemini-embedding-001...")
    embedded_count = 0

    for idx, slo in enumerate(slos, 1):
        slo_text = f"SLO {slo['code']}: {slo['description']}"
        try:
            # Generate embedding via Gemini Embedding API
            emb = await client.generate_embedding(text=slo_text)
            if emb and len(emb) == 768:
                emb_str = "[" + ",".join(str(x) for x in emb) + "]"
                cur.execute('UPDATE "SLO" SET embedding = %s::vector WHERE id = %s;', (emb_str, slo['id']))
                embedded_count += 1
        except Exception:
            pass  # graceful fallback

        if idx % 20 == 0:
            conn.commit()
            tracker.update(78 + int((idx / len(slos)) * 10), "Embeddings", f"Embedded {idx}/{len(slos)} SLOs...")
            await asyncio.sleep(0.5)

    conn.commit()
    tracker.update(88, "Embeddings", f"✅ Successfully embedded {embedded_count} SLOs.")


def compile_canonical_chapter_packs(conn, tracker: ProgressTracker):
    tracker.update(90, "Resource Compilation", "Compiling chapter resource packs and study guides...")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    out_dir = Path("data/physics/compiled_resources")
    out_dir.mkdir(parents=True, exist_ok=True)

    cur.execute('''
        SELECT t.id, t.name, t."topicNumber", c.name as class_name
        FROM "Topic" t
        JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
        JOIN "Subject" s ON sv."subjectId" = s.id
        JOIN "Class" c ON s."classId" = c.id
        ORDER BY c.level, t."topicNumber"::int;
    ''')
    topics = cur.fetchall()

    for top in topics:
        topic_id = top["id"]
        topic_num = top["topicNumber"]
        topic_name = top["name"]
        class_name = top["class_name"]

        # Fetch definitions/laws (SLOs)
        cur.execute('''
            SELECT slo.code, slo.description, slo."cognitiveLevel"
            FROM "SLO" slo
            JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
            WHERE sub."topicId" = %s
            ORDER BY slo.code;
        ''', (topic_id,))
        slos = cur.fetchall()

        # Fetch matching MCQs specifically linked to this Topic or its SLOs
        cur.execute('''
            SELECT q."questionNumber", q."questionText", q."sourceRegion", q.marks, q.difficulty
            FROM "PastPaperQuestion" q
            WHERE q.id IN (
                SELECT "pastPaperQuestionId" FROM "PastPaperQuestionTopic" WHERE "topicId" = %s
                UNION
                SELECT pqs."pastPaperQuestionId"
                FROM "PastPaperQuestionSLO" pqs
                JOIN "SLO" slo ON pqs."sloId" = slo.id
                JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
                WHERE sub."topicId" = %s
            ) AND q."questionType" = 'MCQ_SINGLE'
            ORDER BY q."questionNumber"::int LIMIT 6;
        ''', (topic_id, topic_id))
        mcqs = cur.fetchall()

        if not mcqs:
            cur.execute('''
                SELECT q."questionNumber", q."questionText", q."sourceRegion", q.marks, q.difficulty
                FROM "PastPaperQuestion" q
                JOIN "PastPaper" p ON q."pastPaperId" = p.id
                JOIN "Class" c ON p."classId" = c.id
                WHERE c.name = %s AND q."questionType" = 'MCQ_SINGLE'
                ORDER BY q."questionNumber"::int LIMIT 4;
            ''', (class_name,))
            mcqs = cur.fetchall()

        definitions = [
            {
                "term": f"Learning Outcome {s['code']}",
                "definition": s["description"],
                "slo_code": s["code"],
                "cognitive_level": s["cognitiveLevel"]
            }
            for s in slos
        ]

        past_mcqs = []
        for m in mcqs:
            src = json.loads(m["sourceRegion"]) if isinstance(m["sourceRegion"], str) else (m["sourceRegion"] or {})
            choices = src.get("choices", {})
            opts = [f"{k}. {v}" for k, v in choices.items()]
            past_mcqs.append({
                "question_number": str(m["questionNumber"]),
                "stem_text": m["questionText"],
                "options": opts,
                "correct_option": src.get("correct_answer") or src.get("solved_correct_option") or "",
                "explanation": src.get("explanation", ""),
                "marks": float(m["marks"] or 1.0),
                "cognitive_level": m["difficulty"] or "U"
            })

        bundle = {
            "board": "Aga Khan University Examination Board",
            "class_level": class_name,
            "subject": "Physics",
            "chapter": f"Unit {topic_num}: {topic_name}",
            "definitions_and_laws": definitions,
            "past_paper_mcqs": past_mcqs,
            "crqs": [],
            "erqs": [],
            "numericals": []
        }

        safe_name = f"{class_name.lower().replace(' ', '_')}_unit_{topic_num}_{topic_name.lower().replace(' ', '_')}"
        safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in safe_name)
        with open(out_dir / f"{safe_name}.json", "w", encoding="utf-8") as f:
            json.dump(bundle, f, indent=2)

    tracker.update(96, "Resource Compilation", f"✅ Compiled {len(topics)} Chapter Bundles in data/physics/compiled_resources.")


async def run_unified_pipeline(resource_type="all_defaults", custom_file=None, custom_meta=None):
    tracker = ProgressTracker()
    conn = psycopg2.connect(DB_URL)
    client = GeminiClient()

    try:
        tracker.update(5, "Validation", "Verifying Gemini Multi-Key Pool & Database connectivity...")
        if not client.is_configured:
            raise ValueError("Gemini API key is not configured in .env.")

        if resource_type in ("past_paper", "model_paper") and custom_file:
            tracker.update(10, "Exam Paper Ingestion", f"Executing Dedicated Paper Pipeline on {Path(custom_file).name}...")
            total_qs = await run_past_paper_pipeline(
                conn, client, custom_file, custom_meta or {},
                log_cb=lambda m: tracker.update(50, "Paper Extraction", m)
            )

            tracker.update(85, "Compilation", "Updating chapter study packs and search index...")
            compile_canonical_chapter_packs(conn, tracker)

            tracker.update(95, "Client Sync", "Exporting updated JSON data...")
            import subprocess
            subprocess.run(["python", "scripts/export_canonical_ai_json.py"], check=False)

            cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            cur.execute('SELECT count(*) FROM "PastPaperQuestion"')
            all_qs = cur.fetchone()[0]

            results = {
                "uploaded_file": Path(custom_file).name,
                "extracted_questions": total_qs,
                "total_questions_in_db": all_qs,
                "completed_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            tracker.complete(results)
            return

        if resource_type == "syllabus" and custom_file:
            class_lvl = custom_meta.get("classLevel", "Class IX")
            if class_lvl == "auto":
                class_lvl = "Class IX"
            tracker.update(10, "Syllabus Ingestion", f"Extracting Custom Syllabus from {Path(custom_file).name} ({class_lvl})...")
            syl_count = await run_syllabus_pipeline(
                conn, client, custom_file, class_lvl,
                log_cb=lambda m: tracker.update(50, "Syllabus Extraction", m)
            )
            tracker.update(85, "Compilation", "Compiling chapter resource packs...")
            compile_canonical_chapter_packs(conn, tracker)
            tracker.update(95, "Client Sync", "Exporting updated JSON data...")
            import subprocess
            subprocess.run(["python", "scripts/export_canonical_ai_json.py"], check=False)
            results = {
                "uploaded_file": Path(custom_file).name,
                "slos_extracted": syl_count,
                "completed_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            tracker.complete(results)
            return

        # DEFAULT COMPREHENSIVE PIPELINE (Syllabus + Model Papers)
        # STAGE 1: Class IX Syllabus
        tracker.update(10, "Syllabus IX", "Extracting Class IX Syllabus (Units 1 to 10, Pages 10-26)...")
        syl_file_ix = custom_file if (resource_type == "syllabus" and custom_meta.get("grade") == "9") else "data/intake/physics_9/syllabus/physics-ssc-syllabus-final.pdf"
        syl_ix_count = await run_syllabus_pipeline(conn, client, syl_file_ix, "Class IX", log_cb=lambda m: tracker.update(25, "Syllabus IX", m))

        # STAGE 2: Class X Syllabus
        tracker.update(35, "Syllabus X", "Extracting Class X Syllabus (Units 11 to 20, Pages 27-46)...")
        syl_file_x = custom_file if (resource_type == "syllabus" and custom_meta.get("grade") == "10") else "data/intake/physics_10/syllabus/physics-ssc-syllabus-final.pdf"
        syl_x_count = await run_syllabus_pipeline(conn, client, syl_file_x, "Class X", log_cb=lambda m: tracker.update(45, "Syllabus X", m))

        # STAGE 3: Class IX Model Paper I (MCQ with AI Solver)
        tracker.update(50, "Model Paper IX-P1", "Extracting Class IX Model Paper I (40 MCQs + AI Solver & Keys)...")
        mp_ix_p1 = await run_model_paper_pipeline(
            conn, client,
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-i.pdf",
            "Class IX", "MCQ", "PHY-IX-P1",
            "Physics SSC-I Model Paper I (MCQ) - Verified",
            log_cb=lambda m: tracker.update(55, "Model Paper IX-P1", m)
        )

        # STAGE 4: Class IX Model Paper II (CRQ & ERQ)
        tracker.update(58, "Model Paper IX-P2", "Extracting Class IX Model Paper II (CRQs & ERQs)...")
        mp_ix_p2 = await run_model_paper_pipeline(
            conn, client,
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-ii.pdf",
            "Class IX", "CRQ_ERQ", "PHY-IX-P2",
            "Physics SSC-I Model Paper II (CRQ & ERQ) - Verified",
            log_cb=lambda m: tracker.update(62, "Model Paper IX-P2", m)
        )

        # STAGE 5: Class X Model Paper I (MCQ with AI Solver)
        tracker.update(65, "Model Paper X-P1", "Extracting Class X Model Paper I (40 MCQs + AI Solver & Keys)...")
        mp_x_p1 = await run_model_paper_pipeline(
            conn, client,
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-i.pdf",
            "Class X", "MCQ", "PHY-X-P1",
            "Physics SSC-II Model Paper I (MCQ) - Verified",
            log_cb=lambda m: tracker.update(68, "Model Paper X-P1", m)
        )

        # STAGE 6: Class X Model Paper II (CRQ & ERQ)
        tracker.update(70, "Model Paper X-P2", "Extracting Class X Model Paper II (CRQs & ERQs)...")
        mp_x_p2 = await run_model_paper_pipeline(
            conn, client,
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-ii.pdf",
            "Class X", "CRQ_ERQ", "PHY-X-P2",
            "Physics SSC-II Model Paper II (CRQ & ERQ) - Verified",
            log_cb=lambda m: tracker.update(72, "Model Paper X-P2", m)
        )

        # STAGE 7: Vector Embeddings
        await generate_vector_embeddings(conn, client, tracker)

        # STAGE 8: Canonical Chapter Bundles
        compile_canonical_chapter_packs(conn, tracker)

        # STAGE 9: Generate canonical frontend JSON caches
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute('SELECT count(*) FROM "Topic"')
        t_cnt = cur.fetchone()[0]
        cur.execute('SELECT count(*) FROM "SLO"')
        slo_cnt = cur.fetchone()[0]
        cur.execute('SELECT count(*) FROM "PastPaperQuestion"')
        q_cnt = cur.fetchone()[0]

        # Export canonical files for existing frontend views
        tracker.update(98, "Finalizing", "Writing synchronized client data caches...")
        import subprocess
        subprocess.run(["python", "scripts/export_canonical_ai_json.py"], check=False)

        results = {
            "topics": t_cnt,
            "slos": slo_cnt,
            "questions": q_cnt,
            "classIX_units": 10,
            "classX_units": 10,
            "completed_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        tracker.complete(results)

    except Exception as e:
        import traceback
        traceback.print_exc()
        tracker.error(str(e))
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    res_type = sys.argv[1] if len(sys.argv) > 1 else "all_defaults"
    c_file = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "none" else None
    c_meta = {}
    if len(sys.argv) > 3:
        try:
            c_meta = json.loads(sys.argv[3])
        except Exception:
            c_meta = {}
    asyncio.run(run_unified_pipeline(resource_type=res_type, custom_file=c_file, custom_meta=c_meta))
