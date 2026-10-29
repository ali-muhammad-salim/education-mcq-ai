"""
Analyze the user's Physics study materials in detail.
Extracts TOC, chapters, model paper structure, and marks breakdown.
"""

import re
from pathlib import Path
import pymupdf

BASE = Path("data/intake")


def analyze_syllabus():
    print("=" * 70)
    print("1. SYLLABUS ANALYSIS")
    print("=" * 70)
    syl_path = BASE / "physics_9" / "syllabus" / "physics-ssc-i-syllabus-2025.pdf"
    if not syl_path.exists():
        print("Syllabus file not found:", syl_path)
        return

    doc = pymupdf.open(syl_path)
    print(f"File: {syl_path.name} ({len(doc)} pages)")
    
    # Search for chapter titles / units
    units = []
    for page_idx in range(len(doc)):
        text = doc[page_idx].get_text("text")
        matches = re.findall(r"(?:Unit|Chapter)\s+(\d+)\s*[:\-–]\s*([^\n\r]+)", text, re.IGNORECASE)
        for m in matches:
            unit_entry = (m[0], m[1].strip(), page_idx + 1)
            if unit_entry not in units:
                units.append(unit_entry)

    # De-duplicate while preserving order
    seen = set()
    dedup_units = []
    for u in units:
        key = (u[0], u[1].lower())
        if key not in seen:
            seen.add(key)
            dedup_units.append(u)

    print(f"\nDetected {len(dedup_units)} Units/Chapters:")
    for num, title, p in dedup_units[:15]:
        print(f"  - Unit {num}: {title} (Page {p})")
    doc.close()


def analyze_model_papers():
    print("\n" + "=" * 70)
    print("2. MODEL PAPERS ANALYSIS")
    print("=" * 70)
    
    mp_files = [
        BASE / "physics_9" / "model_paper" / "physics-model-paper-ix-paper-i.pdf",
        BASE / "physics_9" / "model_paper" / "physics-model-paper-ix-paper-ii.pdf",
        BASE / "physics_10" / "model_paper" / "physics-model-paper-x-paper-i.pdf",
        BASE / "physics_10" / "model_paper" / "physics-model-paper-x-paper-ii.pdf",
    ]

    for mp in mp_files:
        if not mp.exists():
            continue
        doc = pymupdf.open(mp)
        first_page_text = doc[0].get_text("text")
        
        # Extract total marks, time allowed
        marks_match = re.search(r"(?:Total Marks|Max\.? Marks|Marks)\s*[:\-–]?\s*(\d+)", first_page_text, re.IGNORECASE)
        time_match = re.search(r"(?:Time Allowed|Time|Duration)\s*[:\-–]?\s*([^\n\r]+)", first_page_text, re.IGNORECASE)
        
        # Check sections
        full_text = "".join([doc[i].get_text("text") for i in range(len(doc))])
        sections = re.findall(r"Section\s+([A-C])", full_text, re.IGNORECASE)
        unique_sections = sorted(list(set([s.upper() for s in sections])))

        # Check question count
        mcqs = re.findall(r"\bQ\.?\s*(\d+)\b", full_text)
        
        marks_str = marks_match.group(1) if marks_match else "N/A"
        time_str = time_match.group(1).strip() if time_match else "N/A"

        print(f"\nModel Paper: {mp.name}")
        print(f"  Pages: {len(doc)} | Total Marks: {marks_str} | Time: {time_str}")
        print(f"  Sections detected: {', '.join(['Section ' + s for s in unique_sections])}")
        doc.close()


def analyze_guides():
    print("\n" + "=" * 70)
    print("3. PACING & RESOURCE GUIDES ANALYSIS")
    print("=" * 70)
    
    guides = [
        BASE / "physics_9" / "pacing_guide" / "pacing-guide-2025-for-ssc-i-physics.pdf",
        BASE / "physics_10" / "pacing_guide" / "pacing-guide-for-ssc-ii-physics.pdf",
        BASE / "physics_9" / "resource_guide" / "resources-guide-2025-ssc-physics-final.pdf",
        BASE / "physics_9" / "resource_guide" / "ssc-i-physics-sample-practical.pdf",
    ]
    for g in guides:
        if not g.exists():
            continue
        doc = pymupdf.open(g)
        print(f"Guide: {g.name} ({len(doc)} pages)")
        first_few = doc[0].get_text("text")[:200].replace("\n", " ").strip()
        print(f"  Intro Snippet: {first_few}...")
        doc.close()


if __name__ == "__main__":
    analyze_syllabus()
    analyze_model_papers()
    analyze_guides()
