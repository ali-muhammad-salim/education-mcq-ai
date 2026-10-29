"""
Exact Curriculum Parser for New Physics Syllabi in data/intake.
"""

import os
import re
import json
import pymupdf

PDF_PATH = r"data/intake/physics_9/syllabus/physics-ssc-syllabus-final.pdf"
if not os.path.exists(PDF_PATH):
    PDF_PATH = r"data/intake/physics_9/syllabus/physics-ssc-i-syllabus-2025.pdf"


def parse_syllabus(pdf_path):
    print("=" * 70)
    print(f"PARSING SYLLABUS: {pdf_path}")
    print("=" * 70)
    doc = pymupdf.open(pdf_path)

    # Let's find pages for Part I (Grade IX) and Part II (Grade X)
    grade9_pages = []
    grade10_pages = []

    for p in range(len(doc)):
        txt = doc[p].get_text("text")
        if "Part I (Grade IX)" in txt or "Grade IX" in txt:
            if any(k in txt for k in ["Student Learning Outcomes", "Topics and Sub-Topics"]):
                grade9_pages.append(p)
        if "Part II (Grade X)" in txt or "Grade X" in txt:
            if any(k in txt for k in ["Student Learning Outcomes", "Topics and Sub-Topics"]):
                grade10_pages.append(p)

    print(f"Grade IX Table Pages: {min(grade9_pages) if grade9_pages else 'N/A'} to {max(grade9_pages) if grade9_pages else 'N/A'}")
    print(f"Grade X Table Pages:  {min(grade10_pages) if grade10_pages else 'N/A'} to {max(grade10_pages) if grade10_pages else 'N/A'}")

    def extract_grade_units(start_p, end_p, min_u, max_u):
        units = []
        current_unit = None
        current_subtopic = None

        for p in range(start_p, end_p + 1):
            page = doc[p]
            tabs = page.find_tables()
            for t in tabs.tables:
                rows = t.extract()
                for r in rows:
                    if not r or len(r) < 2:
                        continue
                    c0 = (r[0] or "").strip().replace("\n", " ")
                    c1 = (r[1] or "").strip()
                    c2 = (r[2] or "").strip() if len(r) > 2 else ""

                    # Check for Major Unit e.g. "1. Measurement", "2. Kinematics"
                    unit_m = re.match(r"^(\d+)\.\s+([A-Za-z\s,\-\(\)\/\:]+)$", c0)
                    if unit_m:
                        unum = int(unit_m.group(1))
                        uname = unit_m.group(2).strip()
                        if min_u <= unum <= max_u:
                            current_unit = {
                                "unitNumber": unum,
                                "name": uname,
                                "page": p + 1,
                                "subtopics": [],
                            }
                            units.append(current_unit)
                            current_subtopic = None
                            continue

                    # Subtopic e.g. "1.1 Physical Quantities"
                    sub_m = re.match(r"^(\d+\.\d+)\s+(.+)$", c0)
                    if sub_m:
                        snum = sub_m.group(1)
                        sname = sub_m.group(2).strip()
                        current_subtopic = {
                            "subNumber": snum,
                            "name": sname,
                            "slos": [],
                        }
                        if current_unit:
                            current_unit["subtopics"].append(current_subtopic)

                    # SLOs
                    slo_codes = re.findall(r"(\d+\.\d+\.\d+)", c1)
                    if not slo_codes:
                        slo_codes = re.findall(r"(\d+\.\d+\.\d+)", f"{c0} {c2}")

                    if slo_codes:
                        raw_descs = [d.strip() for d in re.split(r";|\n", c2) if d.strip()]
                        c3_val = (r[3] or "") if len(r) > 3 else ""
                        c5_val = (r[5] or "") if len(r) > 5 else ""
                        c7_val = (r[7] or "") if len(r) > 7 else ""

                        for i, code in enumerate(slo_codes):
                            desc = raw_descs[i] if i < len(raw_descs) else (raw_descs[0] if raw_descs else "")
                            desc = desc.replace(code, "").strip().lstrip(".").strip()
                            if not desc.endswith(";") and not desc.endswith("."):
                                desc += ";"

                            # Cognitive level
                            cog = "U"
                            if "*" in c7_val or "A" in c7_val or "A" in c2:
                                cog = "A"
                            elif "*" in c3_val or "R" in c3_val:
                                cog = "R"

                            slo_item = {
                                "code": code,
                                "description": desc,
                                "cognitiveLevel": cog,
                                "page": p + 1,
                            }
                            if current_subtopic:
                                current_subtopic["slos"].append(slo_item)
                            elif current_unit:
                                if not current_unit["subtopics"]:
                                    current_unit["subtopics"].append({
                                        "subNumber": f"{current_unit['unitNumber']}.1",
                                        "name": "General Principles",
                                        "slos": [],
                                    })
                                current_unit["subtopics"][-1]["slos"].append(slo_item)

        return units

    start9 = min(grade9_pages) if grade9_pages else 9
    end9 = max(grade9_pages) if grade9_pages else 25
    units9 = extract_grade_units(start9, end9, 1, 10)

    start10 = min(grade10_pages) if grade10_pages else 26
    end10 = max(grade10_pages) if grade10_pages else 45
    units10 = extract_grade_units(start10, end10, 11, 20)

    print(f"\nExtracted {len(units9)} Units for Grade IX:")
    total_slos_9 = 0
    for u in units9:
        s_cnt = sum(len(sub["slos"]) for sub in u["subtopics"])
        total_slos_9 += s_cnt
        print(f"  Unit {u['unitNumber']}: {u['name']} ({len(u['subtopics'])} subtopics, {s_cnt} SLOs)")
    print(f"Total Grade IX SLOs: {total_slos_9}")

    print(f"\nExtracted {len(units10)} Units for Grade X:")
    total_slos_10 = 0
    for u in units10:
        s_cnt = sum(len(sub["slos"]) for sub in u["subtopics"])
        total_slos_10 += s_cnt
        print(f"  Unit {u['unitNumber']}: {u['name']} ({len(u['subtopics'])} subtopics, {s_cnt} SLOs)")
    print(f"Total Grade X SLOs: {total_slos_10}")

    doc.close()
    return units9, units10


if __name__ == "__main__":
    parse_syllabus(PDF_PATH)
