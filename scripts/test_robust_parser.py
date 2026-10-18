import fitz
import re
import json

doc = fitz.open(r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf")

def parse_syllabus():
    all_units = []
    current_unit = None
    current_subtopic = None
    
    # Unit 1 to 20
    # Pages 10 to 46 (0-indexed: 9 to 45)
    for p_idx in range(9, 46):
        page = doc[p_idx]
        tabs = page.find_tables()
        if not tabs.tables:
            continue
            
        for t in tabs.tables:
            rows = t.extract()
            if not rows or len(rows) < 2:
                continue
                
            # 1. Identify R, U, A column indices dynamically from the header rows
            r_col, u_col, a_col = None, None, None
            for r in rows[:4]:
                for c_idx, cell in enumerate(r):
                    val = (cell or "").strip()
                    if val == 'R':
                        r_col = c_idx
                    elif val == 'U':
                        u_col = c_idx
                    elif 'beyond' in val.lower() or val.startswith('A and'):
                        a_col = c_idx
            
            # Default fallbacks if header format is slightly offset
            if r_col is None:
                # search for column headers
                for r in rows[:4]:
                    for c_idx, cell in enumerate(r):
                        val = (cell or "").strip()
                        if 'cognitive' in val.lower():
                            r_col = c_idx - 1 if c_idx > 0 else 3
                            u_col = r_col + 2
                            a_col = u_col + 2
            
            # 2. Iterate through rows
            row_idx = 0
            while row_idx < len(rows):
                r = rows[row_idx]
                row_idx += 1
                if not r:
                    continue
                
                # Check for unit header
                # A unit header is e.g. "1. Measurement", "16. D.C. Circuits", or "19. Electromagnetic Waves and \n Electronics"
                # Join cells of this row
                row_str = " ".join((c or "").strip() for c in r)
                
                # Check if this row is a legend / footnote e.g. "FA= Formative Assessment"
                if any(k in row_str for k in ['Formative Assessment', 'Student Learning Outcomes of AKU-EB', 'Topics and Sub-Topics', 'Students should be able to:']):
                    # Check if "Students should be able to:" is part of a unit header row
                    pass
                
                # Match Unit: e.g. "1. Measurement", "16. D.C. Circuits", "19. Electromagnetic Waves and"
                unit_match = re.search(r'\b([1-9]|1\d|20)\.\s+([A-Za-z\s,\-\(\)\/\:\.]+)', row_str)
                # But ensure it's not a subtopic like 1.1 or an SLO like 1.1.1
                if unit_match and not re.search(r'\b([1-9]|1\d|20)\.\d+', row_str.split(unit_match.group(0))[0] + unit_match.group(1)):
                    # Check that after unit number there isn't a subtopic immediately
                    unum = int(unit_match.group(1))
                    uname = unit_match.group(2).strip()
                    # Clean uname from "Students should be able to:"
                    uname = re.sub(r'Students should be able to.*', '', uname, flags=re.IGNORECASE).strip()
                    
                    # If uname ends with "and" or similar, check next row
                    if uname.endswith("and") and row_idx < len(rows):
                        next_row_str = " ".join((c or "").strip() for c in rows[row_idx]).strip()
                        if next_row_str and not any(k in next_row_str for k in ['19.', '19.1', 'Students']):
                            uname += " " + next_row_str
                            row_idx += 1
                            
                    # Clean trailing punctuation
                    uname = uname.rstrip('.:,')
                    
                    # Check if we already have this unit
                    if not current_unit or current_unit["unitNumber"] != unum:
                        current_unit = {
                            "unitNumber": unum,
                            "name": uname,
                            "page": p_idx + 1,
                            "grade": "Grade IX (SSC-I)" if unum <= 10 else "Grade X (SSC-II)",
                            "subtopics": []
                        }
                        all_units.append(current_unit)
                        current_subtopic = None
                        print(f"-> Found Unit {unum}: {uname} (Page {p_idx+1})")
                        continue

                # Check for subtopic e.g. "1.1 Physical Quantities", "5.1 Hook's law", "16.1 Series and Parallel..."
                sub_match = re.search(r'\b((?:[1-9]|1\d|20)\.\d+)\s+([A-Za-z\s,\-\(\)\/\:\.\’\']+)', row_str)
                # Look for subtopic heading
                if sub_match:
                    snum = sub_match.group(1)
                    sname = sub_match.group(2).strip()
                    # Clean sname from SLO codes or descriptions if matched
                    sname = re.split(r'\b\d+\.\d+\.\d+\b', sname)[0].strip()
                    sname = sname.replace('', "'").replace('’', "'")
                    # Clean trailing measuring instruments bullet points if on Unit 1.5
                    if '\uf0b7' in sname or 'Measuring cylinder' in sname:
                        sname = sname.split('\uf0b7')[0].split('Measuring cylinder')[0].strip()
                    
                    if not current_subtopic or current_subtopic["subNumber"] != snum:
                        current_subtopic = {
                            "subNumber": snum,
                            "name": sname,
                            "slos": []
                        }
                        if current_unit:
                            current_unit["subtopics"].append(current_subtopic)
                            # print(f"   Subtopic {snum}: {sname}")
                
                # Check for SLO codes in this row e.g. "1.1.1 1.1.2 1.1.3"
                slo_codes = []
                slo_col_idx = None
                for c_idx, cell in enumerate(r):
                    found = re.findall(r'\b((?:[1-9]|1\d|20)\.\d+\.\d+)\b', cell or "")
                    if found:
                        slo_codes = found
                        slo_col_idx = c_idx
                        break
                        
                if slo_codes:
                    # Find description cell: typically slo_col_idx + 1
                    desc_text = ""
                    if slo_col_idx is not None and slo_col_idx + 1 < len(r):
                        desc_text = (r[slo_col_idx + 1] or "").strip()
                    
                    # Split descriptions by semicolon or newline
                    raw_descs = [d.strip() for d in re.split(r';|\n', desc_text) if d.strip()]
                    
                    # Get cognitive marks from r_col, u_col, a_col
                    r_text = (r[r_col] or "").strip() if r_col is not None and r_col < len(r) else ""
                    u_text = (r[u_col] or "").strip() if u_col is not None and u_col < len(r) else ""
                    a_text = (r[a_col] or "").strip() if a_col is not None and a_col < len(r) else ""
                    
                    # Also check adjacent columns if columns shifted
                    for c_i in range(len(r)):
                        if c_i not in [slo_col_idx, slo_col_idx + 1 if slo_col_idx is not None else -1]:
                            cell_val = (r[c_i] or "").strip()
                            if r_col and c_i in [r_col-1, r_col+1] and '*' in cell_val and not r_text:
                                r_text = cell_val
                            if u_col and c_i in [u_col-1, u_col+1] and '*' in cell_val and not u_text:
                                u_text = cell_val
                            if a_col and c_i in [a_col-1, a_col+1] and any(x in cell_val for x in ['*', 'A', 'An', 'E', 'C', 'FA']) and not a_text:
                                a_text = cell_val

                    # Tokenize marks:
                    r_tokens = r_text.split()
                    u_tokens = u_text.split()
                    a_tokens = a_text.split()
                    
                    # Assign cognitive level per code
                    # If total tokens match slo_codes length:
                    # Or sequential consumption:
                    r_idx_token = 0
                    u_idx_token = 0
                    a_idx_token = 0
                    
                    # Let's count how many R, U, A there are
                    r_count = len(r_tokens)
                    u_count = len(u_tokens)
                    a_count = len(a_tokens)
                    
                    for i, code in enumerate(slo_codes):
                        desc = raw_descs[i] if i < len(raw_descs) else (raw_descs[0] if raw_descs else "Demonstrate understanding according to curriculum outcomes.")
                        desc = desc.replace(code, '').strip().lstrip('.').strip()
                        if not desc.endswith(';') and not desc.endswith('.'):
                            desc += ';'
                            
                        # Determine cognitive level
                        cog = "U"
                        cog_detailed = "U"
                        if i < r_count:
                            cog = "R"
                            cog_detailed = "R"
                        elif i < r_count + u_count:
                            cog = "U"
                            cog_detailed = "U"
                        else:
                            cog = "A"
                            a_sub_idx = i - (r_count + u_count)
                            if a_sub_idx < len(a_tokens):
                                cog_detailed = a_tokens[a_sub_idx]
                            else:
                                cog_detailed = "A"
                                
                        is_practical = '*' in row_str[:20] or 'practical' in desc.lower() or 'experiment' in desc.lower()
                        
                        slo_entry = {
                            "code": code,
                            "description": desc,
                            "cognitiveLevel": cog,
                            "cognitiveDetailed": cog_detailed,
                            "levelR": cog == "R",
                            "levelU": cog == "U",
                            "levelA": cog == "A",
                            "isPractical": is_practical,
                            "page": p_idx + 1
                        }
                        
                        if current_subtopic:
                            current_subtopic["slos"].append(slo_entry)
                        elif current_unit:
                            # If no subtopic yet, create one
                            s_prefix = ".".join(code.split(".")[:2])
                            current_subtopic = {
                                "subNumber": s_prefix,
                                "name": "General Physical Principles",
                                "slos": [slo_entry]
                            }
                            current_unit["subtopics"].append(current_subtopic)
                            
    return all_units

units = parse_syllabus()
print(f"\nTotal Units extracted: {len(units)}")
for u in units:
    s_count = sum(len(sub["slos"]) for sub in u["subtopics"])
    print(f"Unit {u['unitNumber']}: {u['name']} -> {len(u['subtopics'])} subtopics, {s_count} SLOs")
