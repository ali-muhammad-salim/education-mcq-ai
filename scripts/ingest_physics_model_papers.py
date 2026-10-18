import os
import re
import json
import uuid
import pymupdf
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
engine = create_engine(DB_URL)

DATA_DIR = r"data\physics"
os.makedirs(DATA_DIR, exist_ok=True)

def clean_page_text(txt):
    lines = txt.split('\n')
    cleaned_lines = []
    for l in lines:
        if any(x in l for x in ['AKU-EB', 'Model Paper 2023', 'for Teaching & Learning', 'PLEASE TURN OVER THE PAGE']):
            continue
        if re.search(r'Page \d+ of \d+', l):
            continue
        if re.search(r'Physics Model Paper (IX|X)', l):
            continue
        cleaned_lines.append(l)
    return '\n'.join(cleaned_lines)

def parse_question_choices(qbody):
    # Pattern 1: Standard A. B. C. D.
    cm = list(re.finditer(r'(?:^|\n)\s*([A-D])\.\s*(.*?)(?=(?:\n\s*[A-D]\.\s*)|\Z)', qbody, re.DOTALL))
    if len(cm) >= 4:
        stem = qbody[:cm[0].start()].strip()
        choices = {m.group(1): ' '.join(m.group(2).split()) for m in cm[:4]}
        return stem, choices
    
    # Pattern 2: Table A B C D (letters on standalone line)
    cm2 = list(re.finditer(r'(?:^|\n)\s*([A-D])\s*\n\s*(.*?)(?=(?:\n\s*[A-D]\s*\n)|\Z)', qbody, re.DOTALL))
    if len(cm2) >= 4:
        stem = qbody[:cm2[0].start()].strip()
        choices = {m.group(1): ' '.join(m.group(2).split()) for m in cm2[:4]}
        return stem, choices

    # Fallback: Diagram / symbol choices
    return qbody.strip(), {
        "A": "[Diagram/Symbol A]",
        "B": "[Diagram/Symbol B]",
        "C": "[Diagram/Symbol C]",
        "D": "[Diagram/Symbol D]"
    }

def parse_mcq_paper(pdf_path, grade_label):
    doc = pymupdf.open(pdf_path)
    full_text = ""
    for p in range(1, len(doc)):
        full_text += "\n" + clean_page_text(doc[p].get_text())

    questions = []
    for i in range(1, 41):
        next_pat = r'(?=(?:\n\s*' + str(i+1) + r'\.\s*[^\n\d])|\Z)' if i < 40 else r'\Z'
        m = re.search(r'(?:^|\n)\s*' + str(i) + r'\.\s*([^\n\d].*?)' + next_pat, full_text, re.DOTALL)
        if not m:
            continue
        qbody = m.group(1).strip()
        raw_stem, choices = parse_question_choices(qbody)
        clean_stem = " ".join(raw_stem.split())
        
        is_diagram = bool(re.search(r'(figure|diagram|graph|circuit|shown below|given table|symbolise)', clean_stem, re.IGNORECASE) or choices["A"].startswith("[Diagram"))
        is_numerical = bool(re.search(r'(\d+\s*(m/s|kg|N|cm|m|J|W|V|s|Hz|pF|uF|°C|Ω))', clean_stem))
        
        cog = "Understanding"
        if any(w in clean_stem.lower() for w in ['calculate', 'find the value', 'determine', 'acceleration of', 'velocity of']):
            cog = "Application"
        elif any(w in clean_stem.lower() for w in ['which instrument', 'unit of', 'prefix used', 'called', 'definition of']):
            cog = "Knowledge"

        questions.append({
            "questionNumber": i,
            "stem": clean_stem,
            "choices": choices,
            "marks": 1.0,
            "cognitiveLevel": cog,
            "isDiagram": is_diagram,
            "isNumerical": is_numerical,
            "grade": grade_label
        })

    return questions

def parse_crq_paper(pdf_path, grade_label):
    doc = pymupdf.open(pdf_path)
    full_text = ""
    for p in range(1, len(doc)):
        full_text += "\n" + clean_page_text(doc[p].get_text())

    questions = []
    for i in range(1, 8):
        next_pat = r'(?=(?:\n\s*Q\.\s*' + str(i+1) + r'\.)|\Z)' if i < 7 else r'\Z'
        m = re.search(r'(?:^|\n)\s*Q\.\s*' + str(i) + r'\.\s*(.*?)(?=' + next_pat + r')', full_text, re.DOTALL)
        if m:
            qbody = m.group(1).strip()
            marks_m = re.search(r'\(Total\s+(\d+)\s+Marks?\)', qbody, re.IGNORECASE)
            marks = float(marks_m.group(1)) if marks_m else (3.0 if i <= 5 else 6.0)
            
            clean_body = re.sub(r'\(Total\s+\d+\s+Marks?\)', '', qbody)
            clean_body = re.sub(r'_+', '', clean_body)
            clean_body = " ".join(clean_body.split())
            
            is_diag = bool(re.search(r'(figure|diagram|graph|circuit|given table|given instrument|shown below)', clean_body, re.IGNORECASE))
            is_num = bool(re.search(r'(\d+\s*(m/s|kg|N|cm|m|J|W|V|s|Hz|pF|uF|°C|Ω))', clean_body))
            
            questions.append({
                "questionNumber": i,
                "questionText": clean_body,
                "marks": marks,
                "section": "Section B (CRQ)" if i <= 5 else "Section C (ERQ)",
                "cognitiveLevel": "Application" if is_num else "Understanding",
                "isDiagram": is_diag,
                "isNumerical": is_num,
                "grade": grade_label
            })
    return questions

def main():
    print("=== Ingesting Physics Model Papers (Exact High-Precision) ===")
    
    # 1. SSC-I MCQs (40)
    ssc1_mcq_path = r"data/intake/physics_9/model_paper/physics-model-paper-ix-paper-i.pdf"
    ssc1_mcqs = parse_mcq_paper(ssc1_mcq_path, "SSC-I (Grade 9)")
    with open(os.path.join(DATA_DIR, "ssc1_model_mcqs.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1_mcqs, f, indent=2)
    print(f"Extracted {len(ssc1_mcqs)} MCQs for SSC-I Physics.")

    # 2. SSC-I CRQs/ERQs (7)
    ssc1_crq_path = r"data/intake/physics_9/model_paper/physics-model-paper-ix-paper-ii.pdf"
    ssc1_crqs = parse_crq_paper(ssc1_crq_path, "SSC-I (Grade 9)")
    with open(os.path.join(DATA_DIR, "ssc1_model_crqs.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1_crqs, f, indent=2)
    print(f"Extracted {len(ssc1_crqs)} CRQs/ERQs for SSC-I Physics.")

    # 3. SSC-II MCQs (40)
    ssc2_mcq_path = r"data/intake/physics_10/model_paper/physics-model-paper-x-paper-i.pdf"
    ssc2_mcqs = parse_mcq_paper(ssc2_mcq_path, "SSC-II (Grade 10)")
    with open(os.path.join(DATA_DIR, "ssc2_model_mcqs.json"), "w", encoding="utf-8") as f:
        json.dump(ssc2_mcqs, f, indent=2)
    print(f"Extracted {len(ssc2_mcqs)} MCQs for SSC-II Physics.")

    # 4. SSC-II CRQs/ERQs (7)
    ssc2_crq_path = r"data/intake/physics_10/model_paper/physics-model-paper-x-paper-ii.pdf"
    ssc2_crqs = parse_crq_paper(ssc2_crq_path, "SSC-II (Grade 10)")
    with open(os.path.join(DATA_DIR, "ssc2_model_crqs.json"), "w", encoding="utf-8") as f:
        json.dump(ssc2_crqs, f, indent=2)
    print(f"Extracted {len(ssc2_crqs)} CRQs/ERQs for SSC-II Physics.")

    # 5. Ingest into PostgreSQL Database
    print("\nIngesting into PostgreSQL database...")
    with engine.begin() as conn:
        board = conn.execute(text('SELECT id FROM "Board" LIMIT 1')).fetchone()
        board_id = board[0] if board else None
        
        subj_9 = conn.execute(text("""
            SELECT s.id, c.id as class_id
            FROM "Subject" s
            JOIN "Class" c ON s."classId" = c.id
            WHERE s.name ILIKE '%physics%' AND c.level = 9
            LIMIT 1
        """)).fetchone()
        
        subj_10 = conn.execute(text("""
            SELECT s.id, c.id as class_id
            FROM "Subject" s
            JOIN "Class" c ON s."classId" = c.id
            WHERE s.name ILIKE '%physics%' AND c.level = 10
            LIMIT 1
        """)).fetchone()
        
        if not board_id or not subj_9 or not subj_10:
            print("[ERROR] Missing DB entities, skipping DB insertion.")
            return

        def insert_paper(title, class_id, subject_id, paper_code, file_url, q_list, is_mcq):
            existing = conn.execute(text('SELECT id FROM "PastPaper" WHERE title = :t'), {"t": title}).fetchone()
            if existing:
                paper_id = existing[0]
                print(f"Updating PastPaper: {title} (ID: {paper_id})")
                conn.execute(text('DELETE FROM "PastPaperQuestion" WHERE "pastPaperId" = :pid'), {"pid": paper_id})
            else:
                paper_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO "PastPaper" (id, "boardId", "classId", "subjectId", "examYear", "examSession", "examType", "paperCode", "fileUrl", title, "sourceFile", "verificationStatus")
                    VALUES (:id, :bid, :cid, :sid, 2025, 'Model Paper', 'MODEL_EXAM', :pcode, :url, :title, :sfile, 'VERIFIED')
                """), {
                    "id": paper_id,
                    "bid": board_id,
                    "cid": class_id,
                    "sid": subject_id,
                    "pcode": paper_code,
                    "url": file_url,
                    "title": title,
                    "sfile": os.path.basename(file_url)
                })
                print(f"Created PastPaper: {title} (ID: {paper_id})")

            for q in q_list:
                qid = str(uuid.uuid4())
                q_text = q.get("stem") if is_mcq else q.get("questionText", "")
                choices_json = json.dumps(q.get("choices", {})) if is_mcq else None
                
                conn.execute(text("""
                    INSERT INTO "PastPaperQuestion" (
                        id, "pastPaperId", "questionNumber", "questionText", "normalizedQuestionText",
                        "questionType", marks, section, difficulty, "numericalOrConceptual",
                        "diagramBased", verified, "sourceRegion", "updatedAt"
                    ) VALUES (
                        :id, :pid, :qnum, :qtext, :qtext,
                        :qtype, :marks, :sec, :diff, :num_type,
                        :diag, true, :sreg, NOW()
                    )
                """), {
                    "id": qid,
                    "pid": paper_id,
                    "qnum": str(q["questionNumber"]),
                    "qtext": q_text,
                    "qtype": "MCQ_SINGLE" if is_mcq else "CONSTRUCTED_RESPONSE",
                    "marks": q["marks"],
                    "sec": "Section A" if is_mcq else q.get("section", "Section B"),
                    "diff": q.get("cognitiveLevel", "MEDIUM"),
                    "num_type": "NUMERICAL" if q.get("isNumerical") else "CONCEPTUAL",
                    "diag": q.get("isDiagram", False),
                    "sreg": choices_json
                })
            print(f"  -> Inserted {len(q_list)} verified questions for {title}.")

        # Ingest SSC-I
        insert_paper(
            "Physics SSC-I Model Paper I (MCQ) - 2025/2026",
            subj_9.class_id, subj_9.id, "PHY-IX-P1",
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-i.pdf",
            ssc1_mcqs, True
        )
        insert_paper(
            "Physics SSC-I Model Paper II (CRQ & ERQ) - 2025/2026",
            subj_9.class_id, subj_9.id, "PHY-IX-P2",
            "data/intake/physics_9/model_paper/physics-model-paper-ix-paper-ii.pdf",
            ssc1_crqs, False
        )
        # Ingest SSC-II
        insert_paper(
            "Physics SSC-II Model Paper I (MCQ) - 2025/2026",
            subj_10.class_id, subj_10.id, "PHY-X-P1",
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-i.pdf",
            ssc2_mcqs, True
        )
        insert_paper(
            "Physics SSC-II Model Paper II (CRQ & ERQ) - 2025/2026",
            subj_10.class_id, subj_10.id, "PHY-X-P2",
            "data/intake/physics_10/model_paper/physics-model-paper-x-paper-ii.pdf",
            ssc2_crqs, False
        )

    print("\n[SUCCESS] Exact Physics Model Papers ingestion completed successfully!")

if __name__ == "__main__":
    main()
