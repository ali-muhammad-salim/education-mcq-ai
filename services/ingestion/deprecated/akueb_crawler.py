import requests
import json
import os
import concurrent.futures
from urllib.parse import urlparse
import tempfile
import fitz
import httpx
import asyncio
import base64

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5vl:7b"  # User's installed vision model

async def ask_local_ai_vision(prompt: str, images_base64: list) -> str:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "images": images_base64,
        "stream": False,
        "format": "json"
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")

def extract_first_pages_images_base64(filepath: str, max_pages: int = 3) -> list:
    """Extract the first few pages of the PDF as images and return a list of Base64 strings."""
    images = []
    try:
        doc = fitz.open(filepath)
        for i in range(min(max_pages, len(doc))):
            page = doc[i] 
            pix = page.get_pixmap(dpi=150) # Use reasonable DPI to prevent huge payloads
            img_bytes = pix.tobytes("png")
            images.append(base64.b64encode(img_bytes).decode('utf-8'))
        doc.close()
        return images
    except Exception as e:
        print(f"Error reading PDF {filepath}: {e}")
        return []

async def analyze_document_with_ai(title: str, file_url: str) -> dict:
    """
    Downloads the PDF, extracts the first few pages as images, and asks the Vision LLM to classify it.
    """
    safe_title = title.encode('ascii', 'replace').decode('ascii')
    print(f"\n[AI Vision Analysis] Downloading '{safe_title}' for inspection...")
    
    images_b64 = []
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(file_url, stream=True, timeout=15, headers=headers)
        r.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            # Download a small chunk (e.g., 2MB max) just enough for first page
            downloaded = 0
            for chunk in r.iter_content(chunk_size=8192):
                tmp.write(chunk)
                downloaded += len(chunk)
                if downloaded > 2 * 1024 * 1024:
                    break
            tmp_path = tmp.name
            
        images_b64 = extract_first_pages_images_base64(tmp_path, max_pages=3)
        os.remove(tmp_path)
    except Exception as e:
        print(f"Failed to fetch {safe_title} for AI Vision inspection: {e}")

    if not images_b64:
        # Fallback if PDF fetch/render fails
        return {
            "category": "Other",
            "year": 0,
            "grades": [],
            "subject": "Unknown"
        }

    prompt = f"""
    You are an expert Educational Data Analyst sorting materials for the Aga Khan University Examination Board (AKU-EB).
    Look at the attached images of the document's first three pages and its system Title: "{title}".
    CRITICAL: The system Title is often WRONG or incomplete (e.g., it may say "SSC-I" but the document covers both 9 and 10). 
    You MUST prioritize the visual information on the first 3 pages of the PDF over the Title.
    
    Determine the following from the visual information (reading the title, year, subject, and class text from the pages):
    1. "category": Choose ONE from ["Syllabus", "Past_Papers", "Model_Papers", "Resource_Guides", "Pacing_Guides", "Concept_Maps", "Other"]
    2. "year": The exact publication or exam year (integer). Look specifically for texts like "Latest revision: January 2025" or similar revision dates on the second or third page. If it covers a span (e.g., 2024-2025), pick the latest year. If totally absent, return 0.
    3. "grades": A list of grades this document applies to based ON THE VISUAL CONTENT. Output exact grades like ["IX", "X"] or ["XI", "XII"]. Do not just trust the system Title.
    4. "subject": The core subject (e.g., "Physics", "Chemistry").

    Return ONLY a valid JSON object matching this schema exactly:
    {{
        "category": "String",
        "year": 2024,
        "grades": ["IX"],
        "subject": "String"
    }}
    """
    
    print(f"Asking AI Vision to classify '{safe_title}'...")
    try:
        ai_response = await ask_local_ai_vision(prompt, images_b64)
        ai_data = json.loads(ai_response)
        print(f"AI Result: {ai_data}")
        return ai_data
    except Exception as e:
        print(f"AI parsing failed for '{safe_title}': {e}")
        # Safe fallback
        return {
            "category": "Other",
            "year": 0,
            "grades": [],
            "subject": "Unknown"
        }

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        return
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, stream=True, timeout=15, headers=headers)
        r.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    except Exception as e:
        print(f"Failed to download {url}: {e}")

async def async_main():
    programs = ['SSC', 'HSSC']
    
    best_materials = {}
    all_materials = []

    for prog in programs:
        print(f"\nFetching API metadata for {prog}...")
        page = 1
        limit = 50 # Smaller limit for testing AI
        
        while True:
            headers = {'User-Agent': 'Mozilla/5.0'}
            try:
                r = requests.get(f"https://akuwebapp-prd-eub7dgbbb2fphae2.westeurope-01.azurewebsites.net/api/v1/learning-materials?page={page}&limit={limit}&program={prog}", headers=headers, timeout=15)
                resp_json = r.json()
            except Exception as e:
                print(f"Error fetching page {page}: {e}")
                break

            if not resp_json.get('success'):
                break
                
            data = resp_json.get('data', {}).get('data', [])
            if not data:
                break
                
            for item in data:
                title = item.get('title', 'Unknown')
                material_attach = item.get('materialAttachment')
                if not material_attach:
                    continue
                
                file_url = material_attach.get('filename')
                if not file_url:
                    continue
                    
                # ----------------------------------------------------
                # AI Classification (replaces python regex logic)
                # ----------------------------------------------------
                ai_classification = await analyze_document_with_ai(title, file_url)
                
                category = ai_classification.get('category', 'Other')
                year = ai_classification.get('year', 0)
                subject = ai_classification.get('subject', 'Unknown').replace('/', '-')
                
                # We can store in multiple grade folders if the AI says it covers multiple!
                grades = ai_classification.get('grades', [prog])
                if not grades:
                    grades = [prog]
                
                ext = os.path.splitext(urlparse(file_url).path)[1]
                if not ext:
                    ext = '.pdf'
                    
                safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                
                for grade in grades:
                    dir_path = os.path.join("data", "downloads_ai_sorted", category, grade, subject)
                    os.makedirs(dir_path, exist_ok=True)
                    
                    file_path = os.path.join(dir_path, f"{safe_title}{ext}")
                    task_tuple = (file_url, file_path)
                    
                    if category in ["Syllabus", "Pacing_Guides", "Resource_Guides", "Model_Papers", "Concept_Maps"]:
                        key = (category, grade, subject)
                        if key not in best_materials or year > best_materials[key][0]:
                            best_materials[key] = (year, task_tuple)
                    else:
                        all_materials.append(task_tuple)
                
            meta = resp_json.get('data', {}).get('meta', {})
            if not meta.get('hasNext'):
                break
            page += 1

    download_tasks = list(set(all_materials + [val[1] for val in best_materials.values()]))
    print(f"\nTotal files to download after AI classification & deduplication: {len(download_tasks)}")
    
    print("Starting final downloads...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(download_file, url, path) for url, path in download_tasks]
        count = 0
        for future in concurrent.futures.as_completed(futures):
            count += 1
            if count % 10 == 0:
                print(f"Downloaded {count}/{len(download_tasks)} files...")
    
    print("All downloads completed.")

if __name__ == '__main__':
    asyncio.run(async_main())
