import os
from sqlalchemy import create_engine, text

def main():
    db_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        def get_count(table_name):
            try:
                res = conn.execute(text(f'SELECT count(*) FROM "{table_name}"')).scalar()
                return res
            except Exception as e:
                return str(e)
                
        print("Board:", get_count("Board"))
        print("Programme:", get_count("Programme"))
        print("Class:", get_count("Class"))
        print("Subject:", get_count("Subject"))
        print("SyllabusVersion:", get_count("SyllabusVersion"))
        print("Topic:", get_count("Topic"))
        print("Subtopic:", get_count("Subtopic"))
        print("SLO:", get_count("SLO"))
        try:
            print("SLO (with embedding):", conn.execute(text('SELECT count(*) FROM "SLO" WHERE embedding IS NOT NULL')).scalar())
        except Exception as e:
            print("SLO (with embedding):", str(e))

if __name__ == "__main__":
    main()
