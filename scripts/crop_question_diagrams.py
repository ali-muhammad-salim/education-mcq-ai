import os
import fitz

DIAGRAMS_DIR = r"public\materials\scans\diagrams"
os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# For each paper, let's identify pages with drawings and crop diagram regions
papers = [
    ("ssc1_p1", r"public\materials\ssc\physics\ssc-1\physics-model-paper-ix-paper-i.pdf"),
    ("ssc1_p2", r"public\materials\ssc\physics\ssc-1\physics-model-paper-ix-paper-ii.pdf"),
    ("ssc2_p1", r"public\materials\ssc\physics\ssc-2\physics-model-paper-x-paper-i.pdf"),
    ("ssc2_p2", r"public\materials\ssc\physics\ssc-2\physics-model-paper-x-paper-ii.pdf"),
]

for prefix, pdf_path in papers:
    doc = fitz.open(pdf_path)
    for p_no in range(len(doc)):
        page = doc[p_no]
        drawings = page.get_drawings()
        # If page has drawings (vector diagrams)
        if len(drawings) > 2:
            # find bounding rect of all drawings on page (excluding header/footer lines if any)
            diag_rects = []
            for d in drawings:
                r = d["rect"]
                # Exclude top header (y < 70) and bottom footer (y > 750)
                if 70 < r.y0 < 750 and 70 < r.y1 < 750 and (r.width > 20 or r.height > 20):
                    diag_rects.append(r)
            
            if diag_rects:
                # Union of rects
                combined = diag_rects[0]
                for r in diag_rects[1:]:
                    combined = combined | r
                
                # Expand slightly for padding
                combined = fitz.Rect(
                    max(0, combined.x0 - 15),
                    max(0, combined.y0 - 10),
                    min(page.rect.width, combined.x1 + 15),
                    min(page.rect.height, combined.y1 + 10)
                )
                
                # Only if substantial size
                if combined.width > 40 and combined.height > 30:
                    pix = page.get_pixmap(clip=combined, matrix=fitz.Matrix(2.0, 2.0))
                    crop_filename = f"{prefix}_p{p_no+1}_diagram.png"
                    crop_path = os.path.join(DIAGRAMS_DIR, crop_filename)
                    pix.save(crop_path)
                    print(f"Saved diagram: {crop_filename} ({pix.width}x{pix.height})")

print("All question vector diagrams cropped successfully!")
