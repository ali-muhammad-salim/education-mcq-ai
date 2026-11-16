"""Transcribe Biology IX 2022 Paper I and attach the corresponding source evidence."""
import json
from pathlib import Path
import re
import runpy
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root / 'public/materials/ssc/biology/ssc-1'
data = root / 'data/biology'
base = 'biology-ix-2022-'
asset_url = '/materials/ssc/biology/ssc-1/'
shared = runpy.run_path(str(root / 'scripts/prepare-biology-ix-2024.py'))
table, columns = shared['table'], shared['columns']
crop = shared['crop']

figures = {
    3: (2, [(77, 455, 545, 560)]), 6: (3, [(86, 113, 291, 315), (46, 354, 563, 743)]),
    7: (4, [(88, 130, 263, 291)]), 8: (4, [(81, 429, 379, 591)]),
    12: (5, [(90, 462, 358, 592)]), 15: (6, [(78, 318, 490, 539)]),
    16: (7, [(92, 124, 332, 300)]), 17: (7, [(92, 434, 290, 619)]),
    28: (10, [(77, 310, 451, 516)]), 37: (12, [(77, 295, 498, 332)]),
    38: (12, [(78, 444, 442, 654)]), 42: (13, [(93, 530, 348, 680)]),
    44: (14, [(77, 353, 550, 511)]), 45: (14, [(77, 533, 428, 703)]),
    46: (15, [(92, 128, 418, 345)]), 49: (16, [(78, 322, 336, 554)]),
    50: (17, [(93, 137, 337, 310)]),
}

def insert_table(lines, start, content):
    return ' '.join(lines[:start]) + '\n\n' + content + '\n\n' + lines[-1]

def transcription(n, lines):
    begins = [i for i, line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)', line)]
    normal = len(begins) == 4
    stem_lines = lines[:begins[0]] if normal else lines
    choices = [' '.join([lines[i][2:].strip(), *lines[i+1:j]]).strip() for i,j in zip(begins, begins[1:]+[len(lines)])] if normal else []
    stem = ' '.join(stem_lines).replace('\uf0b7 ', '')
    if n in (3, 6, 8, 42, 44, 49):
        stem = {
            3: 'In the given table, different sizes of blocks represent nutrients. Which of the following nutrients will be efficiently absorbed by the villi?',
            6: 'Use the given key to answer the following question. The diagram that CORRECTLY represents the movement of glucose molecules into red blood cells through the process of facilitated diffusion is',
            8: 'The given diagram represents a plant cell. The part of the cell which is composed of cellulose is labelled as',
            42: 'In the given diagram of the transverse section of a dicot stem, parenchyma tissues are labelled as',
            44: 'Salma wants to conduct an experiment to investigate that chlorophyll is necessary for photosynthesis. To carry out the experiment, she takes four different leaves labelled as, A, B, C and D. Which of the following leaves should Salma select to carry out the experiment?',
            49: 'A student observes the given microscopic image of a human villus. The labelled part that represents a mucous secreting cell is',
        }[n]
        name = {3:'Nutrient', 6:'Diagram', 44:'Leaf'}.get(n,'Label')
        choices = [f'{name} {key}' for key in 'ABCD']
    if n == 10:
        stem = 'Following are the structural features of three different organelles.\n\nI. Its outer membrane is smooth, but the inner membrane forms many infoldings.\nII. It is composed of nine triplets of microtubules.\nIII. It consists of a set of flattened sacs that are stacked over each other.\n\nThe option that CORRECTLY identifies organelles I, II and III is'
        choices = columns('ribosome/smooth endoplasmic reticulum/centriole|smooth endoplasmic reticulum/Golgi apparatus/ribosomes|Golgi apparatus/ribosome/mitochondria|mitochondria/centriole/Golgi apparatus','I/II/III')
    if n == 12:
        stem = 'The given flow chart shows different processes involved in the energy transformation in plants. Which of the following is CORRECT about the flow of energy at process I and II?'
        choices = columns('Input of light energy/Release of heat energy|Input of light energy/Input of light energy|Release of heat energy/Release of heat energy|Release of heat energy/Input of light energy','Process I/Process II')
    if n == 17:
        stem = 'The given bar graph shows the average number of chloroplasts in three different types of leaf cells, I, II and III. Based on the average number of chloroplasts, the option that identifies leaf cells I, II and III is'
        choices = columns('palisade mesophyll cell/spongy mesophyll cell/guard cell|guard cell/palisade mesophyll cell/spongy mesophyll cell|spongy mesophyll cell/guard cell/palisade mesophyll cell|spongy mesophyll cell/palisade mesophyll cell/guard cell','I/II/III')
    if n == 19:
        stem = insert_table(stem_lines,1,table(['Gas','Inspired air (approx. %)','Expired air (approx. %)'],['O₂','20.95','16'],['CO₂','0.04','4'],['N₂','79','?']))
    if n == 20:
        stem = 'In the human respiratory system, the structure X warms and filters the inspired air, whereas the structure Y is associated with gaseous exchange. The option which CORRECTLY identifies the structure X and Y is'
        choices = columns('nasal cavity/alveoli|epiglottis/trachea|trachea/epiglottis|alveoli/nasal cavity','X/Y')
    if n == 22:
        stem = 'Given are some of the features of an organ involved in the breathing mechanism of humans.\n\n• It is located below lungs.\n• It is composed of skeletal muscles.\n• It contracts and relaxes while breathing.\n\nBased on the given features, this organ is identified as'
    if n == 23:
        stem = 'The option which CORRECTLY identifies the component of a secretion which neutralises the acidic chyme in duodenum and the source of this secretion is'
        choices = columns('mucous/stomach|trypsinogen/pancreas|bicarbonates/pancreas|pepsinogen/stomach','Component/Source')
    if n == 24:
        stem = 'A nutritionist recommends a male adult to consume liver, beans and red meat regularly in his diet to overcome the following symptoms.\n\n• Pale skin\n• Shortness of breath\n• Tiredness and lethargy\n\nWith reference to the given information, the adult person’s body has a deficiency of'
    if n == 29:
        stem = 'Which of the following options is CORRECT about the movement of the soft palate and the larynx during swallowing?'
        choices = columns('Up/Up|Up/Down|Down/Up|Down/Down','Soft palate/Larynx')
    if n == 31:
        stem = 'In the human digestive system, X is a chemical secretion that contains enzyme which digests fats. The option which CORRECTLY identifies X, the enzyme it contains and the site of action for the enzyme is'
        choices = columns('bile/lipase/liver|pancreatic juice/lipase/duodenum|gastric juice/amylase/stomach|saliva/amylase/mouth','Secretion X/Enzyme/Site of action')
    if n == 36:
        stem = 'The given events occur during the circulation of blood through atria and ventricles of the heart.\n\nI. Blood is pushed into the aorta.\nII. Aortic semilunar valves are opened.\nIII. Pulmonary semilunar valves are closed.\nIV. Atrioventricular valves are pushed open.\n\nWhich of these given events occur when the left atrium contracts?'
    if n == 40:
        stem = 'Which of the following options is CORRECT about thrombocytes?'
        choices = columns('Absent/Absent/7–8 days|Present/Absent/120 days|Absent/Present/7–8 days|Present/Present/120 days','Nucleus/Pigment/Life span')
    if n == 43:
        stem = 'The given table represents initial and final masses of potato cubes, before and after keeping them in four different concentrations of salt solutions labelled as I, II, III and IV. The salt solution that is hypotonic to the potato cubes is'
        choices = columns('I/12/15|II/12/12|III/12/8|IV/12/6','Salt solution/Initial mass (g)/Final mass (g)')
    if n == 45:
        stem = 'Consider the given experimental setup. Oxygen gas bubbles will NOT be produced in the test tube if the'
    if n == 46:
        stem = 'Misbah has set the apparatus in the following way to investigate the release of heat during aerobic respiration in germinating seeds. Which of the following reactions will take place in the vacuum flask I?'
        choices = [
            r'$2\mathrm{C_3H_4O_3}+4\mathrm{H}\rightarrow2\mathrm{C_3H_6O_3}$',
            r'$2\mathrm{C_3H_4O_3}+4\mathrm{H}\rightarrow2\mathrm{C_2H_5OH}+2\mathrm{CO_2}$',
            r'$6\mathrm{CO_2}+12\mathrm{H_2O}\rightarrow\mathrm{C_6H_{12}O_6}+6\mathrm{O_2}+6\mathrm{H_2O}$',
            r'$\mathrm{C_6H_{12}O_6}+6\mathrm{O_2}\rightarrow6\mathrm{CO_2}+6\mathrm{H_2O}+\text{energy}$',
        ]
    if n == 47:
        stem = 'The given table represents the results obtained after the biochemical tests that were carried out on different food samples.\n\n' + table(['Sample','Benedict’s test','Biuret test'],['W','Positive','Negative'],['X','Negative','Negative'],['Y','Negative','Positive'],['Z','Positive','Positive']) + '\n\nThe inference that is BEST supported by the given table is that the food sample'
    if n == 48:
        stem = 'A student performs Benedict’s test on four different samples in test tubes labelled as A, B, C and D, containing varied concentrations of reducing sugars. Based on the test result in the given table, the test tube which contains the HIGHEST concentration of reducing sugar is'
        choices = ['Green precipitate','Yellow precipitate','Brown precipitate','Red precipitate']
    assert stem and len(choices)==4 and all(choices), (n, stem, choices)
    return stem, choices

def main():
    review = {}
    for line in (data/'ssc1_2022_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head, explanation, *feedback = [part.strip() for part in line.split('|')]
        n, code = head.split()
        assert len(feedback) == 4
        review[int(n)] = (code, explanation, feedback)
    official = {}
    with pymupdf.open(assets/(base+'keys.pdf')) as verification:
        for page in list(verification)[:2]:
            for n, code, key, k, u, a in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D])\s+N\s+([1-])\s+([1-])\s+([1-])', page.get_text()):
                assert [k,u,a].count('1') == 1
                official[int(n)] = code, key, 'RUA'[[k,u,a].index('1')]
    assert sorted(official) == list(range(1,51)), sorted(official)
    rows = []
    with pymupdf.open(assets/(base+'paper-i.pdf')) as doc:
        for page in list(doc)[1:17]:
            numbers = sorted((w for w in page.get_text('words') if 40<w[0]<67 and 80<w[1]<780 and re.fullmatch(r'\d{1,2}\.',w[4])), key=lambda w:w[1])
            for i,(left, top, _, _, token, *_) in enumerate(numbers):
                n = int(token[:-1])
                end = numbers[i+1][1]-2 if i+1<len(numbers) else 789
                figure = figures.get(n)
                if figure:
                    assert figure[0] == page.number+1
                lines = []
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        x,y,*_=line['bbox']
                        if line['dir']!=(1.,0.) or not top-2<=y<end or x<left-1:
                            continue
                        if figure and any(x0<=x<=x1 and y0<=y<=y1 for x0,y0,x1,y1 in figure[1]):
                            continue
                        text=''.join(s['text'] for s in line['spans']).strip()
                        if text and text!=token and not text.startswith(('S2201-', 'PLEASE TURN','END OF PAPER','ALTERNATE TO PRACTICAL')):
                            lines.append((y,x,text))
                stem, choices = transcription(n,[v for _,_,v in sorted(lines)])
                code, explanation, feedback = review[n]
                old, official_answer, level = official[n]
                image = crop(doc, f'paper-i-q{n}', figure, prefix=base) if figure else None
                rows.append(dict(number=str(n), page=page.number+1, stem=stem, choices=choices, code=code, originalSlo=old,
                                 officialAnswer=official_answer, answer=None if n in (18,32,45) else official_answer,
                                 originalLevel='K' if level == 'R' else level, explanation=explanation, feedback=feedback, diagramUrl=image))
    assert [int(q['number']) for q in rows]==list(range(1,51))
    (data/'ssc1_2022_past_mcqs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__ == '__main__':
    main()
