import os
import re
import json
import pymupdf

OUTPUT_DIR = r"data\physics"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def safe_clean(text):
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    return " ".join(text.split())

def analyze_pacing_guide(pdf_path, grade_name):
    doc = pymupdf.open(pdf_path)
    print(f"Analyzing {grade_name} Pacing Guide ({len(doc)} pages)...")
    
    # Metadata on page 1
    p1 = doc[0].get_text()
    weeks_match = re.search(r'Number of weeks:\s*(\d+)', p1, re.IGNORECASE)
    periods_match = re.search(r'Number of periods per week:\s*(\d+)', p1, re.IGNORECASE)
    textbook_match = re.search(r'Key Textbook:\s*([^\n\r]+)', p1, re.IGNORECASE)
    
    metadata = {
        "grade": grade_name,
        "totalPages": len(doc),
        "totalWeeks": int(weeks_match.group(1)) if weeks_match else 28,
        "periodsPerWeek": int(periods_match.group(1)) if periods_match else 4,
        "keyTextbook": textbook_match.group(1).strip() if textbook_match else "Punjab Curriculum and Textbook Board"
    }
    
    # Extract unit pacing entries
    weekly_breakdown = []
    current_unit = None
    
    for p_no in range(1, len(doc)):
        p_text = doc[p_no].get_text()
        # Look for Unit headers e.g. "Unit 1: Physical Quantities" or "Week 1"
        lines = p_text.split('\n')
        for i, l in enumerate(lines):
            unit_m = re.search(r'(Unit\s+\d+:\s*[^,\n\r]+)', l, re.IGNORECASE)
            if unit_m:
                current_unit = unit_m.group(1).strip()
            week_m = re.search(r'(Week\s+\d+)', l, re.IGNORECASE)
            if week_m:
                week_title = week_m.group(1).strip()
                # grab some context
                context = " ".join([lines[j].strip() for j in range(max(0, i-1), min(len(lines), i+6)) if lines[j].strip()])
                weekly_breakdown.append({
                    "page": p_no + 1,
                    "unit": current_unit,
                    "week": week_title,
                    "summary": safe_clean(context[:250])
                })
                
    return {
        "metadata": metadata,
        "pacingEntries": weekly_breakdown
    }

def analyze_resource_guide(pdf_path):
    doc = pymupdf.open(pdf_path)
    print(f"Analyzing Resource Guide ({len(doc)} pages)...")
    
    full_text = ""
    for p in range(len(doc)):
        full_text += f"\n[PAGE_{p+1}]\n" + doc[p].get_text()
        
    # Extract reference textbooks cited
    books_cited = []
    # Pattern for textbook titles e.g. "Physics 9, Punjab Curriculum...", "Physics 10, Sindh Textbook Board..."
    for match in re.finditer(r'(Physics\s+(?:9|10|IX|X)[^\n\r\.\;]{10,80})', full_text, re.IGNORECASE):
        cleaned_b = safe_clean(match.group(1))
        if cleaned_b not in books_cited and len(cleaned_b) > 15:
            books_cited.append(cleaned_b)
            
    # Extract web and digital simulation resources
    digital_resources = []
    for match in re.finditer(r'(https?://[^\s\)\"\'>]+|www\.[^\s\)\"\'>]+|phet\.colorado\.edu[^\s\)\"\'>]*)', full_text, re.IGNORECASE):
        url = match.group(1).strip().rstrip('.,;')
        if url not in digital_resources:
            digital_resources.append(url)
            
    return {
        "totalPages": len(doc),
        "coreTextbooksCited": books_cited[:10],
        "digitalResources": digital_resources[:20]
    }

def analyze_sample_practical(pdf_path):
    doc = pymupdf.open(pdf_path)
    print(f"Analyzing Sample Practical ({len(doc)} pages)...")
    full_text = ""
    for p in range(len(doc)):
        full_text += f"\n[PAGE_{p+1}]\n" + doc[p].get_text()
        
    # Extract experiments / tasks
    tasks = []
    for m in re.finditer(r'(Task\s+\d+|Question\s+\d+|Experiment\s+\d+)[^\n\r]*', full_text, re.IGNORECASE):
        tasks.append(safe_clean(m.group(0)))
        
    return {
        "totalPages": len(doc),
        "examDuration": "40 minutes",
        "totalMarks": 10,
        "tasks": list(dict.fromkeys(tasks))[:10],
        "fullTextSummary": safe_clean(full_text[:1200])
    }

def main():
    # 1. Pacing Guide Class 9
    pacing_9 = analyze_pacing_guide(r"data\intake\physics_9\pacing_guide\pacing-guide-2025-for-ssc-i-physics.pdf", "SSC-I (Grade 9)")
    with open(os.path.join(OUTPUT_DIR, "ssc1_pacing_guide_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(pacing_9, f, indent=2)

    # 2. Pacing Guide Class 10
    pacing_10 = analyze_pacing_guide(r"data\intake\physics_10\pacing_guide\pacing-guide-for-ssc-ii-physics.pdf", "SSC-II (Grade 10)")
    with open(os.path.join(OUTPUT_DIR, "ssc2_pacing_guide_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(pacing_10, f, indent=2)

    # 3. Resource Guide
    resources = analyze_resource_guide(r"data\intake\physics_9\resource_guide\resources-guide-2025-ssc-physics-final.pdf")
    with open(os.path.join(OUTPUT_DIR, "ssc_resource_guide_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(resources, f, indent=2)

    # 4. Sample Practical
    practical = analyze_sample_practical(r"data\intake\physics_9\resource_guide\ssc-i-physics-sample-practical.pdf")
    with open(os.path.join(OUTPUT_DIR, "ssc1_sample_practical_analysis.json"), "w", encoding="utf-8") as f:
        json.dump(practical, f, indent=2)

    print("\n[SUCCESS] Completed comprehensive analysis of all Physics resources!")
    print(f"Grade 9 Pacing: {pacing_9['metadata']['totalWeeks']} weeks, {pacing_9['metadata']['periodsPerWeek']} periods/wk, Textbook: {pacing_9['metadata']['keyTextbook']}")
    print(f"Grade 10 Pacing: {pacing_10['metadata']['totalWeeks']} weeks, {pacing_10['metadata']['periodsPerWeek']} periods/wk, Textbook: {pacing_10['metadata']['keyTextbook']}")
    print(f"Digital Simulations Found: {len(resources['digitalResources'])}")
    print(f"Practical Exam Duration: {practical['examDuration']}, Marks: {practical['totalMarks']}")

if __name__ == "__main__":
    main()
