"""Prepare four AKU-EB Biology model papers supplied as original PDFs."""
import argparse
from itertools import groupby
import json
from pathlib import Path
import re
import shutil

from PIL import Image, ImageChops
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public/materials/hssc/biology'
FIGURES = PUBLIC / 'model-paper-questions'
OPTION = re.compile(r'^([A-D])(?:\.\s*|\s+(?=\d+$))(.*)')

# Vertical bounds in PDF points, checked against the printed figure labels.
FIGURES_BY_QUESTION = {
    ('XI', 1): {1: [(108, 233)], 5: [(515, 660)], 10: [(578, 718)],
                11: [(122, 262)], 13: [(399, 508)], 15: [(149, 309)], 17: [(640, 789)],
                30: [(582, 657)], 35: [(134, 411)],
                36: [(528, 553)], 37: [(111, 177)], 38: [(283, 431)], 40: [(110, 265)],
                41: [(457, 608)], 44: [(229, 358)], 48: [(216, 385)]},
    ('XII', 1): {10: [(445, 592)], 11: [(109, 248)], 12: [(418, 612)], 18: [(244, 332)],
                 22: [(321, 458)], 23: [(507, 593)], 24: [(164, 382)], 32: [(308, 489)],
                 35: [(204, 231)], 36: [(351, 498)], 41: [(111, 350)], 42: [(467, 615)],
                 45: [(349, 589)]},
    ('XI', 2): {1: [(134, 414), (603, 648)], 5: [(365, 563)], 6: [(150, 336)],
                7: [(145, 388)], 8: [(170, 350)], 9: [(262, 457)]},
    ('XII', 2): {1: [(135, 359)], 3: [(367, 487)], 4: [(135, 247)], 7: [(381, 527)],
                 10: [(169, 375), (468, 657)]},
}

# The printed options in these questions are four separate drawings.
# Record the full option region for text extraction and crop each drawing above its letter.
ILLUSTRATED_CHOICES = {
    ('XI', 1, 4): ((112, 488), [(137, 123, 250, 215), (325, 121, 442, 245),
                               (137, 305, 250, 415), (325, 281, 442, 449)]),
    ('XI', 1, 20): ((298, 553), [(108, 329, 270, 390), (340, 327, 499, 386),
                                (104, 447, 314, 504), (351, 429, 537, 523)]),
    ('XI', 1, 25): ((419, 689), [(110, 449, 255, 524), (308, 431, 427, 528),
                                (137, 561, 200, 665), (322, 566, 437, 666)]),
}

# Other printed choices are labels on a single figure and share its legend or axes.
LABEL_CHOICES = {
    ('XI', 1, 10): 'Cell',
    ('XI', 1, 11): 'Label',
    ('XI', 1, 15): 'Point',
    ('XI', 1, 17): 'Label',
    ('XI', 1, 41): 'Label',
    ('XII', 1, 22): 'Label',
    ('XII', 1, 45): 'Food chain',
}


def table(headers, rows):
    return '\n'.join('| ' + ' | '.join(row) + ' |' for row in [headers, ['---'] * len(headers), *rows])


def choices_table(headers, rows):
    return table(['Option', *headers], [[letter, *row.split(';')] for letter, row in zip('ABCD', rows, strict=True)])


TABLES = {
    ('XI', 1): {
        1: [(276, 399, choices_table(['Type of secondary structure', 'Type of bond'], ['β-sheet;hydrogen', 'α-helix;hydrogen', 'β-sheet;ionic', 'α-helix;ionic']))],
        16: [(345, 509, 'Classification of Selected Mammals\n\n' + table(['Rank', 'Mammal 1', 'Mammal 2', 'Mammal 3', 'Mammal 4'], [
            ['Kingdom', *(['Animalia'] * 4)], ['Phylum', *(['Chordata'] * 4)], ['Class', *(['Mammalia'] * 4)],
            ['Order', 'Cetacea', 'Carnivora', 'Carnivora', 'Carnivora'], ['Family', 'Mysticeti', 'Felidae', 'Canidae', 'Canidae'],
            ['Genus', 'Balenopora', 'Felis', 'Canis', 'Canis'], ['Species', 'B. physalis', 'F. catus', 'C. latrans', 'C. lupus'],
            ['Common Name', 'Blue whale', 'Domestic cat', 'Coyote', 'Wolf']]))],
        21: [(592, 699, choices_table(['Outer membrane', 'Peptidoglycan layer'], ['absent;present', 'present;absent', 'absent;absent', 'present;present']))],
        33: [(348, 452, choices_table(['Utilisation of ATP', 'Production of NADH'], ['Yes;Yes', 'No;Yes', 'Yes;No', 'No;No']))],
        38: [(474, 587, choices_table(['Net movement of water', 'Water potential of cell', 'Effect of solution on cell'], ['into cell;becomes higher;becomes turgid', 'into cell;becomes lower;bursts', 'out of cell;becomes higher;swells', 'out of cell;becomes lower;becomes plasmolysed']))],
        39: [(640, 748, choices_table(['Ventricles', 'Atrioventricular valves', 'Semilunar valves'], ['relaxed;opened;opened', 'relaxed;opened;closed', 'contracted;closed;closed', 'contracted;closed;opened']))],
        40: [(302, 426, choices_table(['X', 'Y', 'Z'], ['Adhesion;Strong xylem wall;Cohesion', 'Adhesion;Strong phloem wall;Cohesion', 'Cohesion;Strong xylem wall;Adhesion', 'Cohesion;Strong phloem wall;Adhesion']))],
        44: [(395, 531, choices_table(['Condition I: K⁺ ion concentration', 'Condition I: water concentration', 'Condition II: K⁺ ion concentration', 'Condition II: water concentration'], ['High;High;Low;Low', 'Low;Low;High;High', 'Low;High;High;Low', 'High;Low;Low;High']))],
        48: [(426, 542, choices_table(['M', 'N'], ['Alveoli;Atmosphere', 'Alveoli;Body cells', 'Body cells;Atmosphere', 'Body cells;Alveoli']))],
    },
    ('XII', 1): {
        2: [(252, 363, choices_table(['X', 'Y'], ['Efferent arterioles;Proximal convoluted tubules', 'Afferent arterioles;Proximal convoluted tubules', 'Efferent arterioles;Loop of Henle', 'Afferent arterioles;Loop of Henle']))],
        4: [(545, 663, choices_table(['Osmolarity of fluid in peritubular capillaries', 'Volume of urine'], ['Decreases;Decreases', 'Increases;Increases', 'Increases;Decreases', 'Decreases;Increases']))],
        5: [(120, 278, 'Urine report\n\n' + table(['Test', 'Result', 'Reference range'], [['Colour', 'Yellow', 'Yellow'], ['Appearance', 'Clear', 'Clear'], ['pH', '6.0', '4.5–8.0'], ['Protein', 'Negative', 'Negative'], ['Glucose', 'Positive', 'Negative'], ['Red blood cells', 'Negative', 'Negative']]) + '\n\nBlood sugar report\n\n' + table(['Test', 'Result', 'Reference range'], [['Fasting blood glucose', '90 mg/dL', '70–99 mg/dL']]))],
        9: [(294, 402, choices_table(['Direction of synthesis', 'Daughter strand'], ['away from the replication fork;lagging', 'towards the replication fork;leading', 'away from the replication fork;leading', 'towards the replication fork;lagging']))],
        11: [(286, 389, choices_table(['X', 'Y', 'Z'], ['mRNA transcript;template strand;non-template strand', 'unwound DNA;template strand;non-template strand', 'mRNA transcript;non-template strand;template strand', 'unwound DNA;non-template strand;template strand']))],
        18: [(370, 480, choices_table(['X', 'Y', 'Z'], ['Hydrostatic;Endoskeleton;Exoskeleton', 'Hydrostatic;Exoskeleton;Endoskeleton', 'Endoskeleton;Hydrostatic;Exoskeleton', 'Exoskeleton;Hydrostatic;Endoskeleton']))],
        19: [(560, 673, choices_table(['Agonist', 'Antagonist'], ['quadriceps femoris;hamstrings', 'hamstrings;quadriceps femoris', 'patellar tendon;quadriceps tendon', 'quadriceps tendon;patellar tendon']))],
        24: [(431, 534, choices_table(['First messenger', 'Second messenger'], ['epinephrine;adenylate cyclase', 'G protein;adenylate cyclase', 'epinephrine;cAMP', 'G protein;cAMP']))],
        29: [(437, 546, choices_table(['Genotype of mother', 'Genotype of father'], ['carrier;normal', 'haemophiliac;normal', 'carrier;haemophiliac', 'normal;haemophiliac']))],
        32: [(526, 637, choices_table(['Agouti rat', 'White rat'], ['PP;pp', 'Pp;pp', 'pp;PP', 'pp;Pp']))],
        36: [(540, 646, choices_table(['I', 'II', 'III'], ['area opaca;area pellucida;primitive streak', 'area pellucida;area opaca;Hensen’s node', 'epiblast;hypoblast;notochord', 'hypoblast;epiblast;mesoderm']))],
        37: [(134, 242, choices_table(['Mitosis', 'Meiosis I', 'Meiosis II'], ['Sister chromatids;Sister chromatids;Homologous chromosomes', 'Homologous chromosomes;Homologous chromosomes;Sister chromatids', 'Sister chromatids;Homologous chromosomes;Sister chromatids', 'Homologous chromosomes;Sister chromatids;Homologous chromosomes']))],
        39: [(416, 557, table(['Stage of mitosis', 'Number of cells'], [['Interphase', '305'], ['Prophase', '65'], ['Metaphase', '20'], ['Anaphase', '12'], ['Telophase', '8'], ['Total cells', '410']]))],
        42: [(666, 779, choices_table(['Internal bone structure', 'Type of evolution'], ['analogous;convergent', 'analogous;divergent', 'homologous;divergent', 'homologous;convergent']))],
    },
    ('XI', 2): {3: [(455, 662, table(['S. No.', 'Sporophyte of Psilopsida', 'Sporophyte of Lycopsida'], [[str(i), '', ''] for i in range(1, 4)]))]},
    ('XII', 2): {
        2: [(145, 310, table(['Type of animal', 'Source of nourishment'], [['Oviparous', ''], ['Viviparous', '']]))],
        4: [(276, 421, table(['Metaphase (mitosis)', 'Anaphase (mitosis)', 'Metaphase I (meiosis)'], [['', '', '']]))],
    },
}


def lines(page):
    return sorted((line['spans'][0]['origin'][1], line['bbox'][0], ''.join(s['text'] for s in line['spans']).strip())
                  for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])
                  if line['dir'] == (1, 0) and line['spans'])


def line_text(rows):
    return [' '.join(value for _, _, value in row if value)
            for _, row in groupby(rows, key=lambda line: round(line[0], 1))]


def excerpt(page, region, filename):
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=region, alpha=False)
    image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
    gray = image.convert('L')
    lx, rx = 0, image.width
    for column in range(12):
        if sum(value < 120 for value in gray.crop((column, 0, column + 1, image.height)).get_flattened_data()) > image.height * .9:
            lx = column + 2
        other = image.width - column - 1
        if sum(value < 120 for value in gray.crop((other, 0, other + 1, image.height)).get_flattened_data()) > image.height * .9:
            rx = other - 1
    image = image.crop((lx, 0, rx, image.height))
    contrast = ImageChops.invert(image.convert('L')).point(lambda x: 255 if x > 55 else 0)
    x0, y0, x1, y1 = contrast.getbbox()
    image = image.crop((max(0, x0 - 7), max(0, y0 - 7), min(image.width, x1 + 7), min(image.height, y1 + 7)))
    image.save(FIGURES / filename, lossless=True)
    return {'src': f'/materials/hssc/biology/model-paper-questions/{filename}', 'width': image.width, 'height': image.height}


def paragraphs(rows):
    result = []
    new_block = re.compile(r'^(?:EITHER$|OR$|(?:[a-z]|i+|iv|v)\.(?:\s|$)|[•|!])', re.I)
    for value in rows:
        if not value:
            continue
        if not result or '\n' in value or '\n' in result[-1] or new_block.search(value) or result[-1] in {'EITHER', 'OR'} or result[-1].startswith(('|', '![')):
            result.append(value)
        else:
            result[-1] += ' ' + value
    return '\n\n'.join(result)


def questions(doc, slug, roman, paper, expected):
    number = re.compile(r'^' + (r'Q\.' if paper == 2 else '') + r'(\d{1,2})\.(?:\s|$)')
    result = []
    for page in list(doc)[1:]:
        rows = lines(page)
        footer = min([page.rect.height - 30] + [y - 15 for y, _, text in rows if
                     re.fullmatch(r'Biology Model Paper (?:XI|XII)|PLEASE TURN OVER THE PAGE|END OF PAPER', text)])
        starts = [(y, int(match[1])) for y, x, text in rows if x < (80 if paper == 1 else 75)
                  and (match := number.match(text))]
        for index, (top, qnum) in enumerate(starts):
            bottom = starts[index + 1][0] - 15 if index + 1 < len(starts) else footer
            contents = [(y, x, text) for y, x, text in rows if top - 2 <= y < bottom and text and not re.fullmatch(r'[_\s]+', text)]
            figures = []
            tables = TABLES.get((roman, paper), {}).get(qnum, [])
            replacements = list(tables)
            image_choices = []
            question_key = (roman, paper, qnum)
            if question_key in ILLUSTRATED_CHOICES:
                (first, last), regions = ILLUSTRATED_CHOICES[question_key]
                assert top < first < last <= bottom + 2, (question_key, first, last, top, bottom)
                replacements.append((first, last, ''))
                for letter, region in zip('ABCD', regions, strict=True):
                    filename = f'{slug}-q{qnum}-option-{letter.lower()}.webp'
                    figure = excerpt(page, pymupdf.Rect(*region), filename)
                    figures.append(figure['src'])
                    image_choices.append(f'![Diagram for question {qnum}, option {letter}]({figure["src"]})')
            for serial, (first, last) in enumerate(FIGURES_BY_QUESTION.get((roman, paper), {}).get(qnum, []), 1):
                assert top < first < last <= bottom + 2, (roman, paper, qnum, first, last, top, bottom)
                filename = f'{slug}-q{qnum}-diagram-{serial}.webp'
                figure = excerpt(page, pymupdf.Rect(33, first, page.rect.width - 33, last), filename)
                figures.append(figure['src'])
                replacements.append((first, last, f'![Diagram {serial} for question {qnum}]({figure["src"]})'))
            contents = [(y, x, text) for y, x, text in contents if not any(first < y - 4 < last for first, last, _ in replacements)]
            contents += [(first + 5, 32, replacement) for first, _, replacement in replacements]
            text_rows = line_text(sorted(contents))
            if text_rows:
                text_rows[0] = number.sub('', text_rows[0]).strip()
            if not text_rows[0]:
                text_rows.pop(0)
            marks = 1
            if paper == 2:
                total = re.search(r'\(Total (\d+) Marks?\)', text_rows[0])
                assert total, (slug, qnum, text_rows[:2])
                marks = int(total[1]); text_rows[0] = total.re.sub('', text_rows[0]).strip()
            text_rows = [text.replace('\uf0b7', '•') for text in text_rows if text]
            item = {'number': qnum, 'page': page.number + 1, 'marks': marks, 'figures': figures}
            options = [(i, matched[1], matched[2]) for i, text in enumerate(text_rows) if (matched := OPTION.match(text))]
            choice_letters = ''.join(option[1] for option in options)
            choices = [' '.join([value, *text_rows[start + 1:end[0]]]).strip()
                       for (start, _, value), end in zip(options, (options[1:] + [(len(text_rows), '', '')]) if options else [], strict=True)]
            complete_options = all(choice and not re.search(r'\s[A-D]\.\s', choice) for choice in choices)
            if paper == 1:
                has_choices = choice_letters == 'ABCD' and complete_options and options[0][0] > 0
                item['stem'] = paragraphs(text_rows[:options[0][0]] if has_choices else text_rows)
                if question_key in LABEL_CHOICES:
                    choices = [f'{LABEL_CHOICES[question_key]} {letter}' for letter in 'ABCD']
                elif image_choices:
                    choices = image_choices
                elif not has_choices:
                    assert any(re.findall(r'^\| ([A-D]) \|', value, re.M) == list('ABCD')
                               for _, _, value in tables), (question_key, text_rows)
                    choices = []
                item['choices'] = choices
            elif 'EITHER' in text_rows:
                split = text_rows.index('OR')
                item['alternatives'] = [paragraphs(text_rows[1:split]), paragraphs(text_rows[split + 1:])]
            else:
                item['text'] = paragraphs(text_rows)
            result.append(item)
    assert [q['number'] for q in result] == list(range(1, expected + 1)), slug
    assert sum(q['marks'] for q in result) == (50 if paper == 1 else 35), slug
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', nargs=4, type=Path, metavar='PDF')
    paths = parser.parse_args().pdf
    FIGURES.mkdir(parents=True, exist_ok=True)
    papers = []
    for path, (roman, part, year, count) in zip(paths, [('XI', 1, 2026, 50), ('XI', 2, 2026, 9), ('XII', 1, 2027, 50), ('XII', 2, 2027, 10)], strict=True):
        slug = f'biology-model-{roman.lower()}-paper-{part}'
        with pymupdf.open(path) as doc:
            assert f'CLASS {roman} ' in ' '.join(doc[0].get_text().split())
            assert f'Biology Paper {"I" if part == 1 else "II"} Time:' in ' '.join(doc[0].get_text().split())
            if roman == 'XI' and part == 1:
                excerpt(doc[0], pymupdf.Rect(80, 566, 319, 691), 'biology-omr-example.webp')
            items = questions(doc, slug, roman, part, count)
        destination = PUBLIC / f'{slug}.pdf'
        if path.resolve() != destination.resolve():
            shutil.copyfile(path, destination)
        papers.append({'roman': roman, 'part': part, 'year': year, 'original': f'/materials/hssc/biology/{slug}.pdf', 'questions': items})
        print(roman, part, len(items), 'questions', sum(len(item['figures']) for item in items), 'figures')
    (ROOT / 'data/biology/hssc_model_papers.json').write_text(json.dumps(papers, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
