"""Read-only comparison of bundled class outcomes with the complete source PDF.

Code coverage is necessary, not sufficient, for verbatim fidelity. Text differences
are reported separately for review; formulas may differ in extraction order.
"""
import json
import re
import unicodedata
from pathlib import Path
import pymupdf

root = Path(__file__).resolve().parents[1]
source = root / 'public/materials/ssc/physics/ssc-1/physics-ssc-full-syllabus-2025.pdf'
pdf = pymupdf.open(source)
pages = [page.get_text() for page in pdf]
normalize = lambda value: re.sub(r'\s+', '', unicodedata.normalize('NFKC', value)).lower()
whole_text = normalize('\n'.join(pages))
results = []
for grade, bundle in [(9, 'ssc1'), (10, 'ssc2')]:
    marker = 'Part I (Grade IX)' if grade == 9 else 'Part II (Grade X)'
    start = next(index for index, page in enumerate(pages) if marker in page)
    stop_marker = 'Part II (Grade X)' if grade == 9 else 'Practical Activities of AKU-EB'
    stop = next(index for index in range(start + 1, len(pages)) if stop_marker in pages[index])
    printed = set(re.findall(r'\b\d{1,2}\.\d{1,2}\.\d{1,2}\b', '\n'.join(pages[start:stop])))
    units = json.loads((root / f'data/physics/{bundle}_exact_syllabus.json').read_text(encoding='utf-8'))
    outcomes = [row for unit in units for topic in unit['subtopics'] for row in topic['slos']]
    digital = {row['code'] for row in outcomes}
    results.append({'grade': grade, 'sourcePages': [start + 1, stop], 'printedCount': len(printed), 'digitalCount': len(outcomes), 'missingCodes': sorted(printed - digital), 'extraCodes': sorted(digital - printed), 'textNeedingVisualReview': [row['code'] for row in outcomes if normalize(row['description']) not in whole_text]})
print(json.dumps({'source': str(source.relative_to(root)), 'checks': results}, indent=2))
if any(result['missingCodes'] or result['extraCodes'] or result['digitalCount'] != result['printedCount'] for result in results):
    raise SystemExit(1)
