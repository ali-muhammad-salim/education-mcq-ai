import sys
import json
import requests
import fitz  # PyMuPDF
import re

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def chunk_text(text, max_tokens=15000):
    # A simple word-based chunker
    words = text.split()
    chunks = []
    current_chunk = []
    for word in words:
        current_chunk.append(word)
        if len(current_chunk) >= max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks

def extract_syllabus_with_ai(text_chunk):
    prompt = f"""
You are an expert curriculum mapped for the Aga Khan University Examination Board (AKU-EB).
I am providing you with raw text extracted from a PDF syllabus.
Your job is to extract the curriculum Topics, Subtopics, and Student Learning Outcomes (SLOs).
Do not summarize. Extract exactly what is there.
Ensure that SLOs have their codes (e.g., 1.1.1), their descriptions, and their cognitive levels (K, U, A).

Output exactly and ONLY a JSON object that strictly matches this schema:
{{
  "topics": [
    {{
      "name": "Topic Name",
      "subtopics": [
        {{
          "name": "Subtopic Name",
          "slos": [
            {{
              "code": "1.1.1",
              "description": "Describe something",
              "cognitiveLevel": "K"
            }}
          ]
        }}
      ]
    }}
  ]
}}

Raw Syllabus Text:
{text_chunk}
"""
    
    payload = {
        "model": "qwen2.5:7b",
        "prompt": prompt,
        "format": "json",
        "stream": False
    }

    try:
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()
        
        # Clean up any potential markdown wrapper
        resp_text = result.get('response', '{}')
        match = re.search(r'\{.*\}', resp_text, re.DOTALL)
        if match:
            resp_text = match.group(0)
            
        data = json.loads(resp_text)
        return data.get("topics", [])
    except Exception as e:
        print(f"Error querying Ollama: {e}")
        return []

def process_syllabus(version_id, pdf_path):
    print(f"Extracting text from {pdf_path}...")
    full_text = extract_text_from_pdf(pdf_path)
    
    # Syllabi can be large, but a typical subject syllabus might be 10k-20k words.
    # Qwen2.5 supports 32k tokens. We can probably send 15k words per chunk safely.
    chunks = chunk_text(full_text)
    print(f"Divided PDF into {len(chunks)} chunks.")
    
    all_topics = []
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}/{len(chunks)} with Ollama...")
        topics = extract_syllabus_with_ai(chunk)
        if topics:
            all_topics.extend(topics)
            
    print(f"Extracted {len(all_topics)} topics. Sending to Next.js API...")
    
    # Post the extracted data back to our Next.js API to save into Prisma
    payload = {
        "versionId": version_id,
        "topics": all_topics
    }
    
    try:
        res = requests.post("http://localhost:3000/api/ingest/syllabus", json=payload)
        res.raise_for_status()
        print("Successfully ingested into database!")
    except Exception as e:
        print(f"Failed to ingest: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python ai_extractor.py <type> <versionId> <pdfPath>")
        sys.exit(1)
        
    job_type = sys.argv[1]
    version_id = sys.argv[2]
    pdf_path = sys.argv[3]
    
    if job_type == "syllabus":
        process_syllabus(version_id, pdf_path)
    else:
        print(f"Type {job_type} not yet implemented.")
