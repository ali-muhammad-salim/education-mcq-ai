import fitz
import json
import os
from prisma import Prisma

def get_h1_size(design_system_path):
    with open(design_system_path, 'r') as f:
        ds = json.load(f)
    try:
        # e.g., "25.0px" -> 25.0
        return float(ds['typography']['headers']['H1']['size'].replace('px', ''))
    except KeyError:
        return 20.0  # Fallback

def chunk_pdf_by_layout(pdf_path, h1_size):
    doc = fitz.open(pdf_path)
    
    chunks = []
    current_section_title = "Introduction"
    current_chunk_text = ""
    
    for i in range(len(doc)):
        page = doc[i]
        blocks = page.get_text("dict")["blocks"]
        
        for b in blocks:
            if b.get("type") == 0:  # Text block
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        text = s.get("text", "").strip()
                        if not text:
                            continue
                            
                        size = round(s.get("size", 12.0), 1)
                        
                        # If the text size matches or exceeds H1, start a new chunk
                        if size >= h1_size and len(text) > 3:
                            # Save the old chunk if it has content
                            if current_chunk_text.strip():
                                chunks.append({
                                    "section": current_section_title,
                                    "content": current_chunk_text.strip(),
                                    "pageNumber": i + 1
                                })
                            
                            # Start new chunk
                            current_section_title = text
                            current_chunk_text = ""
                        else:
                            current_chunk_text += text + " "
                            
    # Append the last chunk
    if current_chunk_text.strip():
        chunks.append({
            "section": current_section_title,
            "content": current_chunk_text.strip(),
            "pageNumber": len(doc)
        })
        
    doc.close()
    return chunks

def process_all_pdfs(ds_path, pdf_dir):
    h1_size = get_h1_size(ds_path)
    
    db = Prisma()
    db.connect()  # Synchronous client
    
    # Check if a dummy book exists to tie the contents to
    book = db.book.find_first(where={"title": "AKU-EB Scanned Materials"})
    if not book:
        book = db.book.create(data={
            "title": "AKU-EB Scanned Materials",
            "publisher": "AKU-EB"
        })

    total_chunks = 0
    for root, dirs, files in os.walk(pdf_dir):
        for f in files:
            if f.endswith('.pdf'):
                pdf_path = os.path.join(root, f)
                print(f"Chunking: {f}")
                
                chunks = chunk_pdf_by_layout(pdf_path, h1_size)
                
                for c in chunks:
                    db.bookcontent.create(data={
                        "bookId": book.id,
                        "section": c["section"],
                        "content": c["content"],
                        "pageNumber": c["pageNumber"]
                    })
                    total_chunks += 1
                    
    print(f"Successfully inserted {total_chunks} semantic chunks into the database!")
    db.disconnect()

if __name__ == "__main__":
    design_system_path = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\design_system.json"
    pdf_directory = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\downloads_ai_sorted"
    
    if not os.path.exists(design_system_path):
        print(f"Design system not found at {design_system_path}")
    elif not os.path.exists(pdf_directory):
        print(f"PDF directory not found at {pdf_directory}")
    else:
        process_all_pdfs(design_system_path, pdf_directory)
