import os
import asyncio
import pymupdf  # fitz
import json
from pathlib import Path

# Prisma Python Client
from prisma import Prisma

# Ensure you have 'httpx' installed for async requests to Ollama
import httpx

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "qwen2.5:latest"  # Can be changed to whatever local model is running

async def ask_local_ai(prompt: str) -> str:
    """
    Sends a prompt to the Local AI (Ollama) and returns the response.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json" # Force JSON output for reliable parsing
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")

async def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text using PyMuPDF for quick AI context parsing.
    """
    text = ""
    try:
        doc = pymupdf.open(pdf_path)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
    return text

async def process_syllabus_document(pdf_path: str, db: Prisma):
    """
    Process a single Syllabus document using Local AI.
    1. Extracts text.
    2. Uses AI to find multi-grade mappings (e.g., IX vs X).
    3. Saves structured ontology (Chapters, SLOs) to Database.
    """
    print(f"\n--- Processing: {pdf_path} ---")
    
    # 1. Extract raw text
    raw_text = await extract_text_from_pdf(pdf_path)
    
    if not raw_text.strip():
        print("No digital text found. (Needs OCR Fallback - Pipeline extending...)")
        return

    # To avoid context limits, we can send just the first few pages (Table of Contents) 
    # to find the grade mapping and chapter list.
    toc_text = raw_text[:8000] # roughly first few pages
    
    # 2. Multi-Grade Partitioner AI Prompt
    prompt = f"""
    You are an expert Educational Data Extractor.
    Analyze the following syllabus text and identify if it covers multiple grades (e.g., Grade IX and Grade X).
    Extract the Chapters and map them to their correct grade.
    
    Return ONLY a valid JSON dictionary in this exact format:
    {{
        "Grade 9": [
            {{"chapter_number": 1, "chapter_name": "Cell Biology"}},
            ...
        ],
        "Grade 10": [
            {{"chapter_number": 5, "chapter_name": "Reproduction"}},
            ...
        ]
    }}
    
    Here is the syllabus text:
    {toc_text}
    """
    
    print("Sending to Local AI for analysis...")
    try:
        ai_response = await ask_local_ai(prompt)
        ai_data = json.loads(ai_response)
        
        print("AI Successfully mapped the document:")
        print(json.dumps(ai_data, indent=2))
        
        # 3. Save to Database using Prisma (Mock example of saving)
        # Note: In a real run, we would lookup board_id, syllabus_id, etc.
        
    except json.JSONDecodeError:
        print("Error: AI did not return valid JSON.")
    except Exception as e:
        print(f"Error calling Local AI: {e}")

async def main():
    # Initialize Prisma Client
    db = Prisma()
    db.connect()
    print("Connected to PostgreSQL Database via Prisma.")
    
    downloads_dir = Path("data/downloads/Syllabus")
    
    if not downloads_dir.exists():
        print(f"Directory {downloads_dir} not found. Please wait for crawler to finish.")
        db.disconnect()
        return

    # Find a few PDFs to process as a test
    pdf_files = list(downloads_dir.rglob("*.pdf"))
    print(f"Found {len(pdf_files)} syllabus PDFs to process.")
    
    # Just process the first one for demonstration
    if pdf_files:
        await process_syllabus_document(str(pdf_files[0]), db)
    
    db.disconnect()
    print("Database connection closed.")

if __name__ == "__main__":
    asyncio.run(main())
