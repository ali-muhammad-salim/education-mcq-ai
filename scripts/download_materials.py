import json
import os
import requests
import concurrent.futures
from urllib.parse import unquote

def sanitize_filename(name):
    return "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        return
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        r = requests.get(url, stream=True, timeout=15, headers=headers)
        if r.status_code == 200:
            with open(dest_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"Downloaded: {os.path.basename(dest_path)}")
        else:
            print(f"Failed HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

def main():
    manifest_path = 'data/source_manifest.jsonl'
    if not os.path.exists(manifest_path):
        print(f"Manifest not found at {manifest_path}")
        return

    base_dir = 'data/raw_pdfs'
    tasks = []

    with open(manifest_path, 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            item = json.loads(line)
            
            board = sanitize_filename(item.get('board', 'UNKNOWN'))
            rtype = sanitize_filename(item.get('type', 'General'))
            subject = sanitize_filename(item.get('subject', 'UNKNOWN'))
            year = sanitize_filename(str(item.get('year', 'UNKNOWN')))
            grade = sanitize_filename(item.get('programme', '') + '-' + item.get('part', '')).strip('-')
            title = sanitize_filename(item.get('title', 'Untitled'))
            url = item.get('url')
            
            if not url:
                continue
                
            dir_path = os.path.join(base_dir, board, rtype, subject)
            os.makedirs(dir_path, exist_ok=True)
            
            # Construct filename: year_class_title.pdf to avoid collisions
            filename = f"{year}_{grade}_{title}.pdf".replace(' ', '_').replace('__', '_')
            dest_path = os.path.join(dir_path, filename)
            
            if not os.path.exists(dest_path):
                tasks.append((url, dest_path))

    print(f"Found {len(tasks)} new files to download.")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(download_file, url, path) for url, path in tasks]
        for _ in concurrent.futures.as_completed(futures):
            pass

    print("All downloads completed.")

if __name__ == '__main__':
    main()
