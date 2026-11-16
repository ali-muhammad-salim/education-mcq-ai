"""Prepare the reviewed Biology IX 2024 Paper I and its source crops."""
import json
from pathlib import Path
import re
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root / 'public/materials/ssc/biology/ssc-1'
data = root / 'data/biology'
base = 'biology-ix-2024-'
asset_url = '/materials/ssc/biology/ssc-1/'

p1_crops = {
    1: (2, [(74, 113, 510, 311)]), 4: (3, [(94, 113, 411, 335)]),
    7: (4, [(70, 383, 555, 525)]), 9: (5, [(89, 111, 269, 236)]),
    14: (6, [(69, 429, 326, 673)]), 19: (8, [(83, 112, 299, 297)]),
    23: (9, [(82, 112, 538, 307)]), 26: (10, [(68, 112, 369, 338)]),
    27: (10, [(70, 459, 528, 580), (70, 607, 528, 725)]),
    28: (11, [(80, 113, 360, 335)]), 40: (14, [(82, 110, 316, 358)]),
}

written_crops = {
    '4': (3, [(78, 137, 358, 338)]),
    '6b': (4, [(61, 229, 297, 361)]),
    '7b': (5, [(87, 340, 450, 503)]),
}

# Board sample regions, in sequence when the response spans several cells.
samples = {
    '1': ((3, [(127, 341, 506, 403)]), (3, [(127, 490, 528, 554)])),
    '2': ((4, [(127, 560, 440, 630)]), (4, [(129, 676, 502, 759)])),
    '3': ((6, [(129, 30, 529, 169)]), (6, [(129, 229, 564, 388)])),
    '4': ((7, [(127, 530, 563, 550), (127, 563, 563, 608), (127, 621, 563, 663)]),
          (8, [(127, 30, 563, 65), (127, 70, 563, 117), (127, 125, 563, 177)])),
    '5': ((9, [(127, 135, 562, 231)]), (9, [(124, 320, 560, 411)])),
    '6a': ((10, [(123, 453, 520, 710)]), (11, [(129, 58, 453, 263)])),
    '6b': ((12, [(127, 466, 413, 657)]), (13, [(128, 36, 493, 267)])),
    '7a': ((14, [(120, 440, 416, 646)]), (15, [(118, 34, 425, 228)])),
    '7b': ((17, [(120, 30, 545, 257)]), (17, [(120, 357, 480, 517)])),
}

def crop(doc, label, source, *, prefix=base, directory=assets, url=asset_url):
    page, coords = source
    regions = [pymupdf.Rect(coord) for coord in coords]
    assert all(doc[page - 1].rect.contains(region) for region in regions)
    scale = pymupdf.Matrix(2, 2)
    file = f'{prefix}{label}.png'
    if len(regions) == 1:
        pixmap = doc[page - 1].get_pixmap(matrix=scale, clip=regions[0])
    else:
        with pymupdf.open() as sheet:
            output = sheet.new_page(width=max(r.width for r in regions), height=sum(r.height for r in regions) + 6 * (len(regions) - 1))
            top = 0
            for r in regions:
                output.show_pdf_page(pymupdf.Rect(0, top, r.width, top + r.height), doc, page - 1, clip=r)
                top += r.height + 6
            pixmap = output.get_pixmap(matrix=scale)
    pixmap.save(directory / file)
    return url + file

def table(headers, *rows):
    return '\n'.join('| ' + ' | '.join(row) + ' |' for row in (headers, ['---'] * len(headers), *rows))

def columns(rows, names):
    return [', '.join(f'{k}: {v}' for k, v in zip(names.split('/'), row.split('/'))) for row in rows.split('|')]

def transcription(number, lines):
    starts = [i for i, line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)', line)]
    stem_lines = lines[:starts[0]] if len(starts) == 4 else lines
    choices = [' '.join([lines[i][2:].strip(), *lines[i+1:j]]).strip() for i, j in zip(starts, starts[1:] + [len(lines)])] if len(starts) == 4 else []
    stem = ' '.join(stem_lines)
    if number == 3:
        stem = 'Consider the following observations.\n\nI. The temperature of a room increases by 5 °C.\nII. Flowers in an orchard have round shaped petals.\nIII. The growth of fungus on a piece of bread indicates that it is stale.\nIV. The rate of reaction increases twice by increasing the enzyme concentration.\n\nThe CORRECT pair of qualitative observations is'
    if number == 5:
        stem = stem_lines[0] + '\n\n' + table(['Property', 'Present or Absent'], ['Cell wall', 'Present'], ['Nuclear membrane', 'Present'], ['Ribosomes', 'Present'], ['Multi-cellularity', 'Absent']) + '\n\n' + stem_lines[-1]
    if number == 6:
        stem = 'Consider the given table.\n\n' + table(['Unit of Classification', 'Example'], ['Kingdom · Animalia', 'housefly, butterfly, whale, frog, snake, bush fly, fruit fly, mayfly'], ['Phylum · Arthropoda', 'housefly, butterfly, fruit fly, bush fly, mayfly'], ['Genus · Musca', 'housefly, bush fly'], ['Species · domestica', 'housefly']) + '\n\nAccording to the given classification, the animal which shares the MOST common characteristics with housefly is a'
    if number == 12:
        stem = 'The specimens that can be observed under electron microscope are\n\nI. a sample of epithelial layer\nII. a culture of reproducing bacteria\nIII. a moving amoeba in a drop of water\nIV. a piece of tissue taken from mammary gland'
    if number == 13:
        stem = 'The given table shows function of structures, P, Q and R in living things.\n\n' + table(['Structure','Function'], ['P','Transport water molecules'], ['Q','Transport oxygen molecules'], ['R','Absorb surrounding water through osmosis']) + '\n\nThe option which CORRECTLY identifies the structures P, Q and R is'
        choices = columns('xylem vessels/red blood cells/root hair cells|red blood cells/root hair cells/xylem vessels|root hair cells/xylem vessels/red blood cells|root hair cells/red blood cells/xylem vessels', 'P/Q/R')
    if number == 14:
        stem = 'Jamal calculated the surface area to volume ratio of four different sizes of potato cubes (A, B, C and D) and he plotted the given graph to analyse the results. With reference to the graph, the potato cube that has more efficient rate of diffusion is'
        choices = [f'Cube {key}' for key in 'ABCD']
    if number == 15:
        stem = 'Consider the given chemical reaction of water breakdown.\n\n' + r'$\mathrm{H_2O}\rightarrow 2\mathrm{H^+}+2\mathrm{e^-}+\frac{1}{2}\mathrm{O_2}$' + '\n\nThe electrons resulted in the given reaction are gained by'
    if number == 18:
        stem = 'Consider the given word equations.\n\nI. glucose → lactic acid + energy\nII. glucose → ethanol + carbon dioxide + energy\nIII. glucose + oxygen → carbon dioxide + water + energy\nIV. carbon dioxide + water + energy → glucose + oxygen\n\nThe option that shows the equation for anaerobic respiration in humans and in yeast is'
        choices = columns('I/II|I/III|II/IV|III/IV', 'Humans/Yeast')
    if number == 19:
        stem = 'The given graph shows one of the factors affecting rate of photosynthesis. The option that CORRECTLY identifies the limiting factor(s) in the labelled parts I and II is'
        choices = columns('light intensity/carbon dioxide and temperature|carbon dioxide and temperature/light intensity|light intensity and carbon dioxide/water|water/light intensity and carbon dioxide','I/II')
    if number == 23:
        stem = 'The given images show the comparison of healthy and diseased alveolar sacs (I and II) in humans. The alveolar sacs I and II represent'
        choices = columns('emphysema/pneumonia|pneumonia/emphysema|asthma/bronchitis|bronchitis/asthma','I/II')
    if number == 24:
        stem = 'The given steps occur during breathing mechanism in the human respiratory system.\n\nI. Size of chest cavity decreases\nII. Pressure in the lungs decreases\nIII. The muscles of diaphragm relax\nIV. Ribs move upwards and outwards\n\nThe steps which take place during exhalation are'
    if number == 27:
        stem = 'The given diagram represents an enzyme-catalysed reaction. With reference to lock and key model, the enzyme that can catalyse this reaction is'
        choices = [f'Diagram {key}' for key in 'ABCD']
    if number == 29:
        stem = 'Which of the following indicates the movement of larynx and state of trachea during the swallowing of food?'
        choices = columns('Up/Open|Up/Closed|Down/Open|Down/Closed','Movement of larynx/Passage to trachea')
    if number == 32:
        stem = 'Following are diseases that are related to dietary habits.\n\n• Heart diseases\n• Constipation\n• Inflammation of colon\n• Irritated bowel syndrome\n\nWhich of the following diets is MOST likely to develop the given diseases?'
    if number == 34:
        stem = 'Which of the following CORRECTLY identifies the site of action of trypsin and pepsin in the alimentary canal of human?'
        choices = columns('Ileum/Colon|Stomach/Duodenum|Colon/Ileum|Duodenum/Stomach','Trypsin/Pepsin')
    if number == 39:
        stem = 'The given table shows blood reports of four individuals (A, B, C and D). With reference to changes in the count of blood cells, the blood report of the individual that indicates the presence of a bacterial infection is\n\n' + table(['Test', 'A', 'B', 'C', 'D', 'Reference range'], ['WBCs (per mm³)', '14,000', '10,000', '11,000', '8,900', '4,000–11,000'], ['Neutrophils (%)', '88', '61', '40', '50', '50–70'], ['Lymphocytes (%)', '13', '32', '20', '18', '25–40'])
        choices = [f'Report {key}' for key in 'ABCD']
    if number == 40:
        stem = 'The given diagram shows longitudinal section of the human heart. Which of the following options is CORRECT about the concentration of carbon dioxide and blood pressure in the vessel labelled as Y?'
        choices = columns('High/High|Low/High|High/Low|Low/Low','Carbon dioxide concentration/Blood pressure')
    assert stem and len(choices) == 4 and all(choices), (number, stem, choices)
    return stem, choices

def main():
    review = {}
    for line in (data / 'ssc1_2024_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head, explanation, *feedback = [v.strip() for v in line.split('|')]
        number, code = head.split()
        assert len(feedback) == 4
        review[int(number)] = (code, explanation, feedback)
    with pymupdf.open(assets / (base + 'keys.pdf')) as key:
        official = {int(q): (code, answer, level) for q, code, answer, level in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D])\s+([KUA])\b', key[0].get_text())}
    assert sorted(official) == list(range(1, 41))
    rows = []
    with pymupdf.open(assets / (base + 'paper-i.pdf')) as doc:
        for page in list(doc)[1:14]:
            numbers = sorted((w for w in page.get_text('words') if 33 < w[0] < 72 and 80 < w[1] < 790 and re.fullmatch(r'\d{1,2}\.', w[4])), key=lambda w: w[1])
            for i, (left, top, _, _, token, *_) in enumerate(numbers):
                number = int(token[:-1])
                end = numbers[i+1][1] - 2 if i+1 < len(numbers) else 790
                figure = p1_crops.get(number)
                lines = []
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines', []):
                        x, y, *_ = line['bbox']
                        if line['dir'] != (1.,0.) or not top - 2 <= y < end or x < left - 1:
                            continue
                        if figure and any(x0 <= x <= x1 and y0 <= y <= y1 for x0,y0,x1,y1 in figure[1]):
                            continue
                        value = ''.join(span['text'] for span in line['spans']).strip()
                        if value and not value.startswith(('PLEASE TURN', 'END OF PAPER', 'S2401-', 'Page ')) and value != token:
                            lines.append((y, x, value))
                stem, choices = transcription(number, [value for _, _, value in sorted(lines)])
                code, explanation, feedback = review[number]
                old_code, official_answer, old_level = official[number]
                diagram = crop(doc, f'paper-i-q{number}', figure) if figure else None
                rows.append(dict(number=str(number), page=page.number+1, code=code, stem=stem, choices=choices,
                                 answer=None if number == 5 else official_answer, officialAnswer=official_answer,
                                 originalSlo=old_code, originalLevel=old_level, explanation=explanation,
                                 feedback=feedback, diagramUrl=diagram))
    assert [int(row['number']) for row in rows] == list(range(1, 41))
    with pymupdf.open(assets / (base + 'paper-ii.pdf')) as doc:
        for number, region in written_crops.items():
            crop(doc, f'paper-ii-q{number}', region)
    with pymupdf.open(assets / (base + 'emarking.pdf')) as doc:
        for number, (better, weaker) in samples.items():
            crop(doc, f'emarking-q{number}-stronger', better)
            crop(doc, f'emarking-q{number}-weaker', weaker)
    (data / 'ssc1_2024_past_mcqs.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()

