import os
import re
import json
import requests
import fitz  # PyMuPDF
from pydantic import BaseModel, Field
from typing import List, Optional

class QuestionOption(BaseModel):
    label: str  # A, B, C, D
    text: str

class QuestionPart(BaseModel):
    part_label: str  # e.g., 'a', 'b', 'i', 'ii'
    text: str
    marks: Optional[int] = None

class Question(BaseModel):
    q_num: str
    text: str
    marks: Optional[int] = None
    options: Optional[List[QuestionOption]] = None
    parts: Optional[List[QuestionPart]] = None

class Section(BaseModel):
    section_name: str  # e.g., "Section A", "Section B"
    questions: List[Question]

class PastPaper(BaseModel):
    paper_title: str
    sections: List[Section]

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts raw text from the PDF."""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def parse_past_paper_with_llm(raw_text: str, model_name: str = "qwen2.5:7b") -> dict:
    """
    Sends raw text to the local LLM and expects a strict JSON response
    matching the PastPaper schema.
    """
    prompt = f"""
    You are an expert educational data extractor.
    I am providing you with the raw text from an AKU-EB Past Paper.
    Extract the questions and structure them into the exact JSON format requested.
    
    Rules:
    1. Identify Sections (e.g., Section A: Multiple Choice Questions, Section B: Constructed Response Questions).
    2. Extract each question number and its exact text.
    3. For multiple-choice questions, extract the options (A, B, C, D) and their text.
    4. For constructed response questions, extract any parts (a, b, i, ii) and their marks if mentioned.
    5. Output ONLY valid JSON matching this schema:
    
    {{
      "paper_title": "Biology HSSC-I 2023",
      "sections": [
        {{
          "section_name": "Section A",
          "questions": [
            {{
              "q_num": "1",
              "text": "What is the powerhouse of the cell?",
              "marks": 1,
              "options": [
                {{"label": "A", "text": "Nucleus"}},
                {{"label": "B", "text": "Mitochondria"}}
              ],
              "parts": []
            }}
          ]
        }}
      ]
    }}

    Raw Paper Text:
    {raw_text[:12000]}  # Limiting length for context window if needed, though Qwen2.5 handles 32k.
    """

    payload = {
        "model": model_name,
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
            
        return json.loads(resp_text)
    except Exception as e:
        print(f"Error querying LLM: {e}")
        return {}

def process_past_paper(pdf_path: str, output_path: str):
    print(f"Reading {pdf_path}...")
    raw_text = extract_text_from_pdf(pdf_path)
    if not raw_text.strip():
        print("No text found in PDF.")
        return

    print("Sending text to local LLM for structured extraction...")
    parsed_json = parse_past_paper_with_llm(raw_text)
    
    if parsed_json:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(parsed_json, f, indent=2)
        print(f"Successfully saved structured JSON to {output_path}")
    else:
        print("Failed to parse paper.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Parse a Past Paper PDF into structured JSON.")
    parser.add_argument("pdf_path", help="Path to the past paper PDF")
    parser.add_argument("output_path", help="Path to save the JSON output")
    args = parser.parse_args()
    
    process_past_paper(args.pdf_path, args.output_path)
