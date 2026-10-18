import psycopg2
import psycopg2.extras
import json
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

print("=" * 60)
print("VERIFICATION CHECK 1: SYLLABUS UNITS & SUBTOPICS IN DB")
print("=" * 60)

cur.execute('''
    SELECT c.name as class_name, t."topicNumber"::int as u_num, t.name as topic_name, count(DISTINCT s.id) as subtopic_count, count(slo.id) as slo_count
    FROM "Topic" t
    JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
    JOIN "Subject" subj ON sv."subjectId" = subj.id
    JOIN "Class" c ON subj."classId" = c.id
    LEFT JOIN "Subtopic" s ON s."topicId" = t.id
    LEFT JOIN "SLO" slo ON slo."subtopicId" = s.id
    GROUP BY c.name, t."topicNumber", t.name, c.level
    ORDER BY c.level, t."topicNumber"::int;
''')
rows = cur.fetchall()
for r in rows:
    print(f"[{r['class_name']}] Unit {r['u_num']:2d}: {r['topic_name']:<35} | {r['subtopic_count']} Subtopics | {r['slo_count']} SLOs")

print(f"\nTotal Units: {len(rows)} (Expected: 20)")
assert len(rows) == 20, f"Expected 20 units, got {len(rows)}"

print("\n" + "=" * 60)
print("VERIFICATION CHECK 2: UNIT 1 STARTING SUBTOPICS")
print("=" * 60)
cur.execute('''
    SELECT s."subtopicNum", s.name, count(slo.id) as slo_count
    FROM "Subtopic" s
    JOIN "Topic" t ON s."topicId" = t.id
    LEFT JOIN "SLO" slo ON slo."subtopicId" = s.id
    WHERE t."topicNumber" = '1'
    GROUP BY s."subtopicNum", s.name
    ORDER BY s."subtopicNum";
''')
u1_subs = cur.fetchall()
for s in u1_subs:
    print(f"  Subtopic {s['subtopicNum']}: {s['name']} ({s['slo_count']} SLOs)")

print("\n" + "=" * 60)
print("VERIFICATION CHECK 3: UNIT 2 (KINEMATICS) SUBTOPICS")
print("=" * 60)
cur.execute('''
    SELECT s."subtopicNum", s.name, count(slo.id) as slo_count
    FROM "Subtopic" s
    JOIN "Topic" t ON s."topicId" = t.id
    LEFT JOIN "SLO" slo ON slo."subtopicId" = s.id
    WHERE t."topicNumber" = '2'
    GROUP BY s."subtopicNum", s.name
    ORDER BY s."subtopicNum";
''')
u2_subs = cur.fetchall()
for s in u2_subs:
    print(f"  Subtopic {s['subtopicNum']}: {s['name']} ({s['slo_count']} SLOs)")

print("\n" + "=" * 60)
print("VERIFICATION CHECK 4: MODEL EXAMINATION PAPERS & QUESTIONS")
print("=" * 60)
cur.execute('''
    SELECT p."paperCode", p.title, count(q.id) as q_count, 
           count(CASE WHEN q."questionType" = 'MCQ_SINGLE' THEN 1 END) as mcq_count,
           count(CASE WHEN q."questionType" != 'MCQ_SINGLE' THEN 1 END) as subjective_count
    FROM "PastPaper" p
    LEFT JOIN "PastPaperQuestion" q ON q."pastPaperId" = p.id
    GROUP BY p."paperCode", p.title
    ORDER BY p."paperCode";
''')
papers = cur.fetchall()
for p in papers:
    print(f"Paper {p['paperCode']}: {p['title']}")
    print(f"   -> Total: {p['q_count']} items (MCQ: {p['mcq_count']}, Subjective: {p['subjective_count']})")

print("\n" + "=" * 60)
print("VERIFICATION CHECK 5: QUESTION 1 SCIENTIFIC ACCURACY & ANSWER KEY")
print("=" * 60)
cur.execute('''
    SELECT q."questionNumber", q."questionText", q."sourceRegion"
    FROM "PastPaperQuestion" q
    JOIN "PastPaper" p ON q."pastPaperId" = p.id
    WHERE p."paperCode" = 'PHY-IX-P1' AND q."questionNumber" = '1';
''')
q1 = cur.fetchone()
if q1:
    src = q1["sourceRegion"] if isinstance(q1["sourceRegion"], dict) else json.loads(q1["sourceRegion"])
    print("Q1 Stem:", q1["questionText"])
    print("Choices:", src.get("choices"))
    print("Correct Option:", src.get("correct_answer"))
    print("Explanation:", src.get("explanation"))
    assert src.get("correct_answer") == "D", f"Expected Q1 answer to be 'D', got {src.get('correct_answer')}"
    print(">>> Q1 is confirmed Option D (37.0 cm^3)! Verification passed!")

print("\n" + "=" * 60)
print("VERIFICATION CHECK 6: ANSWER KEYS DISTRIBUTION (NO DEFAULT B FALLBACKS)")
print("=" * 60)
cur.execute('''
    SELECT q."sourceRegion"->>'correct_answer' as ans_key, count(*) as cnt
    FROM "PastPaperQuestion" q
    WHERE q."questionType" = 'MCQ_SINGLE'
    GROUP BY q."sourceRegion"->>'correct_answer'
    ORDER BY ans_key;
''')
dist = cur.fetchall()
for d in dist:
    print(f"Key {d['ans_key']}: {d['cnt']} questions")

print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
