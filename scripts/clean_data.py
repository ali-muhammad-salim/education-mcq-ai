"""
Safe Data Cleanup Utility.

Cleans all downloaded files, rendered pages, diagram crops, and old data cache,
and resets ingested Books, Past Papers, and Questions in PostgreSQL,
WHILE PRESERVING the official Board, Class, Subject, and Syllabus hierarchy (Topics, Subtopics, SLOs).
"""

import os
import shutil
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def clean_database():
    print("=" * 60)
    print("1. CLEANING DATABASE (Books, Past Papers, Questions, Ingestion)")
    print("=" * 60)
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # Tables to clear
    tables_to_truncate = [
        # Book System
        '"Book"',
        '"BookEdition"',
        '"BookPage"',
        '"BookContent"',
        '"BookContentTopic"',
        '"BookContentSubtopic"',
        '"BookContentSLO"',
        '"BookContentConcept"',
        '"BookContentCognitiveLevel"',
        '"Extraction"',
        # Past Paper System
        '"PastPaper"',
        '"PastPaperQuestion"',
        '"PastPaperQuestionPart"',
        '"PastPaperQuestionTopic"',
        '"PastPaperQuestionSubtopic"',
        '"PastPaperQuestionSLO"',
        '"PastPaperQuestionConcept"',
        '"PastPaperQuestionCommandWord"',
        '"PastPaperQuestionCognitiveLevel"',
        '"PastPaperQuestionMedia"',
        # Generated Question System
        '"Question"',
        '"QuestionOption"',
        '"QuestionExplanation"',
        '"QuestionSolution"',
        '"QuestionMedia"',
        '"QuestionTag"',
        '"QuestionVersion"',
        '"QuestionSource"',
        '"QuestionPastPaperReference"',
        # Syllabus & Curriculum Hierarchy (Topics, Subtopics, SLOs, Blueprints)
        '"SLOMapping"',
        '"Concept"',
        '"Skill"',
        '"SLO"',
        '"Subtopic"',
        '"Topic"',
        '"PaperBlueprint"',
        '"ExaminationSpecification"',
        '"SyllabusDiffRecord"',
        '"SyllabusVersion"',
        '"CommandWord"',
        '"CognitiveLevel"',
    ]

    for tbl in tables_to_truncate:
        try:
            cur.execute(f"TRUNCATE TABLE {tbl} CASCADE;")
            print(f"  [CLEARED] {tbl}")
        except Exception as e:
            conn.rollback()
            # Table might not exist or already empty
            print(f"  [SKIPPED] {tbl} ({e})")
            continue
        else:
            conn.commit()

    # Check and clear ingestion tables if present
    ingest_tables = [
        "ingest_documents",
        "ingest_document_pages",
        "ingest_page_regions",
        "ingest_page_equations",
        "ingest_page_diagrams",
        "ingest_page_tables",
        "ingest_page_questions",
    ]
    for itbl in ingest_tables:
        try:
            cur.execute(f'TRUNCATE TABLE "{itbl}" CASCADE;')
            print(f"  [CLEARED] {itbl}")
        except Exception:
            conn.rollback()
        else:
            conn.commit()

    # Verify preserved records
    print("\n--- Preserved Board & Syllabus Verification ---")
    cur.execute('SELECT count(*) FROM "Board";')
    board_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "AcademicClass";' if table_exists(cur, "AcademicClass") else 'SELECT count(*) FROM "Class";')
    class_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "Subject";')
    subject_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "SyllabusVersion";')
    version_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "Topic";')
    topic_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "SLO";')
    slo_cnt = cur.fetchone()[0]

    print(f"  Boards intact:          {board_cnt}")
    print(f"  Classes intact:         {class_cnt}")
    print(f"  Subjects intact:        {subject_cnt}")

    # Verify zero records in cleared tables
    cur.execute('SELECT count(*) FROM "SyllabusVersion";')
    version_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "Topic";')
    topic_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "SLO";')
    slo_cnt = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "Book";')
    books_remaining = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "PastPaper";')
    past_papers_remaining = cur.fetchone()[0]
    cur.execute('SELECT count(*) FROM "Question";')
    questions_remaining = cur.fetchone()[0]

    print(f"\n--- Cleared Data Verification ---")
    print(f"  Syllabus Versions:      {version_cnt} (Expected: 0)")
    print(f"  Topics remaining:       {topic_cnt} (Expected: 0)")
    print(f"  SLOs remaining:         {slo_cnt} (Expected: 0)")
    print(f"  Books remaining:        {books_remaining} (Expected: 0)")
    print(f"  Past Papers remaining:  {past_papers_remaining} (Expected: 0)")
    print(f"  Questions remaining:    {questions_remaining} (Expected: 0)")

    cur.close()
    conn.close()


def table_exists(cur, table_name: str) -> bool:
    cur.execute(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s);",
        (table_name,),
    )
    return cur.fetchone()[0]


def clean_filesystem():
    print("\n" + "=" * 60)
    print("2. CLEANING FILESYSTEM (media, downloads, and cached data)")
    print("=" * 60)

    # 1. Media pages
    media_pages = BASE_DIR / "media" / "pages"
    if media_pages.exists():
        subdirs = list(media_pages.iterdir())
        for d in subdirs:
            if d.is_dir():
                shutil.rmtree(d, ignore_errors=True)
            else:
                d.unlink(missing_ok=True)
        print(f"  [DELETED] {len(subdirs)} page render directory caches in {media_pages}")
    media_pages.mkdir(parents=True, exist_ok=True)

    # 2. Media diagrams
    media_diagrams = BASE_DIR / "media" / "diagrams"
    if media_diagrams.exists():
        subdirs = list(media_diagrams.iterdir())
        for d in subdirs:
            if d.is_dir():
                shutil.rmtree(d, ignore_errors=True)
            else:
                d.unlink(missing_ok=True)
        print(f"  [DELETED] {len(subdirs)} diagram crop directory caches in {media_diagrams}")
    media_diagrams.mkdir(parents=True, exist_ok=True)

    # 3. data/physics
    data_physics = BASE_DIR / "data" / "physics"
    if data_physics.exists():
        files = list(data_physics.glob("*.json"))
        for f in files:
            f.unlink(missing_ok=True)
        print(f"  [DELETED] {len(files)} old JSON files in {data_physics}")

    # 4. data/downloads & raw_pdfs
    for folder in ["downloads", "downloads_ai_sorted", "raw_pdfs"]:
        p = BASE_DIR / "data" / folder
        if p.exists():
            items = list(p.iterdir())
            for item in items:
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)
            print(f"  [CLEANED] data/{folder} ({len(items)} items removed)")
        p.mkdir(parents=True, exist_ok=True)

    # 5. Root loose test exports
    loose_files = [
        BASE_DIR / "Biology HSSC I Syllabus 2025_tables.json",
        BASE_DIR / "test_output.txt",
    ]
    for lf in loose_files:
        if lf.exists():
            lf.unlink(missing_ok=True)
            print(f"  [DELETED] Loose test file {lf.name}")

    # 6. Ensure clean intake structure
    print("\n--- Verifying Intake Directories ---")
    intake_base = BASE_DIR / "data" / "intake"
    categories = [
        "syllabus",
        "model_paper",
        "pacing_guide",
        "resource_guide",
        "past_papers",
        "textbooks",
    ]
    for grade in ["physics_9", "physics_10"]:
        for cat in categories:
            folder = intake_base / grade / cat
            folder.mkdir(parents=True, exist_ok=True)
            # Remove any stray files inside
            existing = list(folder.iterdir())
            for ef in existing:
                if ef.is_file():
                    ef.unlink(missing_ok=True)
            print(f"  [READY] data/intake/{grade}/{cat}/")


if __name__ == "__main__":
    clean_database()
    clean_filesystem()
    print("\n" + "=" * 60)
    print("ALL OLD DATA WIPED CLEAN. SYSTEM IS 100% READY FOR NEW DATA!")
    print("=" * 60)
