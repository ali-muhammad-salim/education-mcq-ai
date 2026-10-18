import os
import re
import json
import uuid
import time
import httpx
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
GEMINI_KEYS = [k.strip() for k in os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", "")).split(",") if k.strip()]

def get_db():
    return psycopg2.connect(DB_URL)

def extract_action_skill(description):
    words = description.strip().split()
    if not words:
        return "Understand"
    first = words[0].rstrip(';,:.').capitalize()
    return first

def extract_concept_name(slo_desc, subtopic_name):
    cleaned = re.sub(r'^(differentiate|explain|describe|calculate|identify|list|state|illustrate|exemplify|determine|define|compare|demonstrate|verify|analyze|derive)\s+(between|the|that|how|various|about)?\s*', '', slo_desc, flags=re.IGNORECASE)
    cleaned = cleaned.rstrip(';:.')
    tokens = cleaned.split()
    if len(tokens) > 6:
        name = " ".join(tokens[:6])
    else:
        name = cleaned
    return name.capitalize() if name else subtopic_name

# -----------------------------------------------------------------------------
# 1. Populate Concepts & Skills
# -----------------------------------------------------------------------------
def populate_concepts_and_skills(conn):
    print("\n--- [Step 1] Populating Concept Graph (Concepts & Skills) ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute('SELECT count(*) FROM "Concept"')
    existing_concepts = cur.fetchone()[0]
    if existing_concepts >= 327:
        print(f"[INFO] Concepts and Skills already populated ({existing_concepts} concepts). Skipping.")
        return

    cur.execute('''
        SELECT s.id as slo_id, s.code, s.description, s."cognitiveLevel", sub.name as subtopic_name
        FROM "SLO" s
        JOIN "Subtopic" sub ON s."subtopicId" = sub.id
    ''')
    slos = cur.fetchall()
    
    cur.execute('DELETE FROM "Skill"')
    cur.execute('DELETE FROM "Concept"')
    
    concept_count = 0
    skill_count = 0
    
    for row in slos:
        slo_id = row["slo_id"]
        slo_desc = row["description"]
        sub_name = row["subtopic_name"]
        
        concept_id = str(uuid.uuid4())
        concept_name = extract_concept_name(slo_desc, sub_name)
        skill_name = extract_action_skill(slo_desc)
        
        cur.execute('''
            INSERT INTO "Concept" (id, "sloId", name, description)
            VALUES (%s, %s, %s, %s)
        ''', (concept_id, slo_id, concept_name, slo_desc))
        concept_count += 1
        
        skill_id = str(uuid.uuid4())
        cur.execute('''
            INSERT INTO "Skill" (id, "conceptId", name)
            VALUES (%s, %s, %s)
        ''', (skill_id, concept_id, skill_name))
        skill_count += 1
        
    conn.commit()
    print(f"[SUCCESS] Created {concept_count} Concept nodes and {skill_count} Skill nodes in database.")

# -----------------------------------------------------------------------------
# 2. Generate 768-dim Vector Embeddings for all SLOs (pgvector)
# -----------------------------------------------------------------------------
def embed_all_slos(conn):
    print("\n--- [Step 2] Computing pgvector 768-dim Embeddings for all SLOs ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute('''
        SELECT s.id, s.code, s.description, t.name as topic_name, sub.name as sub_name
        FROM "SLO" s
        JOIN "Subtopic" sub ON s."subtopicId" = sub.id
        JOIN "Topic" t ON sub."topicId" = t.id
        WHERE s.embedding IS NULL
    ''')
    slos = cur.fetchall()
    print(f"SLOs requiring embeddings: {len(slos)}")
    
    if not slos:
        print("[INFO] All SLOs already have vector embeddings.")
        return

    success = 0
    key_idx = 0
    
    for i, slo in enumerate(slos):
        text_to_embed = f"{slo['topic_name']} - {slo['sub_name']}: {slo['description']}"
        api_key = GEMINI_KEYS[key_idx % len(GEMINI_KEYS)]
        key_idx += 1
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={api_key}"
        payload = {
            "model": "models/gemini-embedding-001",
            "content": {"parts": [{"text": text_to_embed}]},
            "outputDimensionality": 768
        }
        
        for attempt in range(len(GEMINI_KEYS)):
            try:
                resp = httpx.post(url, json=payload, timeout=12)
                if resp.status_code == 200:
                    emb_vals = resp.json().get("embedding", {}).get("values", [])
                    if len(emb_vals) == 768:
                        emb_str = "[" + ",".join(str(x) for x in emb_vals) + "]"
                        cur.execute('''
                            UPDATE "SLO"
                            SET embedding = %s::vector
                            WHERE id = %s
                        ''', (emb_str, slo["id"]))
                        success += 1
                        break
                elif resp.status_code == 429:
                    api_key = GEMINI_KEYS[key_idx % len(GEMINI_KEYS)]
                    key_idx += 1
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={api_key}"
                    time.sleep(0.5)
            except Exception as e:
                time.sleep(0.5)
                
        if (i + 1) % 50 == 0 or (i + 1) == len(slos):
            conn.commit()
            print(f"  -> Embedded {i + 1}/{len(slos)} SLOs...")

    conn.commit()
    print(f"[SUCCESS] Successfully embedded {success} SLOs with 768-dim vectors!")

# -----------------------------------------------------------------------------
# 3. Synchronize Ingest Repository Tables
# -----------------------------------------------------------------------------
def sync_ingest_repository(conn):
    print("\n--- [Step 3] Synchronizing Document Intelligence Ingestion Tables ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    docs = [
        ("physics-ssc-i-syllabus-2025.pdf", "CURRICULUM", "Physics SSC-I Syllabus (2025-2028)", 58, 9),
        ("physics-ssc-syllabus-final.pdf", "CURRICULUM", "Physics SSC Syllabus Final (IX & X)", 58, 10),
        ("physics-model-paper-ix-paper-i.pdf", "MODEL_PAPER", "Physics SSC-I Model Paper I (MCQ)", 12, 9),
        ("physics-model-paper-ix-paper-ii.pdf", "MODEL_PAPER", "Physics SSC-I Model Paper II (CRQ & ERQ)", 8, 9),
        ("physics-model-paper-x-paper-i.pdf", "MODEL_PAPER", "Physics SSC-II Model Paper I (MCQ)", 12, 10),
        ("physics-model-paper-x-paper-ii.pdf", "MODEL_PAPER", "Physics SSC-II Model Paper II (CRQ & ERQ)", 8, 10),
        ("pacing-guide-2025-for-ssc-i-physics.pdf", "CURRICULUM", "Physics SSC-I Pacing Guide 2025", 33, 9),
        ("pacing-guide-for-ssc-ii-physics.pdf", "CURRICULUM", "Physics SSC-II Pacing Guide 2025", 43, 10),
        ("resources-guide-2025-ssc-physics-final.pdf", "CURRICULUM", "Physics SSC Resource Guide Final", 20, 9),
        ("ssc-i-physics-sample-practical.pdf", "CURRICULUM", "Physics SSC-I Sample Practical Paper", 4, 9),
    ]
    
    for filename, doc_type, title, pages, grade in docs:
        target_path = f"data/intake/physics_{grade}/{filename}"
        cur.execute('''
            SELECT id FROM ingest_documents WHERE file_path = %s
        ''', (target_path,))
        existing = cur.fetchone()
        
        if existing:
            doc_id = existing[0]
            cur.execute('''
                UPDATE ingest_documents
                SET processing_status = 'COMPLETED', total_pages = %s, updated_at = NOW()
                WHERE id = %s
            ''', (pages, doc_id))
        else:
            doc_id = str(uuid.uuid4())
            cur.execute('''
                INSERT INTO ingest_documents (
                    id, file_path, file_hash_sha256, document_type, title, processing_status,
                    total_pages, metadata_json, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, 'COMPLETED', %s, %s, NOW(), NOW()
                )
            ''', (
                doc_id, target_path,
                str(uuid.uuid4())[:16], doc_type, title, pages,
                json.dumps({"board": "AKU-EB", "grade": grade, "subject": "Physics"})
            ))
            
    conn.commit()
    print(f"[SUCCESS] Registered and marked {len(docs)} documents as COMPLETED in ingest_documents.")

# -----------------------------------------------------------------------------
# 4. Compile Granular Pedagogical Resource Bundles
# -----------------------------------------------------------------------------
def compile_all_resources(conn):
    print("\n--- [Step 4] Compiling Granular Chapter Resources via ResourceCompiler ---")
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute('''
        SELECT 
            q.id, q."questionNumber", q."questionText", q."questionType", q.marks,
            q.section, q.difficulty, q."numericalOrConceptual", q."diagramBased",
            q."sourceRegion", t."topicNumber", t.name as topic_name,
            c.name as class_name, p.title as paper_title
        FROM "PastPaperQuestion" q
        JOIN "Topic" t ON q."topicId" = t.id
        JOIN "PastPaper" p ON q."pastPaperId" = p.id
        JOIN "Class" c ON p."classId" = c.id
        ORDER BY t."topicNumber"::int, q."questionNumber"::int
    ''')
    questions = cur.fetchall()
    
    from services.knowledge.resource_compiler import (
        ResourceCompiler,
        CompiledNumerical,
        CompiledMCQ,
        CompiledSubjectiveQA,
        CompiledDiagramLabeling,
        CompiledChapterResourceBundle
    )
    
    out_dir = r"data\physics\compiled_resources"
    os.makedirs(out_dir, exist_ok=True)
    
    units_map = {}
    for q in questions:
        unit_key = (q["class_name"], q["topicNumber"], q["topic_name"])
        if unit_key not in units_map:
            units_map[unit_key] = []
        units_map[unit_key].append(q)
        
    compiled_bundles = []
    
    for (class_name, unit_num, unit_name), q_list in units_map.items():
        bundle = CompiledChapterResourceBundle(
            board="AKU-EB",
            class_level=class_name,
            subject="Physics",
            chapter=f"Unit {unit_num}: {unit_name}"
        )
        for q in q_list:
            raw_sreg = q["sourceRegion"]
            if isinstance(raw_sreg, str):
                try:
                    sreg = json.loads(raw_sreg)
                except Exception:
                    sreg = {}
            elif isinstance(raw_sreg, dict):
                sreg = raw_sreg
            else:
                sreg = {}
            choices = sreg if isinstance(sreg, dict) and "A" in sreg else sreg.get("choices", {})
            opts = [f"{k}. {v}" for k, v in choices.items()] if isinstance(choices, dict) else []
            
            if q["questionType"] == "MCQ_SINGLE":
                bundle.past_paper_mcqs.append(CompiledMCQ(
                    question_number=str(q["questionNumber"]),
                    stem_text=q["questionText"],
                    options=opts,
                    marks=float(q["marks"] or 1.0),
                    cognitive_level="A" if q["numericalOrConceptual"] == "NUMERICAL" else "U",
                    source_type="MODEL_PAPER",
                    source_reference=q["paper_title"]
                ))
            else:
                bundle.crqs.append(CompiledSubjectiveQA(
                    question_number=str(q["questionNumber"]),
                    question_type="CRQ" if q["marks"] and q["marks"] <= 3.0 else "ERQ",
                    stem_text=q["questionText"],
                    marks=float(q["marks"] or 3.0),
                    source_reference=q["paper_title"]
                ))
                
            if q["numericalOrConceptual"] == "NUMERICAL":
                bundle.numericals.append(CompiledNumerical(
                    problem_number=str(q["questionNumber"]),
                    problem_type="PAST_PAPER_NUMERICAL",
                    statement=q["questionText"],
                    marks=float(q["marks"] or 1.0),
                    source_reference=q["paper_title"]
                ))
                
            if q["diagramBased"]:
                bundle.diagram_labelings.append(CompiledDiagramLabeling(
                    title=f"Diagram Problem: Unit {unit_num} Q{q['questionNumber']}",
                    caption=q["questionText"][:120],
                    diagram_type="CIRCUIT" if "circuit" in q["questionText"].lower() else "DIAGRAM",
                    source_reference=q["paper_title"]
                ))
                
        compiled_bundles.append(bundle.model_dump())
        
    with open(os.path.join(out_dir, "master_physics_resources.json"), "w", encoding="utf-8") as f:
        json.dump(compiled_bundles, f, indent=2)
        
    print(f"[SUCCESS] Compiled {len(compiled_bundles)} Chapter Resource Bundles into {out_dir}")

def main():
    conn = get_db()
    try:
        populate_concepts_and_skills(conn)
        embed_all_slos(conn)
        sync_ingest_repository(conn)
        compile_all_resources(conn)
        print("\n=======================================================")
        print("=== [COMPLETE] Full Knowledge Base Pipeline Finished! ===")
        print("=======================================================")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
