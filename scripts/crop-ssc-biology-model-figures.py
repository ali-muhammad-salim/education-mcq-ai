"""Render the individually reviewed figure regions from the Biology model PDFs."""
import json
from pathlib import Path

import pymupdf

root = Path(__file__).resolve().parents[1]
materials = root / 'public/materials/ssc/biology'
written = json.loads((root / 'data/biology/ssc_model_written.json').read_text(encoding='utf-8'))
mcqs = json.loads((root / 'data/biology/ssc_model_mcq_crops.json').read_text(encoding='utf-8'))
# These questions have a stimulus figure and a separate panel of options.
split_regions = {
    ('IX', 'i', '16'): [(115, 104, 332, 208), (68, 270, 570, 747)],
    ('X', 'i', '29'): [(68, 111, 505, 263), (68, 309, 505, 675)],
}

for grade, questions in written.items():
    written_crops = {row[0]: [row[1], *row[6]] for row in questions if len(row) == 7}
    for part, crops in [('i', mcqs[grade]), ('ii', written_crops)]:
        stem = f'biology-model-paper-{grade.lower()}-paper-{part}'
        with pymupdf.open(materials / f'{stem}.pdf') as paper:
            for number, (page, *coordinates) in crops.items():
                source = paper[page - 1]
                regions = [pymupdf.Rect(box) for box in split_regions.get((grade, part, number), [coordinates])]
                assert all(source.rect.contains(region) for region in regions), (grade, part, number)
                if len(regions) == 1:
                    pixmap = source.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=regions[0])
                else:
                    with pymupdf.open() as combined:
                        width = max(region.width for region in regions)
                        canvas = combined.new_page(width=width, height=sum(region.height for region in regions) + 8)
                        top = 0
                        for region in regions:
                            canvas.show_pdf_page(pymupdf.Rect(0, top, region.width, top + region.height), paper, page - 1, clip=region)
                            top += region.height + 8
                        pixmap = canvas.get_pixmap(matrix=pymupdf.Matrix(2, 2))
                pixmap.save(materials / f'{stem}-q{number}.png')
