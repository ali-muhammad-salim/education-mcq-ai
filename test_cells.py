import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")
page = doc[9] # Page 10
tabs = page.find_tables()
for tab in tabs.tables:
    rows = tab.extract()
    for idx, r in enumerate(rows):
        if idx < 6:
            print(f"Row {idx}:")
            for c_idx, cell in enumerate(r):
                if cell and cell.strip():
                    cell_clean = cell.strip().replace('\n', ' [NL] ')
                    print(f"   Col {c_idx}: {cell_clean[:80]}")
