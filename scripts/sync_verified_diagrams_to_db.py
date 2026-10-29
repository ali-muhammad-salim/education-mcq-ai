"""
Synchronize verified diagram crops from data/physics/verified_diagrams_manifest.json
into the PastPaperQuestion database records.
Ensures non-diagram questions (like Q.40) have diagramBased=False and diagramUrl=None,
while confirmed diagram questions (Q.9, Q.10, Q.15, etc.) have diagramBased=True and their clean cropped diagramUrl.
"""

import os
import json
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

with open("data/physics/verified_diagrams_manifest.json", "r", encoding="utf-8") as f:
    manifest = json.load(f)

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

# Manifest keys: 'PHY-IX-2025-P1', 'PHY-X-2025-P1', 'PHY-IX-2025-P2', 'PHY-X-2025-P2'
# Paper codes in DB could be 'PHY-IX-2025-P1' or 'PHY-IX-P1', etc.
paper_code_aliases = {
    "PHY-IX-2025-P1": ["PHY-IX-2025-P1", "PHY-IX-P1"],
    "PHY-X-2025-P1": ["PHY-X-2025-P1", "PHY-X-P1"],
    "PHY-IX-2025-P2": ["PHY-IX-2025-P2", "PHY-IX-P2"],
    "PHY-X-2025-P2": ["PHY-X-2025-P2", "PHY-X-P2"]
}

total_updated = 0

for manifest_key, diag_dict in manifest.items():
    aliases = paper_code_aliases.get(manifest_key, [manifest_key])
    for p_code in aliases:
        cur.execute('SELECT id FROM "PastPaper" WHERE "paperCode" = %s LIMIT 1;', (p_code,))
        p_row = cur.fetchone()
        if not p_row:
            continue
        paper_id = p_row[0]

        # Fetch all questions for this paper
        cur.execute('SELECT id, "questionNumber", "sourceRegion" FROM "PastPaperQuestion" WHERE "pastPaperId" = %s;', (paper_id,))
        questions = cur.fetchall()

        for q in questions:
            q_id = q[0]
            raw_q = str(q[1])
            clean_q = raw_q.replace("Q.", "").replace("Q", "").replace(".", "").strip()

            meta = q[2] if isinstance(q[2], dict) else {}
            if isinstance(q[2], str):
                try:
                    meta = json.loads(q[2])
                except Exception:
                    meta = {}

            if clean_q in diag_dict:
                diag_info = diag_dict[clean_q]
                diag_url = diag_info["diagramUrl"]
                diag_desc = diag_info.get("description", "")
                
                meta["diagramUrl"] = diag_url
                meta["diagram_url"] = diag_url
                meta["diagramDescription"] = diag_desc
                meta["isDiagram"] = True
                meta["diagramBased"] = True

                cur.execute('''
                    UPDATE "PastPaperQuestion"
                    SET "diagramBased" = true, "sourceRegion" = %s
                    WHERE id = %s;
                ''', (json.dumps(meta), q_id))
                total_updated += 1
                print(f"[{p_code}] Q{clean_q}: Linked diagram -> {diag_url}")
            else:
                # Strictly ensure non-diagram questions have no diagram
                meta["diagramUrl"] = None
                meta["diagram_url"] = None
                meta["isDiagram"] = False
                meta["diagramBased"] = False

                cur.execute('''
                    UPDATE "PastPaperQuestion"
                    SET "diagramBased" = false, "sourceRegion" = %s
                    WHERE id = %s;
                ''', (json.dumps(meta), q_id))
                total_updated += 1

conn.commit()
conn.close()

print(f"\n[SUCCESS] Successfully updated {total_updated} question records in DB with verified diagrams!")
