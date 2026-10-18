import os
import httpx
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
API_KEY = os.getenv("GEMINI_API_KEY")

def test_semantic_search(query):
    print(f"\nQuery: '{query}'")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={API_KEY}"
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": query}]},
        "outputDimensionality": 768
    }
    resp = httpx.post(url, json=payload, timeout=10)
    emb_vals = resp.json()["embedding"]["values"]
    emb_str = "[" + ",".join(str(x) for x in emb_vals) + "]"

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    cur.execute('''
        SELECT 
            s.code, s.description, s."cognitiveLevel",
            t."topicNumber", t.name as topic_name,
            c.name as concept_name,
            1 - (s.embedding <=> %s::vector) as similarity
        FROM "SLO" s
        JOIN "Subtopic" sub ON s."subtopicId" = sub.id
        JOIN "Topic" t ON sub."topicId" = t.id
        LEFT JOIN "Concept" c ON c."sloId" = s.id
        ORDER BY s.embedding <=> %s::vector ASC
        LIMIT 3
    ''', (emb_str, emb_str))
    
    rows = cur.fetchall()
    for i, r in enumerate(rows, 1):
        print(f"  {i}. [Sim: {r['similarity']:.3f}] Unit {r['topicNumber']} ({r['topic_name']}) | SLO {r['code']} ({r['cognitiveLevel']})")
        print(f"     Concept: {r['concept_name']}")
        safe_desc = r['description'].encode('ascii', 'replace').decode('ascii')
        print(f"     Description: {safe_desc}")
    conn.close()

if __name__ == "__main__":
    test_semantic_search("What is the principle of optical fibers and total internal reflection?")
    test_semantic_search("Calculate the acceleration of a falling object in gravitational field")
    test_semantic_search("Boolean logic gates and truth table for NAND gate")
