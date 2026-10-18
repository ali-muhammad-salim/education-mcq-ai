import httpx
from bs4 import BeautifulSoup
import re
import json
import hashlib
import os

def normalize_url(url):
    return url.strip().split('#')[0]

def get_hash(url):
    return hashlib.sha256(url.encode('utf-8')).hexdigest()

def classify_akueb_resources_link(url, text, programme, part, subject):
    url_lower = url.lower()
    text_lower = text.lower()
    
    # Identify Year
    # Prioritize the link text (title) for the year, fallback to URL
    year_match = re.search(r'(20\d{2})', text_lower)
    year = year_match.group(1) if year_match else None
    if not year:
        year_match = re.search(r'(20\d{2})', url_lower)
        year = year_match.group(1) if year_match else None

    # Identify Type
    rtype = "General"
    if 'syllabus' in url_lower or 'syllabus' in text_lower:
        rtype = "Syllabus"
    elif 'model' in url_lower or 'model' in text_lower:
        rtype = "Model Paper"
    elif 'key' in url_lower or 'keys' in url_lower or 'key' in text_lower:
        rtype = "Answer Key"
    elif 'e-marking' in url_lower or 'e-marking' in text_lower or 'emarking' in url_lower:
        rtype = "E-marking Notes"
    elif 'paper' in url_lower or 'past paper' in text_lower:
        rtype = "Past Paper"
    elif 'listening' in url_lower or 'audio' in url_lower or 'listening' in text_lower:
        rtype = "Listening Passage"

    return {
        "source": "akuebresources.com",
        "url": url,
        "title": text.strip() or os.path.basename(url),
        "board": "AKU-EB",
        "programme": programme.upper(),
        "part": part.upper(),
        "subject": subject.replace('-', ' ').title(),
        "year": year,
        "type": rtype,
        "url_hash": get_hash(url)
    }

def crawl_akueb_resources():
    base_url = 'https://akuebresources.com/past-papers/'
    levels = ['ssc-i', 'ssc-ii', 'hssc-i', 'hssc-ii']
    manifest = []
    visited_urls = set()
    visited_content = set()
    
    with httpx.Client(timeout=15.0) as client:
        for level in levels:
            parts = level.split('-')
            programme = parts[0]
            part = parts[1]
            try:
                r = client.get(f"{base_url}{level}/")
                if r.status_code != 200:
                    continue
                
                soup = BeautifulSoup(r.text, 'html.parser')
                subject_links = []
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if f"/{level}/" in href and href != f"https://akuebresources.com/past-papers/{level}/":
                        subject_links.append(href)
                
                subject_links = list(set(subject_links))
                for subj_url in subject_links:
                    subj_match = re.search(fr'/{level}/([^/]+)/?$', subj_url)
                    if not subj_match:
                        continue
                    subject = subj_match.group(1)
                    
                    try:
                        r_subj = client.get(subj_url)
                        if r_subj.status_code != 200:
                            continue
                        
                        soup_subj = BeautifulSoup(r_subj.text, 'html.parser')
                        for a in soup_subj.find_all('a', href=True):
                            href = a['href']
                            if '.pdf' in href or 'drive.google' in href:
                                normalized = normalize_url(href)
                                if normalized not in visited_urls:
                                    visited_urls.add(normalized)
                                    
                                    # Use HEAD to deduplicate by content (ETag or Content-Length)
                                    try:
                                        head_r = client.head(normalized)
                                        etag = head_r.headers.get("etag")
                                        c_len = head_r.headers.get("content-length")
                                        content_sig = f"{etag}_{c_len}" if (etag or c_len) else get_hash(normalized)
                                    except:
                                        content_sig = get_hash(normalized)
                                        
                                    if content_sig not in visited_content:
                                        visited_content.add(content_sig)
                                        manifest.append(classify_akueb_resources_link(normalized, a.text, programme, part, subject))
                    except Exception as e:
                        print(f"Error fetching {subj_url}: {e}")
            except Exception as e:
                print(f"Error fetching {level}: {e}")
                
    return manifest

def extract_aku_edu_learning_materials():
    manifest = []
    visited_urls = set()
    visited_content = set()
    base_url = "https://akuwebapp-prd-eub7dgbbb2fphae2.westeurope-01.azurewebsites.net/api/v1/learning-materials"
    programs = ["SSC", "HSSC"]
    limit = 50
    
    with httpx.Client(timeout=30.0) as client:
        for prog in programs:
            page = 1
            while True:
                try:
                    resp = client.get(f"{base_url}?page={page}&limit={limit}&program={prog}")
                    if resp.status_code != 200:
                        break
                    
                    data = resp.json()
                    items = data.get("data", {}).get("data", [])
                    if not items:
                        break
                    
                    for item in items:
                        title = item.get("title", "")
                        material = item.get("materialAttachment", {})
                        if not material:
                            continue
                            
                        url = material.get("filename", "")
                        if not url or url in visited_urls:
                            continue
                            
                        visited_urls.add(url)
                        
                        # Use HEAD to deduplicate by content (ETag or Content-Length)
                        try:
                            head_r = client.head(url)
                            etag = head_r.headers.get("etag")
                            c_len = head_r.headers.get("content-length")
                            content_sig = f"{etag}_{c_len}" if (etag or c_len) else get_hash(url)
                        except:
                            content_sig = get_hash(url)
                            
                        if content_sig in visited_content:
                            continue
                        visited_content.add(content_sig)
                        
                        rtype = "General"
                        title_lower = title.lower()
                        if 'syllabus' in title_lower: rtype = "Syllabus"
                        elif 'model' in title_lower: rtype = "Model Paper"
                        elif 'key' in title_lower: rtype = "Answer Key"
                        elif 'scheme' in title_lower: rtype = "Scheme of Studies"
                        elif 'concept map' in title_lower: rtype = "Concept Map"
                        elif 'pacing guide' in title_lower: rtype = "Pacing Guide"
                        elif 'resource guide' in title_lower: rtype = "Resource Guide"
                        elif 'past paper' in title_lower: rtype = "Past Paper"
                        
                        subject = item.get("subject", "UNKNOWN").title()
                        part = item.get("grade", "UNKNOWN").replace(prog, "").strip()
                        
                        manifest.append({
                            "source": "examinationboard.aku.edu",
                            "url": url,
                            "title": title,
                            "board": "AKU-EB",
                            "programme": prog,
                            "part": part,
                            "subject": subject,
                            "year": item.get("examinationYear", "UNKNOWN"),
                            "type": rtype,
                            "url_hash": get_hash(url)
                        })
                    page += 1
                except Exception as e:
                    print(f"Error fetching API {prog} page {page}: {e}")
                    break
    
    return manifest

if __name__ == "__main__":
    os.makedirs('data', exist_ok=True)
    os.makedirs('docs', exist_ok=True)
    os.makedirs('scripts', exist_ok=True)
    
    print("Crawling akuebresources.com...")
    manifest1 = crawl_akueb_resources()
    
    print("Extracting from examinationboard.aku.edu...")
    manifest2 = extract_aku_edu_learning_materials()
    
    full_manifest = manifest1 + manifest2
    
    print(f"Found {len(full_manifest)} resources.")
    
    # Save manifest
    with open('data/source_manifest.jsonl', 'w', encoding='utf-8') as f:
        for item in full_manifest:
            f.write(json.dumps(item) + '\n')
            
    # Generate Markdown Catalog
    counts = {}
    for item in full_manifest:
        key = (item['programme'], item['subject'], item['type'])
        counts[key] = counts.get(key, 0) + 1
        
    with open('docs/AKUEB_SOURCE_CATALOG.md', 'w', encoding='utf-8') as f:
        f.write("# AKU-EB Source Catalog\n\n")
        f.write("## Overview\n")
        f.write(f"Total Resources Found: {len(full_manifest)}\n\n")
        f.write("## Resource Breakdown\n\n")
        f.write("| Programme | Subject | Type | Count |\n")
        f.write("|-----------|---------|------|-------|\n")
        for key in sorted(counts.keys()):
            f.write(f"| {key[0]} | {key[1]} | {key[2]} | {counts[key]} |\n")
        
    print("Saved data/source_manifest.jsonl and docs/AKUEB_SOURCE_CATALOG.md")
