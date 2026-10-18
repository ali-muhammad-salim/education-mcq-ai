import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

page = doc[9] # Page 10
tabs = page.find_tables()
for t in tabs.tables:
    for r_idx, r in enumerate(t.extract()):
        clean_r = [(c or '').replace('\n', ' ') for c in r]
        print(f"Row {r_idx}: {clean_r}")
