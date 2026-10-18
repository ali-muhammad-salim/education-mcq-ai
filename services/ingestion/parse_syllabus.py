import fitz  # PyMuPDF
import sys
import json
import os

def parse_syllabus(pdf_path, output_json):
    print(f"Parsing {pdf_path}...")
    doc = fitz.open(pdf_path)
    
    all_tables = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # find_tables is a new feature in PyMuPDF
        tables = page.find_tables()
        if not tables:
            continue
            
        for table in tables.tables:
            # extract table as list of lists (rows and columns)
            data = table.extract()
            # Clean up newlines in cells
            cleaned_data = []
            for row in data:
                cleaned_row = []
                for cell in row:
                    if cell:
                        cleaned_row.append(cell.replace('\n', ' ').strip())
                    else:
                        cleaned_row.append("")
                cleaned_data.append(cleaned_row)
                
            all_tables.append({
                "page": page_num + 1,
                "data": cleaned_data
            })
            
    doc.close()
    
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(all_tables, f, indent=2, ensure_ascii=False)
        
    print(f"Extracted {len(all_tables)} tables to {output_json}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_syllabus.py <pdf_file>")
        sys.exit(1)
        
    pdf_file = sys.argv[1]
    base = os.path.basename(pdf_file)
    output_file = base.replace('.pdf', '_tables.json')
    parse_syllabus(pdf_file, output_file)
