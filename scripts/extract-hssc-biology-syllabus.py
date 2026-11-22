"""Extract the outcome tables from the supplied 2025 AKU-EB Biology PDF."""
import argparse
from itertools import groupby
import json
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
CODE = re.compile(r'\d+\.\d+\.\d+')
HEADING = re.compile(r'\d+\.(?:\d+)?')
MARK = re.compile(r'\*|FA[²24]?|An|[ACE]')


def text(page, x0, y0, x1, y1):
    rect = pymupdf.Rect(x0, y0, x1, y1)
    return page.get_text(clip=rect, sort=True).strip()


def join_outcome(raw):
    result = ''
    for line in raw.splitlines():
        line = ' '.join(line.split()).replace('\uf0b7', '•')
        if line:
            result += ('\n' if re.match(r'^(?:[a-z]\.\s|•)', line) else ' ') + line
    return result.strip()


def text_rows(page, x0, x1, start, end):
    clip = pymupdf.Rect(x0, 0, x1, page.rect.height)
    lines = [line for block in page.get_text('dict', clip=clip)['blocks']
             for line in block.get('lines', []) if line['spans']]
    segments = sorted((line['spans'][0]['origin'][1], line['bbox'][0],
                       ''.join(span['text'] for span in line['spans']))
                      for line in lines if start <= line['spans'][0]['origin'][1] < end)
    return '\n'.join(' '.join(segment[2] for segment in row)
                     for _, row in groupby(segments, key=lambda segment: round(segment[0], 1)))


def extract(pdf, first, last):
    units = []
    topics = {}
    for number in range(first, last + 1):
        page = pdf[number - 1]
        words = page.get_text('words')
        codes = sorted((w for w in words if 290 < w[0] < 345 and CODE.fullmatch(w[4])), key=lambda w: w[1])
        headings = sorted((w for w in words if 65 < w[0] < 115 and HEADING.fullmatch(w[4])), key=lambda w: w[1])
        marks = [w for w in words if w[0] > 665 and MARK.fullmatch(w[4]) and w[1] >= codes[0][1] - 2]
        bottom = min([493.2] + [w[1] for w in words if w[0] < 90 and re.match(r'^[123]R$', w[4])])
        for index, (_, y, right, _, label, *_) in enumerate(headings):
            end = headings[index + 1][1] - 2 if index + 1 < len(headings) else bottom
            name = ' '.join(text(page, right + 0.15, y - 2, 290, end).split())
            assert name, (number, label)
            if label.endswith('.'):
                units.append({'unitNumber': int(label[:-1]), 'name': name, 'subtopics': []})
            else:
                topic = {'subtopicNumber': label, 'name': f'{label} {name}', 'slos': []}
                topics[label] = topic
                units[-1]['subtopics'].append(topic)
        used_marks = set()
        for index, (_, y, right, _, code, *_) in enumerate(codes):
            end = codes[index + 1][1] + 6 if index + 1 < len(codes) else bottom
            body = join_outcome(text_rows(page, right + 1, 665, y + 6, end))
            mark = min(marks, key=lambda w: abs(w[1] - y))
            assert abs(mark[1] - y) < 7 and mark not in used_marks, (number, code, mark)
            used_marks.add(mark)
            level = ('R' if mark[0] < 700 else 'U') if mark[4] == '*' else mark[4].rstrip('²24')
            assert body and not re.search(r'[\ue000-\uf8ff\ufffd]', body), (number, code, body)
            topics[code.rsplit('.', 1)[0]]['slos'].append({
                'code': code, 'description': body, 'cognitiveLevel': level, 'sourcePage': number,
            })
    if first == 57:
        # On p. 66, the code column advances before the wrapped description.
        fifth, sixth, seventh = topics['17.4']['slos'][4:7]
        assert fifth['description'].endswith(' and') and sixth['description'] == 'neurotransmitter;'
        fifth['description'] += ' ' + sixth['description']
        sixth['description'], remainder = seventh['description'].split('; ', 1)
        sixth['description'] += ';'
        seventh['description'] = remainder
    return units


def practicals(pdf, first, last, columns):
    activities = []
    for page_number, (activity_x, apparatus_x, chemicals_x) in zip(range(first, last + 1), columns, strict=True):
        page = pdf[page_number - 1]
        table = page.find_tables().tables[0]
        hints = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                label = ''.join(span['text'] for span in line['spans']).strip()
                if match := re.match(r'Topic (\d+): (.+)', label):
                    chapter = 12 if match[2] == 'Gaseous Exchange' else int(match[1])
                    hints.append((line['bbox'][1], chapter))
        numbers = sorted((word for word in page.get_text('words') if word[0] < activity_x
                          and re.fullmatch(r'\d+\.', word[4])), key=lambda word: word[1])
        for slot, (_, y, _, _, label, *_) in enumerate(numbers):
            end = min([500] + [heading_y for heading_y, _ in hints if heading_y > y]
                      + [word[1] for word in numbers[slot + 1:slot + 2]])
            chapter = next((chapter for heading_y, chapter in reversed(hints) if heading_y < y),
                           activities[-1]['chapter'] if activities else None)
            cells = [cell for cell in table.cells if cell[1] <= y + 1 < cell[3]]
            def material(column):
                cell = next((cell for cell in cells if abs(cell[0] - column) < 0.4), None)
                return ' '.join(page.get_text(clip=pymupdf.Rect(cell)).split()) if cell else ''
            activity = ' '.join(text_rows(page, activity_x, apparatus_x, y + 6, end + 6).split())
            assert chapter and activity, (page_number, label)
            activities.append({'number': int(label[:-1]), 'chapter': chapter, 'activity': activity,
                               'apparatus': material(apparatus_x), 'chemicals': material(chemicals_x)})
    assert [item['number'] for item in activities] == list(range(1, len(activities) + 1))
    return activities


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    args = parser.parse_args()
    with pymupdf.open(args.pdf) as pdf:
        data = {
            11: {'units': extract(pdf, 10, 56), 'practicals': practicals(pdf, 93, 97,
                 [(126.8, 339.3, 552.0), (127.1, 340.3, 552.7), (127.4, 340.0, 552.6),
                  (125.3, 341.6, 553.0), (121.5, 342.5, 547.3)])},
            12: {'units': extract(pdf, 57, 91), 'practicals': practicals(pdf, 98, 100,
                 [(141.1, 346.7, 559.4), (140.9, 346.5, 560.0), (140.9, 346.5, 560.7)])},
        }
    for grade, payload in data.items():
        units = payload['units']
        outcomes = [outcome for unit in units for topic in unit['subtopics'] for outcome in topic['slos']]
        assert len({outcome['code'] for outcome in outcomes}) == len(outcomes)
        print(grade, len(units), len(outcomes))
    target = ROOT / 'data/biology/hssc_syllabus_2025.json'
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
