"""Extract the annual papers and transcribe the board's separate key and notes."""
import json
from pathlib import Path
import re
import runpy
import sys

import pymupdf

shared = runpy.run_path(str(Path(__file__).with_name('extract-hssc-physics-models.py')))
root, pdfs = shared['ROOT'], shared['PDFS']
data = root / 'data/physics'
year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
assert year in (2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025)
atp = year in (2021, 2022)
legacy = year <= 2019
overrides_file = data / f'hssc_xi_{year}_transcription_overrides.json'
overrides = json.loads(overrides_file.read_text(encoding='utf-8')) if overrides_file.exists() else {}
papers = {}
for part, roman in ([(1, 'i')] if atp else [(1, 'i'), (2, 'ii')]):
    code = f'PHY-XI-{year}-P{part}'
    with pymupdf.open(pdfs / f'physics-xi-{year}-paper-{roman}.pdf') as pdf:
        rows = shared['extract'](pdf, code, part, True, overrides)
        if year == 2017 and part == 1:
            # Q20 has a reference graph and four option graphs on opposite sides of its stem.
            question = rows[19]
            page = pdf[question['page'] - 1]
            x, y, *_ = next(w for w in page.get_text('words') if w[0] < 80 and w[4] == '20.')
            regions = [pymupdf.Rect(x - 5 + a / 1.75, y - 5 + b / 1.75,
                                    x - 5 + c / 1.75, y - 5 + d / 1.75)
                       for a, b, c, d in [(113, 36, 405, 231), (49, 312, 747, 722)]]
            with pymupdf.open() as figures:
                combined = figures.new_page(width=max(r.width for r in regions), height=sum(r.height for r in regions) + 10)
                top = 0
                for region in regions:
                    combined.show_pdf_page(pymupdf.Rect(0, top, region.width, top + region.height), pdf, page.number, clip=region)
                    top += region.height + 10
                combined.get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(shared['CROPS'] / code / 'diagram-20.png')
        if part == 1 and year == 2025:
            # The printed graph follows Q9 and is required by both Q10 and Q11.
            pdf[3].get_pixmap(clip=pymupdf.Rect(70, 236, 295, 390), matrix=pymupdf.Matrix(2, 2)).save(
                shared['CROPS'] / code / 'shared-velocity.png')
        if year == 2022:
            for page_index, question, bounds, asset in [
                (4, '13.', (50, 266, 393, 464), 'shared-velocity'),
                (11, '47.', (52, 430, 357, 673), 'shared-pv'),
            ]:
                page = pdf[page_index]
                x, y, *_ = next(w for w in page.get_text('words') if w[0] < 80 and w[4] == question)
                x0, y0, x1, y1 = bounds
                rect = pymupdf.Rect(x - 5 + x0 / 1.75, y - 5 + y0 / 1.75, x - 5 + x1 / 1.75, y - 5 + y1 / 1.75)
                page.get_pixmap(clip=rect, matrix=pymupdf.Matrix(2, 2)).save(shared['CROPS'] / code / (asset + '.png'))
    if legacy:
        count, marks = {
            2017: ((30, 30), (16, 55)),
            2018: ((30, 30), (15, 55)),
            2019: ((35, 35), (13, 50)),
        }[year][part - 1]
    else:
        count, marks = (65, 65) if atp else (50, 50) if part == 1 else (10, 35)
    assert len(rows) == count, (code, len(rows))
    assert sum(row['marks'] for row in rows) == marks, (code, [row['marks'] for row in rows])
    papers[code] = rows

with pymupdf.open(pdfs / f'physics-xi-{year}-key.pdf') as pdf:
    if atp:
        text = ' '.join(page.get_text() for page in pdf)
        rows = re.findall(r'\b(\d{1,2})\s+(\d+\.\d+\.\d+)\s+([A-D*])\s+(?:([A-D])\s+)?N\s+([1-])\s+([1-])\s+([1-])(?=\s|$)', text)
        keys = []
        for n, slo, answer, alternate, *levels in rows:
            assert levels.count('1') == 1, (n, levels)
            keys.append({'number': int(n), 'originalSlo': slo, 'answer': answer, 'alternate': alternate or None, 'level': 'KUA'[levels.index('1')]})
    elif legacy:
        keys = [{'number': int(n), 'answer': answer, 'level': level}
                for n, answer, level in re.findall(r'\b(\d{1,2})\s+([A-D*])\s+([KUA])\b', pdf[0].get_text())]
    else:
        keys = [{'number': int(n), 'originalSlo': slo, 'answer': answer, 'level': level}
                for n, slo, answer, level in re.findall(r'\b(\d{1,2})\s+(\d+\.\d+\.\d+)\s+([A-D*])\s+([KUA])\b', pdf[0].get_text())]
assert [row['number'] for row in keys] == list(range(1, len(papers[f'PHY-XI-{year}-P1']) + 1))

if atp:
    (data / f'hssc_xi_{year}_papers.json').write_text(
        json.dumps({'papers': papers, 'key': keys, 'notes': {}}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    sys.exit(0)

notes = {}
with pymupdf.open(pdfs / f'physics-xi-{year}-emarking.pdf') as pdf:
    for page in pdf:
        t = ' '.join(page.get_text().split())
        if legacy:
            for question in re.findall(r'\bQuestion\s+(\d+[ab]?)(?=\s*:|\s+i\.|\s+Suppose|\s+A source)', t):
                notes[question] = {'page': page.number + 1}
            continue
        m = re.search(r'Question No\.\s*(\d+[ab]?)\b.*?SLO No\.\s*(\d+\.\d+\.\d+)\s+SLO Text\s+(.*?)\s+Max Marks\s+(\d+)\s+Cognitive Level\s+\*?([KUA])', t)
        if m:
            q, slo, desc, marks, level = m.groups()
            notes[q] = {'page': page.number + 1, 'originalSlo': slo, 'originalText': desc, 'marks': int(marks), 'level': level}
    examples = {
        '1': (2, 0, 3, 0), '2': (4, 0, 4, 1), '3': (5, 0, 6, 0), '4': (7, 0, 7, 1),
        '5': (9, 0, 9, 1), '6': (10, 0, 10, 1), '7': (12, 0, 12, 1), '8': (14, 0, 14, 1),
        '9a': (16, 0, 17, 0), '9b': (18, 0, 19, 0), '10a': (21, 0, 21, 1), '10b': (23, 0, 23, 1),
    }
    if year == 2023:
        examples = {
            '1': (2, 1, 3, 0), '2': (5, 0, 5, 1), '3': (7, 0, 8, 0), '4': (9, 1, 10, 0),
            '5': (11, 1, 12, 0), '6': (13, 0, 13, 1), '7': (15, 0, 15, 1), '8': (17, 0, 17, 1),
            '9a': (18, 0, 19, 0), '9b': (20, 0, 21, 0), '10a': (23, 0, 23, 1), '10b': (25, 0, 26, 0),
        }
    if year == 2024:
        examples = {
            '1': (2, 0, 3, 0), '2': (4, 0, 4, 1), '3': (6, 0, 6, 1), '4': (7, 0, 8, 0),
            '5': (9, 0, 9, 1), '6': (10, 0, 11, 0), '7': (12, 0, 12, 1), '8': (13, 0, 14, 0),
            '9a': (15, 0, 16, 0), '9b': (17, 0, 18, 0), '10a': (19, 0, 20, 0), '10b': (21, 0, 22, 0),
        }
    if year == 2019:
        examples = {
            '1': (2, 0, 2, 1), '2': (3, 0, 4, 0), '3': (4, 1, 5, 0),
            '4': (6, 0, 6, 1), '5': (7, 0, 7, 1), '6': (8, 0, 9, 0),
            '7': (9, 1, 10, 0), '8': (11, 0, 11, 1), '9': (12, 0, 12, 1),
            '10': (13, 0, 13, 1), '11': (14, 1, 15, 0),
            '12a': (16, 0, 17, 0), '12b': (18, 0, 19, 0),
            '13a': (20, 0, 20, 1), '13b': (21, 0, 22, 0),
        }
    if year == 2018:
        examples = {
            '1': (2, 0, 2, 1), '2': (3, 0, 3, 1), '3': (4, 0, 5, 0),
            '4': (6, 0, 6, 1), '5': (7, 0, 7, 1), '6': (8, 0, 8, 1),
            '7': (9, 1, 10, 0), '8': (10, 2, 11, 0), '9': (11, 1, 11, 2),
            '10': (12, 0, 12, 1), '11': (13, 1, 14, 0), '12': (14, 1, 15, 0),
            '13a': (16, 0, 17, 0), '13b': (18, 0, 19, 0),
            '14a': (20, 0, 21, 0), '14b': (23, slice(0, 2), 24, slice(0, 2)),
            '15a': (26, slice(0, 2), 27, slice(0, 3)), '15b': (29, slice(0, 2), 30, slice(0, 2)),
        }
    if year == 2017:
        examples = {
            '1': (2, 0, 3, 0), '2': (3, 1, 4, 0), '3': (4, 1, 5, 0),
            '4': (5, 1, 6, 0), '5': (7, 0, 7, 1), '6': (8, 0, 8, 1),
            '7': (9, 1, 10, 0), '8': (11, 0, 12, 0), '9': (13, 0, 14, 0),
            '10': (15, 0, 15, 1), '11': (16, 1, 17, 0), '12': (18, 0, 18, 1),
            '13': (19, 0, 19, 1), '14a': (21, 0, 22, 0), '14b': (23, 0, 24, 0),
            '15a': (25, 0, 26, 0), '15b': (28, 0, 29, 0),
            '16a': (31, slice(0, 2), 32, 0), '16b': (33, slice(0, 2), 34, 0),
        }
    folder = shared['CROPS'] / f'PHY-XI-{year}-EMARKING'
    folder.mkdir(parents=True, exist_ok=True)
    for question, (better_page, better_index, weaker_page, weaker_index) in examples.items():
        for kind, number, index in [('better', better_page, better_index), ('weaker', weaker_page, weaker_index)]:
            page = pdf[number - 1]
            boxes = sorted((img['bbox'] for img in page.get_image_info() if img['bbox'][2] - img['bbox'][0] > 120), key=lambda box: box[1])
            filename = f'{question}-{kind}.png'
            clip = pymupdf.Rect()
            for box in boxes[index] if isinstance(index, slice) else [boxes[index]]:
                clip |= pymupdf.Rect(box)
            page.get_pixmap(clip=clip, matrix=pymupdf.Matrix(1.7, 1.7)).save(folder / filename)
            notes[question][kind] = f'/paper-crops/{folder.name}/{filename}'
assert list(notes) == list(examples), (year, list(notes))

(data / f'hssc_xi_{year}_papers.json').write_text(json.dumps({'papers': papers, 'key': keys, 'notes': notes}, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
