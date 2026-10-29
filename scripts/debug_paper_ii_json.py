import os
import sys
import asyncio
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import re
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

from services.inference.gemini_client import GeminiClient
import pymupdf

async def test_extraction():
    doc = pymupdf.open('data/intake/physics_10/model_paper/physics-model-paper-x-paper-ii.pdf')
    full_text = ""
    for p in range(2, len(doc) + 1):
        full_text += f"\n--- PAGE {p} ---\n" + doc[p - 1].get_text()

    client = GeminiClient()
    prompt = f"""
You are an expert AKU-EB Physics examiner parsing official Model Paper II (Constructed & Extended Response Questions).
Class: Class X

Document Text:
{full_text}

TASK:
Extract all CRQs (Section B) and ERQs (Section C).
For each question:
1. "question_number": e.g. "Q.1", "Q.2(a)", etc.
2. "stem": question text. Preserve LaTeX mathematical notation.
3. "marks": marks allocated (e.g. 3.0, 4.0, 5.0).
4. "rubric": array of marking points/criteria with step marks.
5. "model_answer": detailed solution/answer.
6. "question_type": "CONSTRUCTED_RESPONSE" for Section B, "EXTENDED_RESPONSE" for Section C.

Return pure valid JSON only:
{{
  "questions": [
    {{
      "question_number": "Q.1",
      "stem": "Question stem here...",
      "marks": 3.0,
      "rubric": [{{"marks": 1, "description": "Step 1"}}],
      "model_answer": "Model answer here...",
      "question_type": "CONSTRUCTED_RESPONSE"
    }}
  ]
}}
"""
    res = await client.generate(prompt=prompt)
    raw = res.text
    print("Raw length:", len(raw))

    cleaned = re.sub(r'^```json\s*', '', raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'```$', '', cleaned.strip(), flags=re.MULTILINE)

    try:
        data = json.loads(cleaned)
        print("Standard json.loads succeeded! Questions count:", len(data.get("questions", [])))
    except Exception as e:
        print("Standard error:", e)
        # Find where it failed
        m = re.search(r'char (\d+)', str(e))
        if m:
            pos = int(m.group(1))
            snippet = cleaned[max(0, pos - 50):min(len(cleaned), pos + 50)]
            print(f"Around char {pos}:\n{snippet}")

asyncio.run(test_extraction())
