"""
Automatic Diagram & Image Cropper for Examination Papers.
Extracts raster images and vector diagrams from PDF pages at high DPI,
expanding bounds to include adjacent axis labels and text (e.g. Time, Distance),
saving them to public/extracted_diagrams/ and returning web URLs.
"""

import os
from pathlib import Path
import fitz  # PyMuPDF

OUTPUT_DIR = Path("public/extracted_diagrams")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

WATERMARK_WORDS = {
    "aku-eb", "annual", "examinations", "teaching", "learning", "only",
    "please", "turn", "over", "page", "of", "end"
}


def extract_page_diagrams(pdf_path: str, paper_code: str) -> dict[int, list[str]]:
    """
    Scans a PDF document for raster images and vector diagrams.
    Expands bounding boxes to include adjacent text labels (e.g. Time, Distance).
    Returns a dict mapping page_number (1-indexed) -> list of web URLs.
    """
    doc = fitz.open(pdf_path)
    page_diagrams: dict[int, list[str]] = {}

    for p_no in range(len(doc)):
        page = doc[p_no]
        page_num = p_no + 1
        saved_urls = []

        # 1. Check for embedded raster images
        imgs = page.get_images()
        for idx, img in enumerate(imgs):
            xref = img[0]
            rects = page.get_image_rects(xref)
            for r_idx, r in enumerate(rects):
                # Filter out tiny logos, full-page watermarks, or header banners
                if 20 < r.width < 500 and 20 < r.height < 500 and 60 < r.y0 < 760:
                    clip_rect = fitz.Rect(
                        max(0, r.x0 - 5),
                        max(0, r.y0 - 5),
                        min(page.rect.width, r.x1 + 5),
                        min(page.rect.height, r.y1 + 5)
                    )
                    pix = page.get_pixmap(clip=clip_rect, matrix=fitz.Matrix(3.0, 3.0))
                    filename = f"{paper_code}_p{page_num}_img{idx}_{r_idx}.png"
                    filename = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
                    file_path = OUTPUT_DIR / filename
                    pix.save(str(file_path))
                    saved_urls.append(f"/extracted_diagrams/{filename}")

        # 2. Check for vector drawings (circuits, ray diagrams, graphs, pulleys)
        drawings = page.get_drawings()
        diag_rects = [
            d["rect"] for d in drawings
            if 70 < d["rect"].y0 < 750 and 70 < d["rect"].y1 < 750 and (d["rect"].width > 15 or d["rect"].height > 15)
        ]

        if diag_rects:
            # Cluster drawing rects by vertical proximity
            sorted_rects = sorted(diag_rects, key=lambda r: (r.y0, r.x0))
            clusters: list[fitz.Rect] = []
            for r in sorted_rects:
                placed = False
                for c in clusters:
                    if abs(r.y0 - c.y1) < 45 or abs(r.y1 - c.y0) < 45 or c.intersects(r):
                        c |= r
                        placed = True
                        break
                if not placed:
                    clusters.append(fitz.Rect(r))

            # Retrieve words on page (ignoring watermarks and question numbers)
            words = [
                w for w in page.get_text("words")
                if w[4].lower() not in WATERMARK_WORDS and not any(w[4].startswith(f"{n}.") for n in range(1, 45))
            ]

            for c_idx, cluster in enumerate(clusters):
                if cluster.width > 30 and cluster.height > 20 and cluster.width < 550 and cluster.height < 500:
                    # Expand cluster to include adjacent axis labels and text (e.g. Time, Distance, A, B, C, D)
                    expanded = fitz.Rect(cluster)
                    for w in words:
                        w_rect = fitz.Rect(w[0], w[1], w[2], w[3])
                        # If word is within 30pt of cluster, include it
                        if (expanded.x0 - 30 <= w_rect.x1 and w_rect.x0 <= expanded.x1 + 30 and
                            expanded.y0 - 25 <= w_rect.y1 and w_rect.y0 <= expanded.y1 + 30):
                            expanded |= w_rect

                    # Add clean padding around the diagram
                    pad_rect = fitz.Rect(
                        max(0, expanded.x0 - 10),
                        max(0, expanded.y0 - 8),
                        min(page.rect.width, expanded.x1 + 10),
                        min(page.rect.height, expanded.y1 + 10)
                    )
                    pix = page.get_pixmap(clip=pad_rect, matrix=fitz.Matrix(3.0, 3.0))
                    filename = f"{paper_code}_p{page_num}_drawing_{c_idx}.png"
                    filename = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)
                    file_path = OUTPUT_DIR / filename
                    pix.save(str(file_path))
                    saved_urls.append(f"/extracted_diagrams/{filename}")

        if saved_urls:
            page_diagrams[page_num] = saved_urls

    return page_diagrams
