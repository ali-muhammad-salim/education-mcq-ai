import os
import re
import json
import pymupdf

PDF_PATH = r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf"

doc = pymupdf.open(PDF_PATH)
print(f"Total pages: {len(doc)}")

# Let's inspect all tables from page 10 (index 9) to page 46 (index 45)
all_parsed_slos = []

for pno in range(9, 46):
    page = doc[pno]
    tabs = page.find_tables()
    for tab in tabs.tables:
        rows = tab.extract()
        for r in rows:
            if not r or len(r) < 3:
                continue
            
            c0 = (r[0] or "").strip()
            c1 = (r[1] or "").strip()
            c2 = (r[2] or "").strip()
            
            codes = re.findall(r'(\d+\.\d+\.\d+)', c1)
            if not codes:
                codes = re.findall(r'(\d+\.\d+\.\d+)', f"{c0} {c2}")
                
            if codes:
                # Let's inspect how c2 can be perfectly mapped to codes
                cog_r = (r[3] or "").strip() if len(r) > 3 else ""
                cog_u = (r[5] or "").strip() if len(r) > 5 else ""
                cog_a = (r[7] or "").strip() if len(r) > 7 else ""
                
                all_parsed_slos.append({
                    "page": pno + 1,
                    "c0": c0,
                    "codes": codes,
                    "raw_c1": c1,
                    "raw_c2": c2,
                    "cog_r": cog_r,
                    "cog_u": cog_u,
                    "cog_a": cog_a
                })

print(f"Total SLO rows found across pages 10-46: {len(all_parsed_slos)}")
total_slo_count = sum(len(x["codes"]) for x in all_parsed_slos)
print(f"Total distinct SLO codes found across pages 10-46: {total_slo_count}")

# Check 1.3 specifically:
for item in all_parsed_slos:
    if "1.3.1" in item["codes"] or "1.3.2" in item["codes"]:
        print("\n--- FOUND 1.3 ---")
        print("Page:", item["page"])
        print("C0:", item["c0"])
        print("Codes:", item["codes"])
        print("Raw C2:\n", item["raw_c2"])
        print("Cog R:", repr(item["cog_r"]))
        print("Cog U:", repr(item["cog_u"]))
        print("Cog A:", repr(item["cog_a"]))
