"""
AI-Powered Question Diagram Detection and Precision Cropping Service.

Uses Google Gemini Vision API to accurately identify genuine examination diagrams
(graphs, circuits, apparatus, visual mechanics figures) from PDF pages,
skipping rough work boxes, headers, footers, and text-only pages.
Crops high-resolution 200 DPI images directly into public/extracted_diagrams/
and updates the verified diagrams manifest.
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import Dict, Any, Optional

import pymupdf
from dotenv import load_dotenv

load_dotenv()

from services.inference.gemini_client import GeminiClient

OUTPUT_DIR = Path("public/extracted_diagrams")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

MANIFEST_PATH = Path("data/physics/verified_diagrams_manifest.json")

PROMPT_DETECT_DIAGRAMS = (
    "You are an expert examination paper diagram analyzer for AKU-EB examination papers.\n"
    "Carefully analyze this examination paper page image.\n"
    "Detect ONLY genuine examination question diagrams, circuits, graphs, apparatus drawings, or visual figures.\n\n"
    "CRITICAL NEGATIVE RULES:\n"
    "1. NEVER crop 'Please use this page for rough work' boxes or pages.\n"
    "2. NEVER crop page headers, footers, logos, page numbers, or examination instructions.\n"
    "3. NEVER crop regular text paragraphs, multiple-choice options (A, B, C, D text), or blank ruled answer lines.\n"
    "4. If a page has NO question diagrams, return an empty array `{\"diagrams\": []}`.\n\n"
    "For each genuine diagram, identify:\n"
    "- 'question_number': The integer or string question number (e.g., 9, 15, or '3a') that this diagram directly belongs to.\n"
    "- 'description': Concise description of the diagram (e.g., 'Speed-time graph with constant velocity region', 'Circuit with resistors in parallel').\n"
    "- 'box_2d': [ymin, xmin, ymax, xmax] coordinates normalized between 0 and 1000 representing the exact bounding box around the diagram ONLY (exclude the question text above it and options below it).\n"
)

JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "diagrams": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question_number": {"type": "string"},
                    "description": {"type": "string"},
                    "box_2d": {
                        "type": "array",
                        "items": {"type": "integer"}
                    }
                },
                "required": ["question_number", "description", "box_2d"]
            }
        }
    },
    "required": ["diagrams"]
}


def load_manifest() -> Dict[str, Any]:
    if MANIFEST_PATH.exists():
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_manifest(manifest: Dict[str, Any]) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


async def extract_verified_diagrams(
    pdf_path: str,
    paper_code: str,
    client: Optional[GeminiClient] = None,
    max_pages: int = 15,
    skip_rough_pages: bool = True,
    log_cb=print
) -> Dict[str, Dict[str, Any]]:
    """
    Extracts all verified question diagrams from an exam PDF using Gemini Vision.
    Saves high-res cropped PNGs to public/extracted_diagrams/{paper_code}_Q{q_num}.png.
    Updates the master verified diagrams manifest.
    Returns: { clean_question_number: { diagramUrl, description, page, box_2d, width, height } }
    """
    if not os.path.exists(pdf_path):
        log_cb(f"⚠️ [Diagram Cropper] PDF file not found: {pdf_path}")
        return {}

    if client is None:
        client = GeminiClient()

    if not client.is_configured:
        log_cb("⚠️ [Diagram Cropper] Gemini API key not configured. Skipping AI diagram cropping.")
        return {}

    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        log_cb(f"⚠️ [Diagram Cropper] Failed to open PDF: {e}")
        return {}

    total_pages = len(doc)
    log_cb(f"🎨 [AI Diagram Cropper] Scanning {paper_code} ({total_pages} pages) for question diagrams...")

    results: Dict[str, Dict[str, Any]] = {}

    for page_idx in range(min(total_pages, max_pages)):
        page_num = page_idx + 1
        page = doc[page_idx]
        page_text = page.get_text()

        # Filter out rough work pages
        if skip_rough_pages and ("rough work" in page_text.lower() or "please use this page" in page_text.lower()):
            if len(page_text.strip().splitlines()) <= 8:
                log_cb(f"  Page {page_num}/{total_pages}: [Skipped] Detected rough work page.")
                continue

        # Render page at 150 DPI for Gemini Vision analysis
        pix_analysis = page.get_pixmap(dpi=150)
        img_bytes = pix_analysis.tobytes("png")

        res = None
        for attempt in range(2):
            try:
                res = await client.generate(
                    prompt=PROMPT_DETECT_DIAGRAMS,
                    image_bytes=img_bytes,
                    json_schema=JSON_SCHEMA,
                    temperature=0.0
                )
                if res.success and res.text:
                    break
            except Exception as e:
                await asyncio.sleep(1.5)

        if not res or not res.success or not res.text:
            continue

        try:
            parsed = json.loads(res.text)
            diagrams = parsed.get("diagrams", [])
        except Exception:
            continue

        if not diagrams:
            continue

        w = page.rect.width
        h = page.rect.height

        for d in diagrams:
            raw_q = str(d.get("question_number", "")).strip()
            clean_q = raw_q.replace("Q.", "").replace("Q", "").replace(".", "").strip()
            if not clean_q:
                continue

            desc = d.get("description", "Question diagram")
            box = d.get("box_2d", [])
            if len(box) != 4:
                continue

            ymin_n, xmin_n, ymax_n, xmax_n = box
            # Reject boxes that are too small or encompass the entire page
            if (ymax_n - ymin_n) < 25 or (xmax_n - xmin_n) < 25:
                continue
            if (ymax_n - ymin_n) > 950 and (xmax_n - xmin_n) > 950:
                continue

            # Convert normalized 0-1000 coordinates to PDF points with safe margin
            margin_x = 6.0
            margin_y = 6.0
            clip_rect = pymupdf.Rect(
                max(0.0, (xmin_n / 1000.0) * w - margin_x),
                max(0.0, (ymin_n / 1000.0) * h - margin_y),
                min(w, (xmax_n / 1000.0) * w + margin_x),
                min(h, (ymax_n / 1000.0) * h + margin_y)
            )

            # Render cropped diagram at crisp 200 DPI
            pix_crop = page.get_pixmap(clip=clip_rect, dpi=200)

            # Save file
            safe_paper_code = "".join(c if c.isalnum() or c in "-_" else "_" for c in paper_code)
            filename = f"{safe_paper_code}_Q{clean_q}.png"
            filepath = OUTPUT_DIR / filename
            pix_crop.save(str(filepath))

            relative_url = f"/extracted_diagrams/{filename}"
            results[clean_q] = {
                "diagramUrl": relative_url,
                "description": desc,
                "page": page_num,
                "box_2d": box,
                "width": pix_crop.width,
                "height": pix_crop.height
            }
            log_cb(f"  ✅ Q{clean_q}: Cropped & saved {filename} ({pix_crop.width}x{pix_crop.height}) - {desc[:40]}")

        await asyncio.sleep(0.5)

    # Update manifest file
    if results:
        manifest = load_manifest()
        manifest[paper_code] = results
        save_manifest(manifest)
        log_cb(f"💾 Updated verified diagrams manifest for {paper_code} with {len(results)} diagrams.")

    return results


def get_diagram_for_question(paper_code: str, question_number: str | int) -> Optional[str]:
    """
    Synchronous helper to check if a verified diagram exists for a given question.
    """
    clean_q = str(question_number).replace("Q.", "").replace("Q", "").replace(".", "").strip()
    manifest = load_manifest()
    paper_entries = manifest.get(paper_code, {})
    entry = paper_entries.get(clean_q)
    if entry and "diagramUrl" in entry:
        return entry["diagramUrl"]
    return None
