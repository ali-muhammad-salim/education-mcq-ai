import asyncio
import json
import pymupdf
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import dotenv
dotenv.load_dotenv()
from services.inference.gemini_client import GeminiClient

async def test_crop():
    doc = pymupdf.open('public/materials/ssc/physics/ssc-1/physics-model-paper-ix-paper-i.pdf')
    page = doc[2]  # page 3
    
    # Coordinates from Gemini: [571, 169, 710, 625]
    ymin_norm, xmin_norm, ymax_norm, xmax_norm = 571, 169, 710, 625
    
    w = page.rect.width
    h = page.rect.height
    
    rect = pymupdf.Rect(
        max(0, (xmin_norm / 1000.0) * w - 5),
        max(0, (ymin_norm / 1000.0) * h - 5),
        min(w, (xmax_norm / 1000.0) * w + 5),
        min(h, (ymax_norm / 1000.0) * h + 5)
    )
    
    pix = page.get_pixmap(clip=rect, dpi=200)
    out_path = Path("public/extracted_diagrams/test_q9_crop.png")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(out_path))
    print(f"Successfully saved {out_path} ({pix.width}x{pix.height})")

if __name__ == "__main__":
    asyncio.run(test_crop())
