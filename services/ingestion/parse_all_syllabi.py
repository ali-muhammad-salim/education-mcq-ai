import os
import fitz
import json
import re

def extract_slos_from_syllabus(pdf_path):
    print(f"Processing: {os.path.basename(pdf_path)}")
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening {pdf_path}: {e}")
        return None
        
    extracted_data = {
        "topics": []
    }
    
    current_topic = None
    
    try:
        num_pages = len(doc)
    except Exception as e:
        print(f"Error getting page count for {pdf_path}: {e}")
        return None
        
    for page_num in range(num_pages):
        page = doc[page_num]
        tables = page.find_tables()
        if not tables:
            continue
            
        for table in tables.tables:
            data = table.extract()
            for row in data:
                # Clean row
                cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else "" for cell in row]
                
                # A standard row has at least 3 columns in the SLO table: Topic, Codes, Text
                if len(cleaned_row) >= 3:
                    col0 = cleaned_row[0]
                    col1 = cleaned_row[1]
                    col2 = cleaned_row[2]
                    
                    # Detect Major Topic (e.g., "1. Biological Molecules")
                    if col0 and not col1 and not col2 and re.match(r'^\d+\.\s+[A-Za-z]', col0):
                        current_topic = {
                            "topic_id": col0.split('.')[0],
                            "topic_name": col0.split('.', 1)[1].strip(),
                            "subtopics": []
                        }
                        extracted_data["topics"].append(current_topic)
                        continue
                        
                    # Detect Sub-topic and SLOs (e.g., "1.4 Carbohydrates")
                    if col0 and col1 and col2 and current_topic:
                        # Sometimes col0 has the subtopic
                        subtopic_match = re.match(r'^(\d+\.\d+)\s+(.+)', col0)
                        subtopic_name = col0
                        subtopic_id = ""
                        if subtopic_match:
                            subtopic_id = subtopic_match.group(1)
                            subtopic_name = subtopic_match.group(2).strip()
                            
                        # Extract codes
                        codes = [c.strip() for c in col1.split(' ') if c.strip()]
                        
                        # Extract texts
                        # Split by ';' but avoid splitting if it's the end of string
                        texts = [t.strip() for t in col2.split(';') if t.strip()]
                        
                        slos = []
                        # Try to zip them
                        for i in range(max(len(codes), len(texts))):
                            code = codes[i] if i < len(codes) else ""
                            text = texts[i] if i < len(texts) else ""
                            if code or text:
                                slos.append({
                                    "code": code,
                                    "text": text
                                })
                                
                        if slos:
                            current_topic["subtopics"].append({
                                "subtopic_id": subtopic_id,
                                "subtopic_name": subtopic_name,
                                "slos": slos
                            })
                            
    return extracted_data

def main():
    syllabus_dir = os.path.join("data", "downloads", "Syllabus")
    output_dir = os.path.join("data", "parsed_syllabi")
    os.makedirs(output_dir, exist_ok=True)
    
    total_parsed = 0
    for root, dirs, files in os.walk(syllabus_dir):
        for file in files:
            if file.endswith(".pdf"):
                # We prioritize 2025/2026/2022
                pdf_path = os.path.join(root, file)
                
                # Check if it has syllabus in name
                if "syllabus" not in file.lower():
                    continue
                    
                data = extract_slos_from_syllabus(pdf_path)
                if data and data["topics"]:
                    out_path = os.path.join(output_dir, file.replace(".pdf", ".json"))
                    with open(out_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    total_parsed += 1
                    
    print(f"Successfully parsed {total_parsed} syllabi.")

if __name__ == "__main__":
    main()
