import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/mcqs')
cur = conn.cursor()

print("=== Cognitive Distribution in SLOs ===")
cur.execute('SELECT "cognitiveLevel", count(*) FROM "SLO" GROUP BY 1 ORDER BY 2 DESC')
for r in cur.fetchall():
    print(f"  Level {r[0]}: {r[1]} SLOs")

print("\n=== Model Paper Question Attributes ===")
cur.execute('SELECT "numericalOrConceptual", "diagramBased", "questionType", count(*) FROM "PastPaperQuestion" GROUP BY 1, 2, 3')
for r in cur.fetchall():
    print(f"  Num/Concept: {r[0]} | Diagram: {r[1]} | Type: {r[2]} | Count: {r[3]}")

print("\n=== Sample Unit-Wise Question Counts ===")
cur.execute('''
    SELECT t."topicNumber", t.name, count(q.id) 
    FROM "Topic" t 
    LEFT JOIN "PastPaperQuestion" q ON q."topicId" = t.id 
    GROUP BY 1, 2 
    ORDER BY t."topicNumber"::int
''')
for r in cur.fetchall():
    print(f"  Unit {r[0]}: {r[1]} -> {r[2]} questions mapped")
