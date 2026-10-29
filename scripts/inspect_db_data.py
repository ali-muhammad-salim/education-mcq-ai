import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
engine = create_engine(db_url)

with engine.connect() as conn:
    print("--- 4 PAST PAPERS ---")
    papers = conn.execute(text('SELECT id, title, "paperCode", "examYear", "classId" FROM "PastPaper"')).fetchall()
    for p in papers:
        q_count = conn.execute(text('SELECT count(*) FROM "PastPaperQuestion" WHERE "pastPaperId" = :pid'), {"pid": p.id}).scalar()
        print(f"ID: {p.id} | Code: {p.paperCode} | Year: {p.examYear} | Qs: {q_count} | Title: {p.title}")

    print("\n--- SAMPLE CRQ ---")
    crq = conn.execute(text('SELECT id, "questionNumber", "questionType", marks, "questionText", "sourceRegion" FROM "PastPaperQuestion" WHERE "questionType" != \'MCQ_SINGLE\' LIMIT 1')).fetchone()
    if crq:
        print(dict(crq._mapping))

