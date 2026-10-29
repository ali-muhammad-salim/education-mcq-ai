import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")
page = doc[9] # Page 10
tabs = page.find_tables()
for tab in tabs.tables:
    rows = tab.extract()
    for idx, r in enumerate(rows):
        if idx >= 5 and idx <= 8:
            print(f"\n--- Row {idx} ---")
            for c_idx in [0, 1, 2, 3, 5, 7]:
                if c_idx < len(r) and r[c_idx]:
                    val = r[c_idx].strip().replace('\n', ' // ')
                    print(f"Col {c_idx}: {val}")
