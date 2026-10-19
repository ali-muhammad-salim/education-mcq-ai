import asyncio
import json
import pymupdf
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import dotenv
dotenv.load_dotenv()
from services.inference.gemini_client import GeminiClient

async def test_page_diagram_detection():
    doc = pymupdf.open('public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf')
    page = doc[11]  # page 12 (rough work page)
    pix = page.get_pixmap(dpi=150)
    img_bytes = pix.tobytes('png')

    prompt = (
        "Analyze this examination paper page.\n"
        "Identify all diagrams, figures, graphs, circuits, apparatus, or visual charts that belong to a question.\n"
        "CRITICAL RULES:\n"
        "1. ONLY return diagrams that belong to a question.\n"
        "2. DO NOT return header banners, footers, page numbers, or 'Please use this page for rough work' boxes.\n"
        "3. For each diagram, return the question number it belongs to, description, and exact 2D bounding box [ymin, xmin, ymax, xmax] normalized 0-1000.\n"
    )

    client = GeminiClient()
    res = await client.generate(
        prompt=prompt,
        image_bytes=img_bytes,
        json_schema={
            "type": "object",
            "properties": {
                "diagrams": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question_number": {"type": "integer"},
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
    )
    print("Success:", res.success)
    print("Detected diagrams:", res.text)

if __name__ == "__main__":
    asyncio.run(test_page_diagram_detection())
