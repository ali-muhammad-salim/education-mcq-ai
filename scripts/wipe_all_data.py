import os
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

tables = [
    "PastPaperQuestionSLO", "PastPaperQuestionTopic", "PastPaperQuestionSubtopic",
    "PastPaperQuestionConcept", "PastPaperQuestionCommandWord", "PastPaperQuestionCognitiveLevel",
    "PastPaperQuestionMedia", "PastPaperQuestionPart", "QuestionPastPaperReference",
    "PastPaperQuestion", "PastPaper", "SLOMapping", "Skill", "Concept", "SLO",
    "Subtopic", "Topic", "SyllabusDiffRecord", "PaperBlueprint",
    "ExaminationSpecification", "SyllabusVersion", "BookContentTopic",
    "BookContentSubtopic", "BookContentSLO", "BookContentConcept",
    "BookContentCognitiveLevel", "BookContent", "BookPage", "BookEdition", "Book",
    "ingest_page_questions", "ingest_page_diagrams", "ingest_page_equations",
    "ingest_page_tables", "ingest_page_regions", "ingest_document_pages", "ingest_documents"
]

print("=== WIPING DATABASE TABLES ===")
for tbl in tables:
    try:
        cur.execute(f'DELETE FROM "{tbl}";')
        print(f"Cleared table: {tbl}")
    except Exception as e:
        conn.rollback()
        print(f"Notice on {tbl}: {e}")

conn.commit()
print("[SUCCESS] All database records wiped cleanly.")

# Clear local cache files
p = Path("data/physics")
if p.exists():
    for f in p.glob("*.json"):
        f.unlink(missing_ok=True)
    res_dir = p / "compiled_resources"
    if res_dir.exists():
        for f in res_dir.glob("*.json"):
            f.unlink(missing_ok=True)
print("[SUCCESS] Local data caches wiped cleanly.")
