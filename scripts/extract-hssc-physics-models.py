"""Build structured question records and source crops for the HSSC model papers."""
from pathlib import Path
import json
import re
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDFS = ROOT / 'public/materials/hssc/physics'
CROPS = ROOT / 'public/paper-crops'
OVERRIDES = json.loads((ROOT / 'data/physics/hssc_model_transcription_overrides.json').read_text(encoding='utf-8'))


def lines(page):
    for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)['blocks']:
        for line in block.get('lines', []):
            if line['dir'] == (1, 0):
                text = ''.join(s['text'] for s in line['spans']).strip()
                if text and not re.fullmatch(r'[_\s]+', text):
                    yield (*line['bbox'], text)


def mcq_text(text):
    superscript = str.maketrans('0123456789–−-', '⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁻⁻')
    text = re.sub(r'[×x][ \t]*10([–−-]?[0-9]+)\b', lambda m: '× 10' + m[1].translate(superscript), text)
    text = re.sub(r'(?<=\d)o\b', '°', text)
    return re.sub(r'(?<=[0-9⁰¹²³⁴⁵⁶⁷⁸⁹] )(m/s2|m2|s[–−-]1)\b', lambda m: m[1].translate(superscript), text)


def extract(pdf, code, part, render, overrides=OVERRIDES):
    result = []
    for page in list(pdf)[1:]:
        words = page.get_text('words')
        marker = r'(\d{1,2})\.' if part == 1 else r'Q\.(\d{1,2})\.'
        starts = sorted((w for w in words if 30 < w[0] < 80 and 85 < w[1] < 750 and re.fullmatch(marker, w[4])), key=lambda w: w[1])
        if not starts:
            continue
        page_lines = list(lines(page))
        footer = min((l[1] for l in page_lines if re.match(r'PLEASE TURN OVER|END OF PAPER|Physics Model Paper', l[4], re.I) and l[1] > 630), default=782)
        for i, start in enumerate(starts):
            number = int(re.fullmatch(marker, start[4])[1])
            assert number == len(result) + 1, (code, page.number, number)
            top, left = start[1], start[0]
            override = overrides.get(code, {}).get(str(number), {})
            bottom = override.get('bottom', starts[i + 1][1] - 4 if i + 1 < len(starts) else footer - 4)
            region = [l for l in page_lines if top - 7 < l[1] < bottom and l[0] >= left - 1]
            choices, stem, active = {}, [], None
            marks = 1
            for x, _, _, _, text in region:
                if text.startswith(start[4]):
                    text = text[len(start[4]):].strip()
                if not text:
                    continue
                mark = re.fullmatch(r'\(Total (\d+) Marks?\)', text, re.I)
                if mark:
                    marks = int(mark[1])
                    continue
                choice = re.match(r'^([ABCD])\.?\s*(.*)$', text) if part == 1 and left+24 < x < left+39 else None
                if choice and (text == choice[1] or text.startswith(choice[1]+'.')):
                    active = choice[1]
                    choices[active] = choice[2]
                elif active:
                    choices[active] = (choices[active] + ' ' + text).strip()
                else:
                    stem.append(text)
            right = override.get('right', page.rect.width - ((20 if left > 60 else 40) if part == 2 else (34 if left > 60 else 61)))
            crop_url = f'/paper-crops/{code}/q{number}.png'
            diagram = override.get('diagram')
            second_diagram = None
            if 'figure' in override:
                diagram = f'/paper-crops/{code}/diagram-{number}.png'
            if 'secondFigure' in override:
                second_diagram = f'/paper-crops/{code}/diagram-{number}-b.png'
            if render:
                folder = CROPS / code
                folder.mkdir(parents=True, exist_ok=True)
                scale = 1.75
                clip = pymupdf.Rect(left - 5, top - 5, right, bottom)
                page.get_pixmap(clip=clip, matrix=pymupdf.Matrix(scale, scale), alpha=False).save(folder / f'q{number}.png')
                for field, suffix in [('figure', ''), ('secondFigure', '-b')]:
                    if field in override:
                        x0, y0, x1, y1 = override[field]
                        figure = pymupdf.Rect(clip.x0+x0/scale, clip.y0+y0/scale, clip.x0+x1/scale, clip.y0+y1/scale)
                        page.get_pixmap(clip=figure, matrix=pymupdf.Matrix(2, 2), alpha=False).save(folder / f'diagram-{number}{suffix}.png')
            stem = override.get('stem', '\n'.join(stem)).replace('\uf0ae', '→')
            choices = {k: v.replace('\uf0ae', '→') for k,v in override.get('choices', choices).items()}
            if part == 1:
                assert set(choices) == set('ABCD') and all(choices.values()), (code, number, choices)
                if 'stem' not in override:
                    stem = mcq_text(stem)
                if 'choices' not in override:
                    choices = {k: mcq_text(v) for k,v in choices.items()}
                if code == 'PHY-XII-P1' and number == 46:
                    choices['B'] = choices['B'].replace('102 m', '10² m')
            result.append(dict(number=number,page=page.number+1,marks=marks,stem=stem,choices=choices,facsimile=crop_url,diagram=diagram))
            if second_diagram:
                result[-1]['secondDiagram'] = second_diagram
    return result


if __name__ == '__main__':
    import sys
    render = '--render' in sys.argv
    data = {}
    for roman in ['XI','XII']:
        for part, suffix in [(1,'i'),(2,'ii')]:
            code = f'PHY-{roman}-P{part}'
            with pymupdf.open(PDFS / f'physics-model-paper-{roman.lower()}-paper-{suffix}.pdf') as pdf:
                rows=extract(pdf, code, part, render)
                assert len(rows) == (50 if part==1 else 12 if roman=='XI' else 11)
                data[code] = rows
    (ROOT/'data/physics/hssc_model_questions.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
