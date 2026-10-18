import os
import re
import json
import fitz

PDF_PATH = r"public\materials\ssc\physics\ssc-1\physics-ssc-full-syllabus-2025.pdf"
DATA_DIR = r"data\physics"
os.makedirs(DATA_DIR, exist_ok=True)

def clean_text(t):
    if not t:
        return ""
    # Fix common encoding artifacts
    t = t.replace('\uf0b7', '•').replace('\u2022', '•')
    t = t.replace('', "'").replace('', "'").replace('', '"').replace('', '"')
    return " ".join(t.split())

def parse_syllabus():
    doc = fitz.open(PDF_PATH)
    print(f"Total pages in syllabus: {len(doc)}")
    
    # We will parse:
    # Grade IX: Pages 10 to 26 (indices 9 to 25)
    # Grade X: Pages 27 to 46 (indices 26 to 45)
    
    def extract_grade_tables(start_page, end_page, grade_num):
        topics = []
        current_topic = None
        current_subtopic = None
        
        for pno in range(start_page, end_page + 1):
            page = doc[pno]
            # Use TableFinder
            tabs = page.find_tables()
            
            for tab in tabs.tables:
                rows = tab.extract()
                for r in rows:
                    if not r or len(r) < 3:
                        continue
                    
                    # Columns in AKU-EB syllabus table:
                    # Col 0: Topics and Sub-Topics
                    # Col 1: SLO codes (or joint code + text)
                    # Col 2: SLO descriptions (or cognitive level)
                    # Remaining cols: R, U, A cognitive levels
                    
                    col0 = clean_text(r[0])
                    col1 = clean_text(r[1]) if len(r) > 1 else ""
                    col2 = clean_text(r[2]) if len(r) > 2 else ""
                    
                    # Combine all cognitive level indicator columns
                    cog_cols = " ".join([clean_text(c) for c in r[3:]]) if len(r) > 3 else ""
                    
                    # Check for Topic header e.g. "1. Measurement", "2. Kinematics"
                    topic_match = re.match(r'^(\d+)\.\s+([A-Za-z\s,\-\(\)\/]+)$', col0)
                    if topic_match:
                        tnum = int(topic_match.group(1))
                        tname = topic_match.group(2).strip()
                        if (grade_num == 9 and 1 <= tnum <= 9) or (grade_num == 10 and 10 <= tnum <= 19):
                            current_topic = {
                                "topicNumber": tnum,
                                "name": tname,
                                "page": pno + 1,
                                "subtopics": []
                            }
                            topics.append(current_topic)
                            current_subtopic = None
                            continue

                    # Check for Sub-topic header e.g. "1.1 Physical Quantities" or in col0
                    subtopic_match = re.match(r'^(\d+\.\d+)\s+([A-Za-z\s,\-\(\)\/\:]+)$', col0)
                    if subtopic_match:
                        snum = subtopic_match.group(1)
                        sname = subtopic_match.group(2).strip()
                        current_subtopic = {
                            "subtopicNumber": snum,
                            "name": sname,
                            "slos": []
                        }
                        if current_topic:
                            current_topic["subtopics"].append(current_subtopic)
                        continue

                    # If col0 has text but no regex match, could it be a subtopic without number or multi-line?
                    if col0 and not col1 and not col2:
                        if not any(k in col0.lower() for k in ['student learning', 'cognitive', 'topics and', 'part i', 'part ii', 'preface', 'table of']):
                            # Potential subtopic
                            if current_topic:
                                current_subtopic = {
                                    "subtopicNumber": "",
                                    "name": col0,
                                    "slos": []
                                }
                                current_topic["subtopics"].append(current_subtopic)
                                continue

                    # Check for SLO row:
                    # Often col1 has "1.1.1 1.1.2" and col2 has the text, or col0/col1 has "1.1.1 differentiate between..."
                    slo_text_combined = f"{col0} {col1} {col2}"
                    slo_matches = re.findall(r'(\d+\.\d+\.\d+)', slo_text_combined)
                    
                    if slo_matches:
                        # Determine cognitive level from the row
                        # Look for '*' or 'R' or 'U' or 'A' in cog_cols or anywhere in row
                        cog = "U" # default
                        cog_upper = (cog_cols + " " + col2).upper()
                        if 'A' in cog_upper:
                            cog = "A"
                        elif '*' in cog_cols:
                            # Check column index of '*'
                            star_idx = -1
                            for idx, c in enumerate(r[3:], start=3):
                                if '*' in str(c):
                                    star_idx = idx
                                    break
                            if star_idx == 3 or star_idx == 4:
                                cog = "R"
                            elif star_idx == 5 or star_idx == 6:
                                cog = "U"
                            else:
                                cog = "A"
                        elif 'R' in cog_upper:
                            cog = "R"
                        elif 'U' in cog_upper:
                            cog = "U"

                        # Extract text
                        # Remove the codes from description
                        desc = col2 if col2 else col1
                        for sm in slo_matches:
                            desc = desc.replace(sm, '')
                        desc = clean_text(desc)
                        
                        # Practical indicator
                        is_practical = '*' in col0 or '*' in col1 or 'practical' in desc.lower()

                        slo_entry = {
                            "code": slo_matches[0],
                            "allCodes": slo_matches,
                            "description": desc if desc else "Understand and apply core physical concept according to syllabus guidelines.",
                            "cognitiveLevel": cog,
                            "isPractical": is_practical,
                            "rawRow": [clean_text(c) for c in r]
                        }
                        
                        if current_subtopic:
                            current_subtopic["slos"].append(slo_entry)
                        elif current_topic:
                            # Create a default subtopic if missing
                            if not current_topic["subtopics"]:
                                current_subtopic = {
                                    "subtopicNumber": f"{current_topic['topicNumber']}.1",
                                    "name": "General Principles",
                                    "slos": []
                                }
                                current_topic["subtopics"].append(current_subtopic)
                            current_topic["subtopics"][-1]["slos"].append(slo_entry)

        return topics

    print("Parsing Grade IX Syllabus Tables...")
    grade9_topics = extract_grade_tables(9, 25, 9)
    print(f"Grade IX parsed: {len(grade9_topics)} topics.")
    for t in grade9_topics:
        total_s = sum(len(sub["slos"]) for sub in t["subtopics"])
        print(f"  Unit {t['topicNumber']}. {t['name']} -> {len(t['subtopics'])} subtopics, {total_s} SLO rows")

    print("\nParsing Grade X Syllabus Tables...")
    grade10_topics = extract_grade_tables(26, 45, 10)
    print(f"Grade X parsed: {len(grade10_topics)} topics.")
    for t in grade10_topics:
        total_s = sum(len(sub["slos"]) for sub in t["subtopics"])
        print(f"  Unit {t['topicNumber']}. {t['name']} -> {len(t['subtopics'])} subtopics, {total_s} SLO rows")

    # Save to JSON
    with open(os.path.join(DATA_DIR, "ssc1_official_syllabus_tables.json"), "w", encoding="utf-8") as f:
        json.dump(grade9_topics, f, indent=2)
    with open(os.path.join(DATA_DIR, "ssc2_official_syllabus_tables.json"), "w", encoding="utf-8") as f:
        json.dump(grade10_topics, f, indent=2)
    print("Saved official syllabus tables successfully!")

if __name__ == "__main__":
    parse_syllabus()
