"""
Stage 2 – PDF/Image Page Extraction and Rendering.

Responsibilities:
- Accept PDF, JPG, JPEG, PNG inputs
- Render every page to a PIL Image at the configured DPI
- For native-text PDFs: also extract the raw text layer from PyMuPDF
  (used later to skip OCR on clean pages)
- Return a list of PageImage objects (one per page)
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional
from collections.abc import Sequence
from itertools import islice

from PIL import Image


@dataclass
class PageImage:
    """Container for a single rendered page."""

    page_index: int          # 0-based
    page_number: int         # 1-based (= page_index + 1)
    image: Image.Image
    width: int
    height: int
    # Native text extracted by PyMuPDF (empty for pure-image pages)
    native_text: str = ""
    # True if PyMuPDF found embedded text (i.e. not a pure scan)
    has_native_text: bool = False
    image_path: Optional[str] = None   # path if image was saved to disk


class RenderedPages(Sequence):
    """Lazy page sequence: legacy orchestration must not render a book into RAM."""
    def __init__(self, file_path: Path, dpi: int = 150, save_dir: Optional[Path] = None):
        self.file_path, self.dpi, self.save_dir = file_path, dpi, save_dir
        if file_path.suffix.lower() == '.pdf':
            import fitz
            with fitz.open(str(file_path)) as doc:
                self.count = len(doc)
        else:
            self.count = 1

    def __len__(self):
        return self.count

    def __getitem__(self, index):
        if isinstance(index, slice):
            return islice(iter(self), *index.indices(self.count))
        if index < 0:
            index += self.count
        if not 0 <= index < self.count:
            raise IndexError(index)
        return next(islice(iter(self), index, index + 1))

    def __iter__(self):
        if self.file_path.suffix.lower() != '.pdf':
            yield from _extract_image(self.file_path, self.save_dir)
            return
        import fitz
        with fitz.open(str(self.file_path)) as doc:
            for index, page in enumerate(doc):
                scale = min(self.dpi / 72, 4096 / max(page.rect.width, page.rect.height))
                pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csRGB, alpha=False)
                image = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
                image_path = None
                if self.save_dir:
                    self.save_dir.mkdir(parents=True, exist_ok=True)
                    image_path = str(self.save_dir / f'page_{index + 1:04d}.png')
                    image.save(image_path, 'PNG')
                text = page.get_text('text').strip()
                yield PageImage(index, index + 1, image, image.width, image.height, text, len(text) > 10, image_path)


def extract_pages(
    file_path: Path,
    dpi: int = 150,
    save_dir: Optional[Path] = None,
) -> list[PageImage]:
    """
    Render every page of the document to a PIL Image.

    Parameters
    ----------
    file_path:
        Resolved path to the input file.
    dpi:
        Resolution for PDF rasterisation.  150 DPI is a good default;
        increase to 200 for small-print or dense formula pages.
    save_dir:
        If provided, each rendered page image is saved as a PNG here.

    Returns
    -------
    List of PageImage objects, ordered by page index.
    """
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        return _extract_pdf(file_path, dpi=dpi, save_dir=save_dir)
    elif suffix in (".jpg", ".jpeg", ".png"):
        return _extract_image(file_path, save_dir=save_dir)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


# ---------------------------------------------------------------------------
# PDF extraction via PyMuPDF
# ---------------------------------------------------------------------------

def _extract_pdf(
    file_path: Path,
    dpi: int,
    save_dir: Optional[Path],
) -> list[PageImage]:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise ImportError(
            "PyMuPDF is required for PDF extraction. "
            "Install it with: pip install pymupdf"
        ) from exc

    pages: list[PageImage] = []
    zoom = dpi / 72.0  # 72 dpi is PyMuPDF's internal default
    matrix = fitz.Matrix(zoom, zoom)

    with fitz.open(str(file_path)) as doc:
        for page_index in range(len(doc)):
            page = doc[page_index]

            # Render to pixmap
            pixmap = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB)
            img_bytes = pixmap.tobytes("png")
            pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")

            # Native text extraction
            native_text = page.get_text("text").strip()
            has_native = bool(native_text and len(native_text) > 10)

            image_path: Optional[str] = None
            if save_dir is not None:
                save_dir.mkdir(parents=True, exist_ok=True)
                img_file = save_dir / f"page_{page_index + 1:04d}.png"
                pil_image.save(str(img_file), "PNG")
                image_path = str(img_file)

            pages.append(
                PageImage(
                    page_index=page_index,
                    page_number=page_index + 1,
                    image=pil_image,
                    width=pil_image.width,
                    height=pil_image.height,
                    native_text=native_text,
                    has_native_text=has_native,
                    image_path=image_path,
                )
            )

    return pages


# ---------------------------------------------------------------------------
# Single-image extraction (JPG, PNG)
# ---------------------------------------------------------------------------

def _extract_image(
    file_path: Path,
    save_dir: Optional[Path],
) -> list[PageImage]:
    pil_image = Image.open(str(file_path)).convert("RGB")

    image_path: Optional[str] = None
    if save_dir is not None:
        save_dir.mkdir(parents=True, exist_ok=True)
        img_file = save_dir / "page_0001.png"
        pil_image.save(str(img_file), "PNG")
        image_path = str(img_file)

    return [
        PageImage(
            page_index=0,
            page_number=1,
            image=pil_image,
            width=pil_image.width,
            height=pil_image.height,
            native_text="",
            has_native_text=False,
            image_path=image_path,
        )
    ]
