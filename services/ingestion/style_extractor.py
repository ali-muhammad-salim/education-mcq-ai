import fitz
import json
import collections
import os

def hex_color(color_int):
    # PyMuPDF colors are integers representing sRGB
    # Extract R, G, B components
    if color_int is None or color_int < 0:
        return "#000000"
    b = color_int & 255
    g = (color_int >> 8) & 255
    r = (color_int >> 16) & 255
    return f"#{r:02x}{g:02x}{b:02x}"

def analyze_pdf_styling(pdf_path, max_pages=15):
    """
    Extracts font sizes, styles, and colors from a PDF to generate a Design System JSON.
    """
    doc = fitz.open(pdf_path)
    
    font_stats = collections.defaultdict(int)
    color_stats = collections.defaultdict(int)
    bullet_styles = set()
    
    # Store representative text for each font size
    size_samples = {}
    
    for i in range(min(max_pages, len(doc))):
        page = doc[i]
        blocks = page.get_text("dict")["blocks"]
        
        for b in blocks:
            if b.get("type") == 0:  # Text block
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        text = s.get("text", "").strip()
                        if not text:
                            continue
                            
                        # Extract exact font, size, and color
                        font = s.get("font", "Unknown")
                        size = round(s.get("size", 12.0), 1)
                        color = hex_color(s.get("color"))
                        
                        font_id = f"{font}_{size}pt"
                        font_stats[(size, font)] += len(text)
                        color_stats[color] += len(text)
                        
                        if size not in size_samples:
                            size_samples[size] = text
                        
                        # Detect bullet points
                        if text[0] in ['•', '○', '■', '▪', '-', '–', '—']:
                            bullet_styles.add(text[0])

    doc.close()
    
    # Sort sizes by frequency to find body text
    sorted_by_freq = sorted(font_stats.items(), key=lambda x: x[1], reverse=True)
    body_font_info = sorted_by_freq[0][0] if sorted_by_freq else (12.0, "Arial")
    
    # Sort sizes descending to assign Header hierarchies
    unique_sizes = sorted(list(set(k[0] for k in font_stats.keys())), reverse=True)
    
    headers = {}
    h_level = 1
    for s in unique_sizes:
        if s > body_font_info[0]:  # If larger than body text
            headers[f"H{h_level}"] = {
                "size": f"{s}px",
                "sample": size_samples[s]
            }
            h_level += 1
            if h_level > 6:
                break
                
    # Sort colors by frequency
    sorted_colors = sorted(color_stats.items(), key=lambda x: x[1], reverse=True)
    
    design_system = {
        "typography": {
            "body": {
                "fontFamily": body_font_info[1],
                "fontSize": f"{body_font_info[0]}px"
            },
            "headers": headers
        },
        "colors": {
            "primary_text": sorted_colors[0][0] if len(sorted_colors) > 0 else "#000000",
            "accents": [c[0] for c in sorted_colors[1:5] if c[0] != "#000000" and c[0] != "#ffffff"]
        },
        "layout": {
            "bullet_characters": list(bullet_styles)
        }
    }
    
    return design_system

if __name__ == "__main__":
    # Example: Grab a random syllabus from the unstructured folder if the AI hasn't sorted it yet
    test_pdf = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\downloads\Unknown_Category\Unknown_Grade\Unknown_Subject\Unknown_Title.pdf"
    
    # We will search for any valid PDF to extract styles
    downloads_dir = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\downloads_ai_sorted"
    pdf_to_scan = None
    
    for root, dirs, files in os.walk(downloads_dir):
        for f in files:
            if f.endswith('.pdf'):
                pdf_to_scan = os.path.join(root, f)
                break
        if pdf_to_scan:
            break
            
    if pdf_to_scan:
        print(f"Extracting Design System from: {pdf_to_scan}")
        ds = analyze_pdf_styling(pdf_to_scan)
        
        output_path = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\design_system.json"
        with open(output_path, "w") as f:
            json.dump(ds, f, indent=4)
        print(f"Design System exported to {output_path}")
    else:
        print("No PDFs found to analyze. Please let the crawler finish downloading first.")
