import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

for page_num in range(14, 21):
    p = doc[page_num - 1]
    tabs = p.find_tables()
    for t in tabs.tables:
        rows = t.extract()
        for r_idx, r in enumerate(rows):
            r_trunc = [str(c)[:35].replace('\n', ' ') for c in r if c]
            if any(k in " ".join(r_trunc) for k in ["Deformation", "5.", "5.1", "5.2", "6.", "6.1"]):
                print(f"Page {page_num} Row {r_idx}: {r_trunc}")
