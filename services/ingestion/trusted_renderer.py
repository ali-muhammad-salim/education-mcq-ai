"""Bounded PDF rendering only; no database writes and no model credentials.

Each invocation renders one page or one validated crop. stdout is machine JSON.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import pymupdf


def validate_box(box):
    if not isinstance(box, list) or len(box) != 4:
        raise ValueError("Expected [ymin,xmin,ymax,xmax]")
    if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not 0 <= x <= 1000 for x in box):
        raise ValueError("Crop coordinates must be finite and within 0..1000")
    y0, x0, y1, x1 = box
    if y1 - y0 < 5 or x1 - x0 < 5 or ((y1 - y0) > 980 and (x1 - x0) > 980):
        raise ValueError("Invalid, tiny or full-page crop")
    return box


def render(source, output, page_number=0, box=None):
    with pymupdf.open(source) as doc:
        if doc.needs_pass or not 0 < len(doc) <= 1000:
            raise ValueError("Choose an unencrypted PDF with 1..1000 pages")
        if not page_number:
            return {"totalPages": len(doc)}
        if not 1 <= page_number <= len(doc):
            raise ValueError("Page outside document")
        page = doc[page_number - 1]
        clip = None
        if box is not None:
            y0, x0, y1, x1 = validate_box(box)
            # Include a small label margin while staying inside the source page.
            rect = page.rect
            clip = pymupdf.Rect(max(rect.x0, rect.x0 + x0 / 1000 * rect.width - 4), max(rect.y0, rect.y0 + y0 / 1000 * rect.height - 4), min(rect.x1, rect.x0 + x1 / 1000 * rect.width + 4), min(rect.y1, rect.y0 + y1 / 1000 * rect.height + 4))
            # get_pixmap clips the displayed page; use the same rotated rect as
            # the preview, rather than text/annotation coordinates.
        area = clip or page.rect
        # Cap giant architectural/scanned pages before allocating a pixmap.
        if not all(math.isfinite(v) and v > 0 for v in (area.width, area.height)):
            raise ValueError("Invalid page dimensions")
        scale = min(200 / 72, 2600 / max(area.width, area.height))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), clip=clip, colorspace=pymupdf.csRGB, alpha=False)
        target = Path(output)
        target.parent.mkdir(parents=True, exist_ok=True)
        pix.save(str(target))
        return {"totalPages": len(doc), "pageNumber": page_number, "width": pix.width, "height": pix.height, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("output")
    parser.add_argument("--page", type=int, default=0)
    parser.add_argument("--box")
    args = parser.parse_args()
    print(json.dumps(render(args.source, args.output, args.page, json.loads(args.box) if args.box else None)))


if __name__ == "__main__":
    main()
