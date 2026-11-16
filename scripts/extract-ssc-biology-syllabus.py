"""Extract the grade-specific SLOs from the bundled AKU-EB Biology syllabus."""
import json
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / 'public/materials/ssc/biology/biology-ssc-syllabus-2025.pdf'


def extract(pdf, first, last):
    units = []
    for number in range(first, last + 1):
        page = pdf[number - 1]
        words = page.get_text('words')
        codes = sorted((w for w in words if 290 < w[0] < 345 and re.fullmatch(r'\d+\.\d+\.\d+', w[4])), key=lambda w: w[1])
        headings = sorted((w for w in words if 65 < w[0] < 115 and re.fullmatch(r'\d+\.(?:\d+)?', w[4])), key=lambda w: w[1])
        marks = [w for w in words if w[0] > 655 and re.fullmatch(r'\*|FA[²2]?|An|[ACE]', w[4])]
        bottom = page.find_tables().tables[0].bbox[3]
        lines = [(line['bbox'], ''.join(span['text'] for span in line['spans']).strip())
                 for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])
                 if line['dir'] == (1, 0)]
        bottom = min([bottom] + [box[1] for box, line in lines
                                if line.startswith(('FA=', '²FA=', '1R =', 'R = Remember'))])
        for index, heading in enumerate(headings):
            x, y, right, _, label, *_ = heading
            end = headings[index + 1][1] - 1 if index + 1 < len(headings) else bottom
            name = ' '.join(page.get_text(clip=pymupdf.Rect(right + 0.2 if label.endswith('.') else x, y - 1, 300, end)).split())
            if label.endswith('.'):
                if label == '13.':
                    name = 'Coordination and Control'
                unit = {'unitNumber': int(label[:-1]), 'name': name, 'subtopics': []}
                units.append(unit)
            else:
                subtopic = {'subtopicNumber': label, 'name': label + ' ' + name.removeprefix(label).strip(), 'slos': []}
                unit['subtopics'].append(subtopic)
        for index, code_word in enumerate(codes):
            _, top, _, _, code, *_ = code_word
            topic = next(t for t in unit['subtopics'] if t['subtopicNumber'] == code.rsplit('.', 1)[0])
            end = codes[index + 1][1] - 1 if index + 1 < len(codes) else bottom
            segments = sorted((box[1], box[0], line.removeprefix(code + ' ').strip()) for box, line in lines
                              if top - 1 <= box[1] < end and line
                              and (335 < box[0] < 660 or (290 < box[0] < 335 and line.startswith(code + ' '))))
            body = ''.join(('\n' if re.match(r'^(?:[a-z]\.\s|[\uf0b7•])', line) else ' ') + ' '.join(line.split()) for _, _, line in segments).strip().replace('\uf0b7', '•')
            hit = [m for m in marks if abs(m[1] - top) < 5]
            # These three marks are offset by one line in the printed table.
            offsets = {'8.4.10': 'U', '8.4.13': 'U', '16.4.3': 'A'}
            if code in offsets:
                level = offsets[code]
            else:
                assert len(hit) == 1, (number, code, hit)
                mark = hit[0]
                level = ('R' if mark[0] < 690 else 'U') if mark[4] == '*' else mark[4].rstrip('²2')
            assert body and not re.search(r'[\ue000-\uf8ff\ufffd]', body), (number, code, body)
            topic['slos'].append({'code': code, 'description': body, 'cognitiveLevel': level, 'sourcePage': number})
    return units


if __name__ == '__main__':
    result = {}
    with pymupdf.open(PDF) as pdf:
        for grade, first, last, expected in [(9, 10, 36, list(range(1, 10))), (10, 37, 58, list(range(10, 20)))]:
            units = extract(pdf, first, last)
            codes = [slo['code'] for unit in units for topic in unit['subtopics'] for slo in topic['slos']]
            assert [unit['unitNumber'] for unit in units] == expected
            # The official PDF prints two different outcomes as 16.2.4.
            assert len(codes) - len(set(codes)) == (1 if grade == 10 else 0)
            assert codes.count('16.2.4') == (2 if grade == 10 else 0)
            result[grade] = units
            print(grade, len(units), len(codes))
    target = ROOT / 'data/biology/ssc_syllabus_2025.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
