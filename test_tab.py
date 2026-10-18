import fitz
import re

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

for pno in range(9, 46):
    page = doc[pno]
    tabs = page.find_tables()
    for tab in tabs.tables:
        for r in tab.extract():
            c0 = (r[0] or "").strip().replace("\n", " ")
            c1 = (r[1] or "").strip().replace("\n", " ")
            # Print if topic number like "1.", "2.", "10."
            if re.match(r'^\d+\.', c0) or re.match(r'^\d+\.\d+', c0):
                c0_safe = c0.encode('ascii', errors='replace').decode('ascii')
                c1_safe = c1.encode('ascii', errors='replace').decode('ascii')
                print(f"P{pno+1}: '{c0_safe}' -> '{c1_safe[:30]}'")
