"""
AI-Powered Question Diagram Detection and Precision Cropping Pipeline.

Uses Google Gemini Vision to inspect PDF pages, detect only legitimate question diagrams
(graphs, circuits, apparatus, visual mechanics figures), ignores rough work boxes / headers / footers,
and uses PyMuPDF to extract crisp 200-DPI cropped PNGs.
"""

import os
import sys
import json
import asyncio
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

import dotenv
import pymupdf

dotenv.load_dotenv()
from services.inference.gemini_client import GeminiClient

OUTPUT_DIR = Path("public/extracted_diagrams")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

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


async def process_pdf_diagrams(
    pdf_path: str,
    paper_code: str,
    client: GeminiClient,
    max_pages: int = 15,
    skip_rough_pages: bool = True
) -> dict:
    """
    Extracts all verified question diagrams from a PDF using Gemini Vision.
    Saves high-res cropped PNGs to public/extracted_diagrams/{paper_code}_Q{q_num}.png.
    """
    if not os.path.exists(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        return {}

    doc = pymupdf.open(pdf_path)
    total_pages = len(doc)
    print(f"\n=======================================================")
    print(f"=== [AI DIAGRAM PIPELINE] Processing {paper_code} ({total_pages} pages)")
    print(f"=== Source: {pdf_path}")
    print(f"=======================================================")

    results = {}

    for page_idx in range(min(total_pages, max_pages)):
        page_num = page_idx + 1
        page = doc[page_idx]
        page_text = page.get_text()

        # Check for rough work pages
        if skip_rough_pages and ("rough work" in page_text.lower() or "please use this page" in page_text.lower()):
            if len(page_text.strip().splitlines()) <= 8:
                print(f"  Page {page_num}/{total_pages}: [SKIPPED] Detected rough work page.")
                continue

        # Render page at 150 DPI for Gemini analysis
        pix_analysis = page.get_pixmap(dpi=150)
        img_bytes = pix_analysis.tobytes("png")

        print(f"  Page {page_num}/{total_pages}: Analyzing with Gemini Vision...", end="", flush=True)

        res = None
        for attempt in range(3):
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
                print(f" [Retry {attempt+1}]: {e}", end="", flush=True)
                await asyncio.sleep(2)

        if not res or not res.success or not res.text:
            print(" [FAILED analysis]")
            continue

        try:
            parsed = json.loads(res.text)
            diagrams = parsed.get("diagrams", [])
        except Exception as parse_err:
            print(f" [JSON Parse Error: {parse_err}]")
            continue

        if not diagrams:
            print(" [No diagrams]")
            continue

        print(f" [Found {len(diagrams)} diagram(s)]")

        w = page.rect.width
        h = page.rect.height

        for d in diagrams:
            raw_q = str(d.get("question_number", "")).strip()
            # Clean question number string (e.g. 'Q.9' -> '9', '9.' -> '9')
            clean_q = raw_q.replace("Q.", "").replace("Q", "").replace(".", "").strip()
            if not clean_q:
                continue

            desc = d.get("description", "Question diagram")
            box = d.get("box_2d", [])
            if len(box) != 4:
                continue

            ymin_n, xmin_n, ymax_n, xmax_n = box
            # Sanity check: valid box size
            if (ymax_n - ymin_n) < 20 or (xmax_n - xmin_n) < 20:
                print(f"    -> Q{clean_q}: [REJECTED] Box too small ({box})")
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

            # Render cropped diagram at high crisp resolution (200 DPI)
            pix_crop = page.get_pixmap(clip=clip_rect, dpi=200)
            
            # Save file
            filename = f"{paper_code}_Q{clean_q}.png"
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
            print(f"    -> Q{clean_q}: Cropped & Saved {filename} ({pix_crop.width}x{pix_crop.height}) - {desc[:50]}")

        await asyncio.sleep(1.0)

    print(f"\n[DONE] {paper_code}: Successfully cropped {len(results)} verified diagrams.\n")
    return results


async def run_all_papers():
    client = GeminiClient()
    if not client.is_configured:
        print("[ERROR] GeminiClient is not configured! Check GEMINI_API_KEY.")
        return

    papers_to_process = [
        {
            "code": "PHY-IX-2025-P1",
            "pdf": "public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf",
            "json_target": "data/physics/ssc1_model_mcqs.json"
        },
        {
            "code": "PHY-X-2025-P1",
            "pdf": "public/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-i.pdf",
            "json_target": "data/physics/ssc2_model_mcqs.json"
        },
        {
            "code": "PHY-IX-2025-P2",
            "pdf": "public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-ii.pdf",
            "json_target": "data/physics/ssc1_model_crqs.json"
        },
        {
            "code": "PHY-X-2025-P2",
            "pdf": "public/materials/ssc/physics/ssc-2/physics-model-paper-x-paper-ii.pdf",
            "json_target": "data/physics/ssc2_model_crqs.json"
        }
    ]

    all_diagram_manifest = {}

    for paper in papers_to_process:
        code = paper["code"]
        pdf = paper["pdf"]
        diagrams_map = await process_pdf_diagrams(pdf, code, client)
        all_diagram_manifest[code] = diagrams_map

        # Update JSON dataset if target exists
        json_path = Path(paper["json_target"])
        if json_path.exists():
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
                updated_count = 0
                for item in data:
                    raw_num = str(item.get("questionNumber", "")).strip().replace("Q.", "").replace(".", "")
                    if raw_num in diagrams_map:
                        item["isDiagram"] = True
                        item["diagramUrl"] = diagrams_map[raw_num]["diagramUrl"]
                        item["diagramDescription"] = diagrams_map[raw_num]["description"]
                        updated_count += 1
                    else:
                        item["isDiagram"] = False
                        if "diagramUrl" in item:
                            del item["diagramUrl"]

                json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                print(f"  [UPDATED DATASET] Synced {updated_count} diagrams into {json_path}")
            except Exception as e:
                print(f"  [ERROR] Updating {json_path}: {e}")

    # Save master diagram manifest for instant runtime lookups
    manifest_file = Path("data/physics/verified_diagrams_manifest.json")
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(json.dumps(all_diagram_manifest, indent=2), encoding="utf-8")
    print(f"\n[SUCCESS] Master diagrams manifest saved to {manifest_file}")


if __name__ == "__main__":
    asyncio.run(run_all_papers())
