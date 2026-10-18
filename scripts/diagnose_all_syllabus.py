import fitz
import re

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

with open(r"scripts\syllabus_diag.txt", "w", encoding="utf-8") as out:
    out.write(f"Total pages: {len(doc)}\n")

    for p_idx in range(9, 46):
        page = doc[p_idx]
        tabs = page.find_tables()
        out.write(f"\n=================== PAGE {p_idx + 1} ({len(tabs.tables)} tables) ===================\n")
        for t_idx, t in enumerate(tabs.tables):
            rows = t.extract()
            for r_idx, r in enumerate(rows):
                clean_r = [re.sub(r'\s+', ' ', (cell or '')).strip() for cell in r]
                while clean_r and not clean_r[-1]:
                    clean_r.pop()
                if any(clean_r):
                    out.write(f"P{p_idx+1} T{t_idx+1} R{r_idx}: {clean_r[:5]}\n")

print("Diagnosis saved to scripts/syllabus_diag.txt with UTF-8 encoding!")
