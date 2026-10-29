import fitz

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

for page_no in [18, 42]:
    p = doc[page_no - 1]
    print(f"\n--- PAGE {page_no} ---")
    for t in p.find_tables().tables:
        for r_idx, r in enumerate(t.extract()):
            clean_r = [(c or '').replace('\n', ' ') for c in r]
            print(f"Row {r_idx}: {clean_r}")
