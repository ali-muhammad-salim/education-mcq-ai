import requests
import json
import os
import concurrent.futures
from urllib.parse import urlparse

BASE_URL = 'https://akuwebapp-prd-eub7dgbbb2fphae2.westeurope-01.azurewebsites.net/api/v1/learning-materials?page=1&limit=2000&program='

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        return
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        r = requests.get(url, stream=True, timeout=15, headers=headers)
        r.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    except Exception as e:
        print(f"Failed to download {url}: {e}")

import tempfile
import fitz
import re

def extract_year_from_pdf(filepath):
    try:
        doc = fitz.open(filepath)
        # Try digital text extraction first (fastest)
        for i in range(min(3, len(doc))):
            text = doc[i].get_text()
            match = re.search(r'\b(20[0-2]\d)\b', text)
            if match:
                doc.close()
                return int(match.group(1))
                
        # If no year found in digital text, fallback to OCR on the first 3 pages
        from paddleocr import PaddleOCR
        ocr = PaddleOCR(use_angle_cls=False, lang='en', show_log=False)
        
        for i in range(min(3, len(doc))):
            page = doc[i]
            pix = page.get_pixmap()
            img_path = f"{filepath}_page_{i}.png"
            pix.save(img_path)
            
            result = ocr.ocr(img_path, cls=False)
            os.remove(img_path)
            
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]
                    match = re.search(r'\b(20[0-2]\d)\b', text)
                    if match:
                        doc.close()
                        return int(match.group(1))
                        
        doc.close()
    except Exception as e:
        print(f"Error inspecting PDF: {e}")
    return 0

def main():
    import re
    programs = ['SSC', 'HSSC']
    
    best_materials = {}
    all_materials = []

    def get_year(title, file_url):
        match = re.search(r'\b(20\d{2})\b', title)
        if match:
            return int(match.group(1))
            
        safe_title_print = title.encode('ascii', 'replace').decode('ascii')
        print(f"Year not found in title for '{safe_title_print}', inspecting PDF...")
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            r = requests.get(file_url, stream=True, timeout=15, headers=headers)
            r.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                for chunk in r.iter_content(chunk_size=8192):
                    tmp.write(chunk)
                tmp_path = tmp.name
                
            found_year = extract_year_from_pdf(tmp_path)
            os.remove(tmp_path)
            
            if found_year:
                print(f"Found year {found_year} inside PDF for '{safe_title_print}'")
                return found_year
        except Exception as e:
            print(f"Failed to inspect {safe_title_print}: {e}")
            
        # Fallback if entirely absent
        return 0

    for prog in programs:
        print(f"Fetching metadata for {prog}...")
        page = 1
        limit = 100
        
        while True:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
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
                subject = item.get('subject', 'Unknown').replace('/', '-')
                grade = item.get('grade', 'Unknown').replace('/', '-')
                
                # Determine category based on title
                category = "Other"
                title_lower = title.lower()
                
                if "syllabus" in title_lower:
                    category = "Syllabus"
                elif "pacing guide" in title_lower:
                    category = "Pacing_Guides"
                elif "resource guide" in title_lower:
                    category = "Resource_Guides"
                elif "model paper" in title_lower:
                    category = "Model_Papers"
                elif "past paper" in title_lower or "rse" in title_lower or "exam" in title_lower:
                    category = "Past_Papers"
                elif "concept map" in title_lower:
                    category = "Concept_Maps"
                    
                material_attach = item.get('materialAttachment')
                if not material_attach:
                    continue
                
                file_url = material_attach.get('filename')
                if not file_url:
                    continue
                    
                ext = os.path.splitext(urlparse(file_url).path)[1]
                if not ext:
                    ext = '.pdf'
                    
                safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                
                dir_path = os.path.join("data", "downloads", category, prog, subject)
                os.makedirs(dir_path, exist_ok=True)
                
                file_path = os.path.join(dir_path, f"{safe_title}{ext}")
                task_tuple = (file_url, file_path)
                
                year = get_year(title, file_url)
                
                # Keep only the latest year for foundational syllabus materials
                if category in ["Syllabus", "Pacing_Guides", "Resource_Guides", "Model_Papers", "Concept_Maps"]:
                    key = (category, prog, subject, grade)
                    if key not in best_materials or year > best_materials[key][0]:
                        best_materials[key] = (year, task_tuple)
                else:
                    all_materials.append(task_tuple)
                
            meta = resp_json.get('data', {}).get('meta', {})
            if not meta.get('hasNext'):
                break
            page += 1

    download_tasks = all_materials + [val[1] for val in best_materials.values()]
    print(f"Total files to download after filtering latest resources: {len(download_tasks)}")
    
    print("Starting download...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(download_file, url, path) for url, path in download_tasks]
        count = 0
        for future in concurrent.futures.as_completed(futures):
            count += 1
            if count % 50 == 0:
                print(f"Downloaded {count}/{len(download_tasks)} files...")
    
    print("All downloads completed.")

if __name__ == '__main__':
    main()
