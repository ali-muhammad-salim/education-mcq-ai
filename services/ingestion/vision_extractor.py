import fitz
import json
import os
import base64
import requests
import io

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5vl:7b"

def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_equations_and_tables(pdf_path):
    print(f"Extracting visual elements from {pdf_path}...")
    doc = fitz.open(pdf_path)
    
    extracted_elements = []
    
    for i in range(min(5, len(doc))): # Process first 5 pages for demonstration
        page = doc[i]
        
        # Render the page to a high-res image
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        temp_img_path = f"temp_page_{i}.png"
        pix.save(temp_img_path)
        
        base64_image = encode_image_to_base64(temp_img_path)
        
        prompt = """
        Carefully scan this page. 
        If you see any tables, extract them and format them as Markdown tables.
        If you see any physics, chemistry, or math equations, extract them and format them as LaTeX enclosed in $$.
        If there are no tables or equations, just return "NO_VISUAL_DATA".
        Do NOT extract normal text paragraphs, only tables and equations.
        """
        
        payload = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "images": [base64_image],
            "stream": False
        }
        
        print(f"  Sending Page {i+1} to Vision Model...")
        try:
            response = requests.post(OLLAMA_URL, json=payload, timeout=120)
            if response.status_code == 200:
                result = response.json().get("response", "").strip()
                if result and "NO_VISUAL_DATA" not in result:
                    extracted_elements.append({
                        "page": i + 1,
                        "content": result
                    })
                    print(f"    -> Extracted data from Page {i+1}")
                else:
                    print(f"    -> No visual data found on Page {i+1}")
            else:
                print(f"    -> API Error: {response.status_code}")
        except Exception as e:
            print(f"    -> Error communicating with Ollama: {e}")
            
        # Clean up temp image
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
            
    doc.close()
    return extracted_elements

if __name__ == "__main__":
    pdf_directory = r"c:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\downloads_ai_sorted"
    
    # Process just one PDF for demonstration
    target_pdf = None
    for root, dirs, files in os.walk(pdf_directory):
        for f in files:
            if f.endswith('.pdf'):
                target_pdf = os.path.join(root, f)
                break
        if target_pdf:
            break
            
    if target_pdf:
        results = extract_equations_and_tables(target_pdf)
        for res in results:
            print(f"\n--- Page {res['page']} Extracted ---")
            print(res['content'])
            print("--------------------------------")
    else:
        print("No PDFs found to extract.")
