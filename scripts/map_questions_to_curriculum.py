import sys
import psycopg2
import psycopg2.extras
import json
import re
import uuid

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/mcqs")
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

# 1. Fetch all Topics
cur.execute('''
    SELECT t.id, t.name, t."topicNumber", c.name as class_name
    FROM "Topic" t
    JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
    JOIN "Subject" s ON sv."subjectId" = s.id
    JOIN "Class" c ON s."classId" = c.id;
''')
topics = cur.fetchall()
print(f"Loaded {len(topics)} topics.")

# 2. Fetch all SLOs with topic mapping
cur.execute('''
    SELECT slo.id, slo.code, slo.description, sub."topicId"
    FROM "SLO" slo
    JOIN "Subtopic" sub ON slo."subtopicId" = sub.id;
''')
slos = cur.fetchall()
slo_by_code = {s["code"]: s for s in slos}
print(f"Loaded {len(slos)} SLOs.")

# 3. Fetch all questions
cur.execute('''
    SELECT q.id, q."questionNumber", q."questionText", q."sourceRegion", q."pastPaperId", c.name as class_name
    FROM "PastPaperQuestion" q
    JOIN "PastPaper" p ON q."pastPaperId" = p.id
    JOIN "Class" c ON p."classId" = c.id;
''')
questions = cur.fetchall()
print(f"Processing {len(questions)} questions...")

mapped_slos = 0
mapped_topics = 0

for q in questions:
    q_id = q["id"]
    q_num = int(q["questionNumber"]) if q["questionNumber"].isdigit() else 1
    class_name = q["class_name"]
    src = q["sourceRegion"] or {}
    if isinstance(src, str):
        try:
            src = json.loads(src)
        except Exception:
            src = {}
    
    # Check for direct slo_code
    slo_code = src.get("slo_code")
    target_slo = slo_by_code.get(slo_code) if slo_code else None
    
    # In AKU-EB 40-MCQ exams:
    # 40 MCQs across 10 units = ~4 questions per unit!
    # Q1-4 -> Unit 1 (IX) or Unit 11 (X)
    # Q5-8 -> Unit 2 (IX) or Unit 12 (X), etc.
    base_unit = 0 if "IX" in class_name else 10
    est_unit_offset = min(10, max(1, (q_num - 1) // 4 + 1))
    calc_unit_num = str(base_unit + est_unit_offset)

    # Find topic
    target_topic = next((t for t in topics if t["class_name"] == class_name and t["topicNumber"] == calc_unit_num), None)
    
    if target_topic:
        cur.execute('''
            INSERT INTO "PastPaperQuestionTopic" (id, "pastPaperQuestionId", "topicId")
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING;
        ''', (str(uuid.uuid4()), q_id, target_topic["id"]))
        mapped_topics += 1

        # Also map to first SLO of that topic if no specific SLO
        if not target_slo:
            topic_slos = [s for s in slos if s["topicId"] == target_topic["id"]]
            if topic_slos:
                target_slo = topic_slos[0]

    if target_slo:
        cur.execute('''
            INSERT INTO "PastPaperQuestionSLO" (id, "pastPaperQuestionId", "sloId")
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING;
        ''', (str(uuid.uuid4()), q_id, target_slo["id"]))
        mapped_slos += 1

conn.commit()
print(f"✅ Mapped {mapped_topics} questions to Curriculum Topics.")
print(f"✅ Mapped {mapped_slos} questions to Curriculum SLOs.")
conn.close()
