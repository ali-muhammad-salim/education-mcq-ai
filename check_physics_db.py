import os
from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
engine = create_engine(db_url)

with engine.connect() as conn:
    q = """
        SELECT s.id, s.name, c.name as class_name, c.level, p.name as prog_name
        FROM "Subject" s
        JOIN "Class" c ON s."classId" = c.id
        JOIN "Programme" p ON c."programmeId" = p.id
        WHERE s.name ILIKE '%physics%'
        ORDER BY c.level, s.name
    """
    subjects = conn.execute(text(q)).fetchall()
    print("=== Physics Subjects in DB ===")
    for s in subjects:
        print(f"Subject: {s.name} | Class: {s.class_name} (Level {s.level}) | Prog: {s.prog_name} | ID: {s.id}")
        v_q = """
            SELECT id, "versionName", "isLatest"
            FROM "SyllabusVersion"
            WHERE "subjectId" = :sid
        """
        versions = conn.execute(text(v_q), {"sid": s.id}).fetchall()
        for v in versions:
            t_count = conn.execute(text('SELECT count(*) FROM "Topic" WHERE "syllabusVersionId" = :vid'), {"vid": v.id}).scalar()
            slo_count = conn.execute(text('''
                SELECT count(*) FROM "SLO" slo
                JOIN "Subtopic" sub ON slo."subtopicId" = sub.id
                JOIN "Topic" t ON sub."topicId" = t.id
                WHERE t."syllabusVersionId" = :vid
            '''), {"vid": v.id}).scalar()
            print(f"   -> Version: {v.versionName} (ID: {v.id}, Topics: {t_count}, SLOs: {slo_count})")

    print("\n=== Books & Past Papers in DB ===")
    print("Books:", conn.execute(text('SELECT count(*) FROM "Book"')).scalar())
    print("PastPapers:", conn.execute(text('SELECT count(*) FROM "PastPaper"')).scalar())
    print("PastPaperQuestions:", conn.execute(text('SELECT count(*) FROM "PastPaperQuestion"')).scalar())

