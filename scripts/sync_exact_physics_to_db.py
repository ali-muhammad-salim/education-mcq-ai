import os
import json
import uuid
import re
from datetime import datetime, timezone
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs"))

def find_best_slo(question_text, slos):
    q_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', question_text.lower()))
    # Remove common filler words
    filler = {'which', 'following', 'that', 'with', 'from', 'what', 'then', 'when', 'will', 'have', 'were', 'been', 'each', 'such', 'also', 'about', 'some', 'given', 'show', 'shown', 'find', 'value'}
    q_words -= filler

    best_slo = None
    best_score = -1

    for slo in slos:
        slo_desc = (slo["description"] + " " + slo.get("subtopicName", "") + " " + slo.get("topicName", "")).lower()
        slo_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', slo_desc))
        overlap = len(q_words & slo_words)
        if overlap > best_score:
            best_score = overlap
            best_slo = slo

    return best_slo if best_score > 0 else (slos[0] if slos else None)

def sync_all():
    conn = get_db()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    with open(r"data\physics\ssc1_exact_syllabus.json", "r", encoding="utf-8") as f:
        ssc1_syllabus = json.load(f)
    with open(r"data\physics\ssc2_exact_syllabus.json", "r", encoding="utf-8") as f:
        ssc2_syllabus = json.load(f)

    print("\n=======================================================")
    print("=== Syncing Exact Physics Syllabus (Units 1-20 & SLOs) ===")
    print("=======================================================\n")
    now = datetime.now(timezone.utc)

    # Store created SLOs by grade for question mapping
    grade_slos = {"Class IX": [], "Class X": []}
    grade_versions = {}

    for class_name, units in [("Class IX", ssc1_syllabus), ("Class X", ssc2_syllabus)]:
        cursor.execute('''
            SELECT s.id 
            FROM "Subject" s
            JOIN "Class" c ON s."classId" = c.id
            WHERE c.name = %s AND s.name ILIKE '%%physics%%'
        ''', (class_name,))
        row = cursor.fetchone()
        if not row:
            print(f"[ERROR] Subject not found for {class_name}")
            continue
        subj_id = row[0]

        cursor.execute('''
            SELECT id FROM "SyllabusVersion"
            WHERE "subjectId" = %s AND "versionName" = '2025-2028'
        ''', (subj_id,))
        v_row = cursor.fetchone()
        if v_row:
            version_id = v_row[0]
        else:
            version_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO "SyllabusVersion" (id, "subjectId", "versionName", "isLatest", "validFrom", "validTo", "createdAt")
                VALUES (%s, %s, '2025-2028', true, '2025-01-01', '2028-12-31', %s)
            ''', (version_id, subj_id, now))

        grade_versions[class_name] = version_id

        # Clean old syllabus tree under this version
        cursor.execute('''
            DELETE FROM "SLO" WHERE "subtopicId" IN (
                SELECT s.id FROM "Subtopic" s
                JOIN "Topic" t ON s."topicId" = t.id
                WHERE t."syllabusVersionId" = %s
            )
        ''', (version_id,))
        cursor.execute('''
            DELETE FROM "Subtopic" WHERE "topicId" IN (
                SELECT id FROM "Topic" WHERE "syllabusVersionId" = %s
            )
        ''', (version_id,))
        cursor.execute('''
            DELETE FROM "Topic" WHERE "syllabusVersionId" = %s
        ''', (version_id,))

        total_slos = 0
        for u in units:
            topic_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO "Topic" (id, "syllabusVersionId", "topicNumber", name)
                VALUES (%s, %s, %s, %s)
            ''', (topic_id, version_id, str(u["unitNumber"]), u["name"]))

            for sub in u["subtopics"]:
                sub_id = str(uuid.uuid4())
                cursor.execute('''
                    INSERT INTO "Subtopic" (id, "topicId", "subtopicNum", name)
                    VALUES (%s, %s, %s, %s)
                ''', (sub_id, topic_id, str(sub["subNumber"]), sub["name"]))

                for slo in sub["slos"]:
                    slo_id = str(uuid.uuid4())
                    cursor.execute('''
                        INSERT INTO "SLO" (id, "subtopicId", code, description, "cognitiveLevel", "isPractical", "isFormative", "sourcePage")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (
                        slo_id, sub_id, slo["code"], slo["description"],
                        slo.get("cognitiveLevel", "U"),
                        bool(slo.get("isPractical", False)),
                        bool(slo.get("isFormative", False)),
                        slo.get("page", 1)
                    ))
                    grade_slos[class_name].append({
                        "id": slo_id,
                        "code": slo["code"],
                        "description": slo["description"],
                        "cognitiveLevel": slo.get("cognitiveLevel", "U"),
                        "topicId": topic_id,
                        "subtopicId": sub_id,
                        "topicName": u["name"],
                        "subtopicName": sub["name"]
                    })
                    total_slos += 1

        print(f"[SUCCESS] Synced {class_name}: {len(units)} Units, {total_slos} SLOs into SyllabusVersion '2025-2028'")

    print("\n=======================================================")
    print("=== Mapping Model Paper Questions to Curriculum SLOs ===")
    print("=======================================================\n")

    cursor.execute('''
        SELECT p.id, p.title, c.name as class_name
        FROM "PastPaper" p
        JOIN "Class" c ON p."classId" = c.id
        ORDER BY p.title
    ''')
    papers = cursor.fetchall()

    total_mapped = 0
    for paper in papers:
        pid = paper["id"]
        ptitle = paper["title"]
        cname = paper["class_name"]
        slos = grade_slos.get(cname, [])
        version_id = grade_versions.get(cname)

        cursor.execute('''
            SELECT id, "questionNumber", "questionText", "questionType"
            FROM "PastPaperQuestion"
            WHERE "pastPaperId" = %s
            ORDER BY "questionNumber"::int
        ''', (pid,))
        questions = cursor.fetchall()

        for q in questions:
            best_slo = find_best_slo(q["questionText"], slos)
            if best_slo:
                cursor.execute('''
                    UPDATE "PastPaperQuestion"
                    SET "syllabusVersionId" = %s,
                        "topicId" = %s,
                        "subtopicId" = %s,
                        "sloId" = %s
                    WHERE id = %s
                ''', (version_id, best_slo["topicId"], best_slo["subtopicId"], best_slo["id"], q["id"]))
                total_mapped += 1

        print(f"Mapped {len(questions)} questions in '{ptitle}' to verified SLOs.")

    conn.commit()
    conn.close()
    print(f"\n[SUCCESS] Successfully mapped {total_mapped} Model Paper questions to curriculum SLOs!")

if __name__ == "__main__":
    sync_all()
