import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

for page_num in [30, 38, 42, 43]:
    p = doc[page_num - 1]
    print(f"\n--- PAGE {page_num} TABLES ---")
    tabs = p.find_tables()
    for t_idx, t in enumerate(tabs.tables):
        rows = t.extract()
        print(f"Table {t_idx+1}: {len(rows)} rows")
        for r_idx, r in enumerate(rows[:6]):
            # truncate each cell
            r_trunc = [str(c)[:35].replace('\n', ' ') for c in r]
            print(f"  Row {r_idx}: {r_trunc}")
