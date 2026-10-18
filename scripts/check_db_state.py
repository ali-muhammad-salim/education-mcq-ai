import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

for tbl in ["Board", "Class", "Subject", "SyllabusVersion", "Topic", "Subtopic", "SLO", "PastPaper", "PastPaperQuestion"]:
    cur.execute(f'SELECT count(*) FROM "{tbl}"')
    print(f"{tbl}: {cur.fetchone()[0]}")

cur.execute('SELECT id, name FROM "Board"')
print("Boards:", cur.fetchall())

cur.execute('SELECT id, name, level FROM "Class"')
print("Classes:", cur.fetchall())

cur.execute('SELECT s.id, s.name, c.name FROM "Subject" s JOIN "Class" c ON s."classId" = c.id')
print("Subjects:", cur.fetchall())
