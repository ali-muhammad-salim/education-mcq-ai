import os
import re
import json
import fitz

DATA_DIR = r"data\physics"
SCANS_DIR = r"public\materials\scans"
DIAGRAMS_DIR = r"public\materials\diagrams"

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SCANS_DIR, exist_ok=True)
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# 1. RENDER HIGH-DPI PAGES FOR ALL MODEL PAPERS
def render_model_paper_pages():
    papers = [
        ("public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf", "ssc1_p1"),
        ("public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf", "ssc1_p2"),
        ("public/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf", "ssc1_p3"),
        ("public/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf", "ssc2_p1"),
        ("public/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf", "ssc2_p2"),
    ]
    
    matrix = fitz.Matrix(2.0, 2.0) # 144 DPI crisp rendering
    for rel_path, prefix in papers:
        if not os.path.exists(rel_path):
            continue
        doc = fitz.open(rel_path)
        print(f"Rendering {len(doc)} pages for {prefix}...")
        for pno in range(len(doc)):
            page = doc[pno]
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            out_img = os.path.join(SCANS_DIR, f"{prefix}_page_{pno+1}.png")
            pix.save(out_img)
        doc.close()
    print("All paper pages rendered to PNG!")

# 2. EXTRACT PRECISE SYLLABUS TABLES
def extract_high_fidelity_syllabus():
    syl_path = r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf"
    doc = fitz.open(syl_path)
    
    def parse_range(start_idx, end_idx, target_min, target_max):
        units = []
        current_unit = None
        current_sub = None
        
        for p in range(start_idx, end_idx + 1):
            page = doc[p]
            tabs = page.find_tables()
            for t in tabs.tables:
                rows = t.extract()
                for r in rows:
                    if not r or len(r) < 3:
                        continue
                    
                    c0 = (r[0] or "").strip()
                    c1 = (r[1] or "").strip()
                    c2 = (r[2] or "").strip()
                    c_rest = " ".join([str(x) for x in r[3:] if x])
                    
                    # Normalize text
                    c0_clean = " ".join(c0.replace('\n', ' ').split())
                    c1_clean = " ".join(c1.replace('\n', ' ').split())
                    c2_clean = " ".join(c2.replace('\n', ' ').split())
                    
                    # 1. Check for Major Unit e.g. "1. Measurement" or "10. Nature of Science"
                    m_unit = re.match(r'^(\d+)\.\s+([A-Za-z\s,\-\(\)\/\:]+)$', c0_clean)
                    if m_unit:
                        unum = int(m_unit.group(1))
                        uname = m_unit.group(2).strip()
                        if target_min <= unum <= target_max:
                            current_unit = {
                                "unitNumber": unum,
                                "name": uname,
                                "page": p + 1,
                                "subtopics": []
                            }
                            units.append(current_unit)
                            current_sub = None
                            continue
                            
                    # 2. Check for Subtopic e.g. "1.1 Physical Quantities" or "11.2 Wave Motion"
                    m_sub = re.match(r'^(\d+\.\d+)\s+([A-Za-z\s,\-\(\)\/\:]+)$', c0_clean)
                    if m_sub:
                        snum = m_sub.group(1)
                        sname = m_sub.group(2).strip()
                        current_sub = {
                            "subNumber": snum,
                            "name": sname,
                            "slos": []
                        }
                        if current_unit:
                            current_unit["subtopics"].append(current_sub)
                        continue
                    elif c0_clean and not c1_clean and not c2_clean:
                        # Sometimes subtopic has extra text or instruments list
                        if current_unit and not any(k in c0_clean.lower() for k in ['student learning', 'cognitive', 'topics and', 'part i', 'part ii', 'preface']):
                            current_sub = {
                                "subNumber": "",
                                "name": c0_clean,
                                "slos": []
                            }
                            current_unit["subtopics"].append(current_sub)
                            continue

                    # 3. Check for SLO codes in c0 or c1
                    row_full = f"{c0_clean} {c1_clean} {c2_clean}"
                    slo_codes = re.findall(r'(\d+\.\d+\.\d+)', row_full)
                    if slo_codes:
                        desc = c2_clean if c2_clean else c1_clean
                        for sc in slo_codes:
                            desc = desc.replace(sc, '')
                        desc = desc.strip()
                        
                        # Determine R, U, A
                        # Col 3 is R, Col 5 is U, Col 7 is A
                        level_r = False
                        level_u = False
                        level_a = False
                        
                        # Inspect asterisks in r[3:]
                        for col_idx, cell in enumerate(r[3:], start=3):
                            val = str(cell or '').strip()
                            if '*' in val:
                                if col_idx in [3, 4]:
                                    level_r = True
                                elif col_idx in [5, 6]:
                                    level_u = True
                                else:
                                    level_a = True
                            elif 'A' in val.upper():
                                level_a = True
                            elif 'R' in val.upper():
                                level_r = True
                            elif 'U' in val.upper():
                                level_u = True
                                
                        if not level_r and not level_u and not level_a:
                            level_u = True
                            
                        cog = "A" if level_a else ("R" if level_r else "U")
                        
                        slo_item = {
                            "code": slo_codes[0],
                            "allCodes": slo_codes,
                            "description": desc,
                            "cognitiveLevel": cog,
                            "isR": level_r,
                            "isU": level_u,
                            "isA": level_a,
                            "isPractical": '*' in c0_clean or 'practical' in desc.lower(),
                            "page": p + 1
                        }
                        
                        if current_sub:
                            current_sub["slos"].append(slo_item)
                        elif current_unit:
                            if not current_unit["subtopics"]:
                                current_sub = {
                                    "subNumber": f"{current_unit['unitNumber']}.1",
                                    "name": "General Physical Principles",
                                    "slos": []
                                }
                                current_unit["subtopics"].append(current_sub)
                            current_unit["subtopics"][-1]["slos"].append(slo_item)
                            
        return units

    print("Extracting Grade IX Syllabus Tables (Units 1-10)...")
    ssc1_units = parse_range(9, 25, 1, 10)
    print(f"Grade IX Units found: {len(ssc1_units)}")
    for u in ssc1_units:
        count_slos = sum(len(s["slos"]) for s in u["subtopics"])
        print(f"  Unit {u['unitNumber']}: {u['name']} ({len(u['subtopics'])} subtopics, {count_slos} SLOs)")
        
    print("\nExtracting Grade X Syllabus Tables (Units 11-20)...")
    ssc2_units = parse_range(26, 45, 11, 20)
    print(f"Grade X Units found: {len(ssc2_units)}")
    for u in ssc2_units:
        count_slos = sum(len(s["slos"]) for s in u["subtopics"])
        print(f"  Unit {u['unitNumber']}: {u['name']} ({len(u['subtopics'])} subtopics, {count_slos} SLOs)")

    # Save to JSON
    with open(os.path.join(DATA_DIR, "ssc1_complete_syllabus_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1_units, f, indent=2)
    with open(os.path.join(DATA_DIR, "ssc2_complete_syllabus_matrix.json"), "w", encoding="utf-8") as f:
        json.dump(ssc2_units, f, indent=2)
    print("Syllabus tables saved!")

# 3. FIX SYMBOLS & CROP DIAGRAMS FOR MODEL PAPERS
def fix_symbols(text):
    if not text:
        return ""
    # Superscripts and numbers
    text = re.sub(r'10\?9', '10⁻⁹', text)
    text = re.sub(r'10\?2', '10⁻²', text)
    text = re.sub(r'10\?11', '10⁻¹¹', text)
    text = re.sub(r'103', '10³', text)
    text = re.sub(r'1024', '10²⁴', text)
    text = re.sub(r'1022', '10²²', text)
    text = re.sub(r'108', '10⁸', text)
    text = re.sub(r'102', '10²', text)
    text = re.sub(r'cm3', 'cm³', text)
    text = re.sub(r'm/s2', 'm/s²', text)
    text = re.sub(r'Nm2/kg2', 'N·m²/kg²', text)
    text = re.sub(r'(\d+)\s*\?\s*10', r'\1 × 10', text)
    text = re.sub(r'\?C', '°C', text)
    text = re.sub(r'(\d+)\s*\?F', r'\1 μF', text)
    text = re.sub(r'\?F', 'μF', text)
    text = text.replace('', ' ')
    return text

def refine_model_papers():
    # Load and clean SSC1 MCQs
    ssc1_in = os.path.join(DATA_DIR, "ssc1_model_mcqs.json")
    with open(ssc1_in, "r", encoding="utf-8") as f:
        ssc1_mcqs = json.load(f)
        
    for q in ssc1_mcqs:
        q["stem"] = fix_symbols(q["stem"])
        for k, v in q.get("choices", {}).items():
            q["choices"][k] = fix_symbols(v)
            
        # Assign scan page
        # Questions 1-6 are page 2, 7-9 page 3, 10-13 page 4, 14-17 page 5, 18-21 page 6, 22-25 page 7, 26-29 page 8, 30-33 page 9, 34-37 page 10, 38-40 page 11
        qnum = q["questionNumber"]
        if qnum <= 6:
            p = 2
        elif qnum <= 9:
            p = 3
        elif qnum <= 13:
            p = 4
        elif qnum <= 17:
            p = 5
        elif qnum <= 21:
            p = 6
        elif qnum <= 25:
            p = 7
        elif qnum <= 29:
            p = 8
        elif qnum <= 33:
            p = 9
        elif qnum <= 37:
            p = 10
        else:
            p = 11
        q["pageNumber"] = p
        q["pageScanUrl"] = f"/materials/scans/ssc1_p1_page_{p}.png"
        
    with open(ssc1_in, "w", encoding="utf-8") as f:
        json.dump(ssc1_mcqs, f, indent=2)
        
    # Load and clean SSC2 MCQs
    ssc2_in = os.path.join(DATA_DIR, "ssc2_model_mcqs.json")
    with open(ssc2_in, "r", encoding="utf-8") as f:
        ssc2_mcqs = json.load(f)
        
    for q in ssc2_mcqs:
        q["stem"] = fix_symbols(q["stem"])
        for k, v in q.get("choices", {}).items():
            q["choices"][k] = fix_symbols(v)
            
        qnum = q["questionNumber"]
        if qnum <= 6:
            p = 2
        elif qnum <= 9:
            p = 3
        elif qnum <= 12:
            p = 4
        elif qnum <= 16:
            p = 5
        elif qnum <= 20:
            p = 6
        elif qnum <= 24:
            p = 7
        elif qnum <= 28:
            p = 8
        elif qnum <= 32:
            p = 9
        elif qnum <= 36:
            p = 10
        else:
            p = 11
        q["pageNumber"] = p
        q["pageScanUrl"] = f"/materials/scans/ssc2_p1_page_{p}.png"
        
    with open(ssc2_in, "w", encoding="utf-8") as f:
        json.dump(ssc2_mcqs, f, indent=2)

    # Clean CRQs
    for crq_file, prefix in [("ssc1_model_crqs.json", "ssc1_p2"), ("ssc2_model_crqs.json", "ssc2_p2")]:
        cp = os.path.join(DATA_DIR, crq_file)
        with open(cp, "r", encoding="utf-8") as f:
            crqs = json.load(f)
        for q in crqs:
            q["questionText"] = fix_symbols(q["questionText"])
            p = min(8, q["questionNumber"] + 1)
            q["pageScanUrl"] = f"/materials/scans/{prefix}_page_{p}.png"
        with open(cp, "w", encoding="utf-8") as f:
            json.dump(crqs, f, indent=2)

    print("Model papers refined with mathematical symbols and page scan links!")

if __name__ == "__main__":
    render_model_paper_pages()
    extract_high_fidelity_syllabus()
    refine_model_papers()
