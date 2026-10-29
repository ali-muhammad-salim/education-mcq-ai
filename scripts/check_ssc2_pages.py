import fitz
import re

doc = fitz.open(r"public\materials\ssc\physics\ssc-2\physics-model-paper-x-paper-i.pdf")
print(f"Total pages: {len(doc)}")

for p_idx in range(1, len(doc)):
    p = doc[p_idx]
    text = p.get_text("text")
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    q_matches = [l for l in lines if re.match(r'^\d+\.', l)]
    print(f"Page {p_idx+1}: {q_matches}")
