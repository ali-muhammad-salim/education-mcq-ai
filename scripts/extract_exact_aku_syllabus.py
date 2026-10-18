import os
import re
import json
import fitz

PDF_PATH = r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf"
DATA_DIR = r"data\physics"
os.makedirs(DATA_DIR, exist_ok=True)

def parse_all():
    doc = fitz.open(PDF_PATH)
    
    def parse_class_units(page_start, page_end, min_u, max_u):
        units = []
        current_unit = None
        current_subtopic = None
        
        for p in range(page_start, page_end + 1):
            page = doc[p]
            tabs = page.find_tables()
            for t in tabs.tables:
                rows = t.extract()
                for r in rows:
                    if not r or len(r) < 2:
                        continue
                    
                    c0 = (r[0] or "").strip().replace('\n', ' ')
                    c1 = (r[1] or "").strip()
                    c2 = (r[2] or "").strip() if len(r) > 2 else ""
                    
                    # 1. Check for Major Unit e.g. "1. Measurement", "2. Kinematics"
                    unit_m = re.match(r'^(\d+)\.\s+([A-Za-z\s,\-\(\)\/\:]+)$', c0)
                    if unit_m:
                        unum = int(unit_m.group(1))
                        uname = unit_m.group(2).strip()
                        if min_u <= unum <= max_u:
                            current_unit = {
                                "unitNumber": unum,
                                "name": uname,
                                "page": p + 1,
                                "subtopics": []
                            }
                            units.append(current_unit)
                            current_subtopic = None
                            continue

                    # 2. Check for Subtopic e.g. "1.1 Physical Quantities"
                    sub_m = re.match(r'^(\d+\.\d+)\s+(.+)$', c0)
                    if sub_m:
                        snum = sub_m.group(1)
                        sname = sub_m.group(2).strip()
                        current_subtopic = {
                            "subNumber": snum,
                            "name": sname,
                            "slos": []
                        }
                        if current_unit:
                            current_unit["subtopics"].append(current_subtopic)
                    elif c0 and not c1 and not c2:
                        # Header row or subtopic continuation
                        if current_unit and not any(k in c0.lower() for k in ['student learning', 'cognitive', 'topics and', 'part i', 'part ii', 'preface']):
                            if not current_subtopic or current_subtopic["name"] != c0:
                                current_subtopic = {
                                    "subNumber": "",
                                    "name": c0,
                                    "slos": []
                                }
                                current_unit["subtopics"].append(current_subtopic)
                                
                    # 3. Parse SLOs in this row
                    # In c1 we have codes e.g. "1.1.1\n1.1.2\n1.1.3" or "1.1.1 1.1.2"
                    slo_codes = re.findall(r'(\d+\.\d+\.\d+)', c1)
                    if not slo_codes:
                        # Check in c0 or c2
                        slo_codes = re.findall(r'(\d+\.\d+\.\d+)', f"{c0} {c2}")
                        
                    if slo_codes:
                        # Extract descriptions from c2 (split by semicolon or newline)
                        # Clean c2
                        raw_descs = [d.strip() for d in re.split(r';|\n', c2) if d.strip()]
                        
                        # Inspect column levels: Col 3 (R), Col 5 (U), Col 7 (A)
                        c3_val = (r[3] or "") if len(r) > 3 else ""
                        c5_val = (r[5] or "") if len(r) > 5 else ""
                        c7_val = (r[7] or "") if len(r) > 7 else ""
                        
                        # Build each SLO entry
                        for i, code in enumerate(slo_codes):
                            desc = raw_descs[i] if i < len(raw_descs) else (raw_descs[0] if raw_descs else "Demonstrate understanding according to curriculum outcomes.")
                            # Clean code from desc
                            desc = desc.replace(code, '').strip()
                            if desc.startswith('.'):
                                desc = desc[1:].strip()
                            if not desc.endswith(';') and not desc.endswith('.'):
                                desc += ';'
                                
                            # Determine cognitive level
                            # Check if R, U, A is marked
                            r_col_has = '*' in c3_val or 'R' in c3_val
                            u_col_has = '*' in c5_val or 'U' in c5_val
                            a_col_has = '*' in c7_val or 'A' in c7_val or 'A' in c2
                            
                            # Specific line-by-line asterisk check
                            cog = "U" # default
                            if a_col_has:
                                cog = "A"
                            elif r_col_has and not u_col_has:
                                cog = "R"
                            elif u_col_has and not r_col_has:
                                cog = "U"
                            elif r_col_has and u_col_has:
                                # First might be R, second U
                                cog = "R" if i == 0 else "U"
                                
                            is_practical = '*' in c0 or '*' in code or 'practical' in desc.lower() or 'experiment' in desc.lower()
                            
                            slo_item = {
                                "code": code,
                                "description": desc,
                                "cognitiveLevel": cog,
                                "levelR": cog == "R",
                                "levelU": cog == "U",
                                "levelA": cog == "A",
                                "isPractical": is_practical,
                                "page": p + 1
                            }
                            
                            if current_subtopic:
                                current_subtopic["slos"].append(slo_item)
                            elif current_unit:
                                if not current_unit["subtopics"]:
                                    current_subtopic = {
                                        "subNumber": f"{current_unit['unitNumber']}.1",
                                        "name": "General Physical Principles",
                                        "slos": []
                                    }
                                    current_unit["subtopics"].append(current_subtopic)
                                current_unit["subtopics"][-1]["slos"].append(slo_item)

        return units

    print("Extracting exact Grade IX Syllabus (Units 1-10)...")
    ssc1 = parse_class_units(9, 25, 1, 10)
    print(f"Extracted {len(ssc1)} Units for Grade IX:")
    total_9_slos = 0
    for u in ssc1:
        s_count = sum(len(sub["slos"]) for sub in u["subtopics"])
        total_9_slos += s_count
        print(f"  Unit {u['unitNumber']}. {u['name']} ({len(u['subtopics'])} subtopics, {s_count} SLOs)")
    print(f"Total Grade IX SLOs: {total_9_slos}")

    print("\nExtracting exact Grade X Syllabus (Units 11-20)...")
    ssc2 = parse_class_units(26, 45, 11, 20)
    print(f"Extracted {len(ssc2)} Units for Grade X:")
    total_10_slos = 0
    for u in ssc2:
        s_count = sum(len(sub["slos"]) for sub in u["subtopics"])
        total_10_slos += s_count
        print(f"  Unit {u['unitNumber']}. {u['name']} ({len(u['subtopics'])} subtopics, {s_count} SLOs)")
    print(f"Total Grade X SLOs: {total_10_slos}")

    with open(os.path.join(DATA_DIR, "ssc1_exact_syllabus.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1, f, indent=2)
    with open(os.path.join(DATA_DIR, "ssc2_exact_syllabus.json"), "w", encoding="utf-8") as f:
        json.dump(ssc2, f, indent=2)
    print("Exact syllabus files written!")

if __name__ == "__main__":
    parse_all()
