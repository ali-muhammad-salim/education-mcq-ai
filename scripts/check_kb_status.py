import psycopg2

conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/mcqs')
cur = conn.cursor()

cur.execute('SELECT count(*) FROM "SLO" WHERE embedding IS NOT NULL')
emb_count = cur.fetchone()[0]

cur.execute('SELECT count(*) FROM "Concept"')
concept_count = cur.fetchone()[0]

cur.execute('SELECT count(*) FROM "Skill"')
skill_count = cur.fetchone()[0]

print(f"Progress: Concepts={concept_count}, Skills={skill_count}, Embedded SLOs={emb_count}/327")
