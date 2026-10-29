import fitz
import re

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-model-paper-ix-paper-i.pdf")
p = doc[1] # Page 2
text = p.get_text("text")
lines = [l.strip() for l in text.split("\n")]
clean_lines = [l for l in lines if l and not any(k in l.lower() for k in ['aku-eb', 'model paper 2023', 'for teaching & learning only', 'page ', 'physics model paper', 'turn over the page'])]

print(f"Total clean lines: {len(clean_lines)}")
for idx, l in enumerate(clean_lines[:20]):
    m = re.match(r'^(\d+)\.?$', l)
    print(f"Line {idx}: {repr(l)} -> Match: {bool(m)}")
