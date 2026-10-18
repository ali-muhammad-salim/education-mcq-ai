import psycopg2
import psycopg2.extras

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/mcqs')
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

print("=== CLASS IX TOPICS IN POSTGRESQL ===")
cur.execute('''
    SELECT t.id, t."topicNumber", t.name, count(slo.id) as slo_count
    FROM "Topic" t
    JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
    JOIN "Subject" s ON sv."subjectId" = s.id
    JOIN "Class" c ON s."classId" = c.id
    LEFT JOIN "Subtopic" sub ON sub."topicId" = t.id
    LEFT JOIN "SLO" slo ON slo."subtopicId" = sub.id
    WHERE c.name = 'Class IX'
    GROUP BY t.id, t."topicNumber", t.name
    ORDER BY t."topicNumber";
''')
for r in cur.fetchall():
    print(f"Topic {r['topicNumber']}: {r['name']} (SLOs: {r['slo_count']})")

print("\n=== CLASS X TOPICS IN POSTGRESQL ===")
cur.execute('''
    SELECT t.id, t."topicNumber", t.name, count(slo.id) as slo_count
    FROM "Topic" t
    JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
    JOIN "Subject" s ON sv."subjectId" = s.id
    JOIN "Class" c ON s."classId" = c.id
    LEFT JOIN "Subtopic" sub ON sub."topicId" = t.id
    LEFT JOIN "SLO" slo ON slo."subtopicId" = sub.id
    WHERE c.name = 'Class X'
    GROUP BY t.id, t."topicNumber", t.name
    ORDER BY t."topicNumber";
''')
for r in cur.fetchall():
    print(f"Topic {r['topicNumber']}: {r['name']} (SLOs: {r['slo_count']})")
