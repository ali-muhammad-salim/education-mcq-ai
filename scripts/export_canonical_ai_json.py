import os
import json
import re
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
engine = create_engine(db_url)
out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "physics")
os.makedirs(out_dir, exist_ok=True)

with engine.connect() as conn:
    # 1. Fetch Subjects for Class IX and Class X
    subjects = conn.execute(text('''
        SELECT s.id, s.name, c.level, c.name as class_name
        FROM "Subject" s
        JOIN "Class" c ON s."classId" = c.id
        WHERE s.name ILIKE '%physics%' AND c.level IN (9, 10)
        ORDER BY c.level
    ''')).fetchall()

    for subj in subjects:
        level = subj.level
        prefix = "ssc1" if level == 9 else "ssc2"
        class_str = "Class IX" if level == 9 else "Class X"

        print(f"Exporting canonical AI data for {subj.name} (Grade {level})...")

        # Syllabus
        v_id = conn.execute(text('''
            SELECT id FROM "SyllabusVersion" WHERE "subjectId" = :sid ORDER BY "validFrom" DESC LIMIT 1
        '''), {"sid": subj.id}).scalar()

        syllabus_units = []
        if v_id:
            topics = conn.execute(text('''
                SELECT id, name, "topicNumber" FROM "Topic" 
                WHERE "syllabusVersionId" = :vid 
                ORDER BY "topicNumber"::int
            '''), {"vid": v_id}).fetchall()

            for t_idx, t in enumerate(topics):
                # parse unit number from topicNumber or name
                u_num = int(t.topicNumber) if t.topicNumber and str(t.topicNumber).isdigit() else t_idx + 1

                subtopics_list = []
                subtopics = conn.execute(text('''
                    SELECT id, name, "subtopicNum" FROM "Subtopic" 
                    WHERE "topicId" = :tid 
                    ORDER BY "subtopicNum"
                '''), {"tid": t.id}).fetchall()

                for s in subtopics:
                    slos = conn.execute(text('''
                        SELECT id, code, description, "cognitiveLevel", "isPractical"
                        FROM "SLO" WHERE "subtopicId" = :stid ORDER BY code
                    '''), {"stid": s.id}).fetchall()

                    slo_items = []
                    for slo in slos:
                        cog = slo.cognitiveLevel or 'Understanding'
                        if cog == 'R': cog = 'Remembering'
                        elif cog == 'U': cog = 'Understanding'
                        elif cog == 'A': cog = 'Application'

                        slo_items.append({
                            "code": slo.code or f"{u_num}.{len(slo_items)+1}",
                            "description": slo.description,
                            "cognitiveLevel": cog,
                            "isPractical": slo.isPractical
                        })

                    subtopics_list.append({
                        "subtopicNum": s.subtopicNum or f"{u_num}.{len(subtopics_list)+1}",
                        "name": s.name,
                        "slos": slo_items
                    })

                syllabus_units.append({
                    "unitNumber": u_num,
                    "name": t.name,
                    "subtopics": subtopics_list
                })

        with open(os.path.join(out_dir, f"{prefix}_exact_syllabus.json"), "w", encoding="utf-8") as f:
            json.dump(syllabus_units, f, indent=2, ensure_ascii=False)
        print(f"  -> Saved {prefix}_exact_syllabus.json ({len(syllabus_units)} units)")

        # Past Paper MCQs
        p1_code = "PHY-IX-P1" if level == 9 else "PHY-X-P1"
        p1_paper = conn.execute(text('''
            SELECT id FROM "PastPaper" WHERE "paperCode" = :code
        '''), {"code": p1_code}).fetchone()

        mcqs_data = []
        if p1_paper:
            qs = conn.execute(text('''
                SELECT id, "questionNumber", "questionText", "sourceRegion", marks, difficulty, "diagramBased", "equationBased"
                FROM "PastPaperQuestion"
                WHERE "pastPaperId" = :pid AND "questionType" = 'MCQ_SINGLE'
                ORDER BY "questionNumber"::int
            '''), {"pid": p1_paper.id}).fetchall()

            for q in qs:
                src = q.sourceRegion or {}
                choices = src.get("choices") or {}
                q_num = int(q.questionNumber) if q.questionNumber.isdigit() else len(mcqs_data)+1
                cog = q.difficulty or "Understanding"

                mcqs_data.append({
                    "questionNumber": q_num,
                    "stem": q.questionText,
                    "options": {
                        "A": choices.get("A", "Option A"),
                        "B": choices.get("B", "Option B"),
                        "C": choices.get("C", "Option C"),
                        "D": choices.get("D", "Option D")
                    },
                    "correctOption": src.get("correct_answer") or src.get("solved_correct_option") or "",
                    "explanation": src.get("explanation") or "",
                    "cognitiveLevel": cog,
                    "isDiagram": q.diagramBased or False,
                    "isNumerical": q.equationBased or False,
                    "marks": q.marks or 1.0
                })

        with open(os.path.join(out_dir, f"{prefix}_model_mcqs.json"), "w", encoding="utf-8") as f:
            json.dump(mcqs_data, f, indent=2, ensure_ascii=False)
        print(f"  -> Saved {prefix}_model_mcqs.json ({len(mcqs_data)} MCQs)")

        # CRQs & ERQs (Paper II)
        p2_code = "PHY-IX-P2" if level == 9 else "PHY-X-P2"
        p2_paper = conn.execute(text('''
            SELECT id FROM "PastPaper" WHERE "paperCode" = :code
        '''), {"code": p2_code}).fetchone()

        crqs_data = []
        if p2_paper:
            qs = conn.execute(text('''
                SELECT id, "questionNumber", "questionText", "sourceRegion", marks
                FROM "PastPaperQuestion"
                WHERE "pastPaperId" = :pid AND "questionType" != 'MCQ_SINGLE'
                ORDER BY id
            '''), {"pid": p2_paper.id}).fetchall()

            for idx, q in enumerate(qs):
                src = q.sourceRegion or {}
                crqs_data.append({
                    "questionNumber": q.questionNumber or f"Q.{idx+1}",
                    "marks": q.marks or 3.0,
                    "stem": q.questionText,
                    "rubric": src.get("rubric") or [],
                    "modelAnswer": src.get("model_answer") or ""
                })

        with open(os.path.join(out_dir, f"{prefix}_model_crqs.json"), "w", encoding="utf-8") as f:
            json.dump(crqs_data, f, indent=2, ensure_ascii=False)
        print(f"  -> Saved {prefix}_model_crqs.json ({len(crqs_data)} CRQs/ERQs)")

        # Pacing Guide & Practicals (Standard AKU-EB Structure)
        pacing_data = []
        for u in syllabus_units:
            pacing_data.append({
                "unitNumber": u["unitNumber"],
                "unitName": u["name"],
                "suggestedWeeks": 3,
                "suggestedPeriods": 12,
                "sloCount": sum(len(sub["slos"]) for sub in u["subtopics"])
            })
        with open(os.path.join(out_dir, f"{prefix}_pacing.json"), "w", encoding="utf-8") as f:
            json.dump(pacing_data, f, indent=2, ensure_ascii=False)

        if level == 9:
            practicals_data = [
                {"expNumber": 1, "title": "Determine volume of a regular solid using vernier callipers and screw gauge.", "apparatus": "Vernier callipers, cylinder, sphere, screw gauge"},
                {"expNumber": 2, "title": "Determine weight of a body using vector addition of concurrent forces.", "apparatus": "Gravesand's apparatus, weights, pulleys, paper"},
                {"expNumber": 3, "title": "Determine acceleration due to gravity 'g' using free fall / simple pendulum.", "apparatus": "Pendulum bob, string, stopwatch, meter rule"},
                {"expNumber": 4, "title": "Verify Hooke's Law and determine spring constant.", "apparatus": "Helical spring, slotted weights, pointer, vertical scale"}
            ]
            with open(os.path.join(out_dir, f"{prefix}_practicals.json"), "w", encoding="utf-8") as f:
                json.dump(practicals_data, f, indent=2, ensure_ascii=False)

print("ALL CANONICAL AI JSON FILES SUCCESSFULLY GENERATED!")
