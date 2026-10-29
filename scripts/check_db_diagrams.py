import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

cur.execute("""
    SELECT q."questionNumber", q."diagramBased", q."sourceRegion", p."paperCode"
    FROM "PastPaperQuestion" q
    JOIN "PastPaper" p ON q."pastPaperId" = p.id
    WHERE q."questionNumber" IN ('40', '9', '10', '15', '8', '17')
    ORDER BY p."paperCode", q."questionNumber";
""")

for row in cur.fetchall():
    print(f"Paper: {row[3]} | Q{row[0]} | diagramBased: {row[1]} | sourceRegion: {str(row[2])[:60]}")

conn.close()
