import os
import requests
from bs4 import BeautifulSoup
import asyncio
from urllib.parse import urljoin, unquote

# Import the AI analysis function from our main crawler
from akueb_crawler import analyze_document_with_ai, download_file

BASE_URL = "https://akuebresources.com/past-papers/"

def get_links(url, prefix):
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        links = set()
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith(prefix) and href != url:
                links.add(href)
        return list(links)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

def get_pdf_links(url):
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        links = set()
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.endswith('.pdf'):
                links.add(href)
        return list(links)
    except Exception as e:
        print(f"Error fetching PDFs from {url}: {e}")
        return []

async def process_pdf(pdf_url):
    filename = unquote(pdf_url.split('/')[-1])
    title = filename.replace('.pdf', '').replace('-', ' ')
    
    print(f"\nFound PDF on akuebresources: {title}")
    
    # Run through the Vision AI
    ai_classification = await analyze_document_with_ai(title, pdf_url)
    
    category = ai_classification.get('category', 'Past_Papers')
    year = ai_classification.get('year', 0)
    subject = ai_classification.get('subject', 'Unknown').replace('/', '-')
    
    grades = ai_classification.get('grades', [])
    if not grades:
        grades = ["Unknown"]
        
    for grade in grades:
        dir_path = os.path.join("..", "..", "data", "downloads_ai_sorted", category, grade, subject)
        os.makedirs(dir_path, exist_ok=True)
        
        file_path = os.path.join(dir_path, filename)
        
        # Download if not exists
        if not os.path.exists(file_path):
            print(f"Downloading {filename} to {dir_path}...")
            download_file(pdf_url, file_path)
        else:
            print(f"Skipping {filename}, already exists.")

async def main():
    print("Scraping classes from AKUEB Resources...")
    class_links = get_links(BASE_URL, BASE_URL)
    
    pdf_tasks = []
    
    for class_link in class_links:
        print(f"Scraping subjects for {class_link}...")
        subject_links = get_links(class_link, class_link)
        
        for subject_link in subject_links:
            print(f"Scraping PDFs from {subject_link}...")
            pdfs = get_pdf_links(subject_link)
            pdf_tasks.extend(pdfs)
            
    # Deduplicate PDF links
    pdf_tasks = list(set(pdf_tasks))
    print(f"\nTotal unique PDFs found on akuebresources.com: {len(pdf_tasks)}")
    
    # Process sequentially to not overload the local Ollama instance (8GB VRAM limit)
    for pdf in pdf_tasks:
        await process_pdf(pdf)
        
    print("AKUEB Resources Scraping Completed!")

if __name__ == "__main__":
    # Ensure working directory is correct for relative paths if run from root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(main())
