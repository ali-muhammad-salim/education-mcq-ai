"""Build the Biology X 2021 digital transcript and reviewed question figures."""
import json
from pathlib import Path
import re
import runpy
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root/'public/materials/ssc/biology/ssc-2'
data = root/'data/biology'
prefix = 'biology-x-2021-'
url = '/materials/ssc/biology/ssc-2/'
shared = runpy.run_path(str(root/'scripts/prepare-biology-ix-2024.py'))
table,columns,crop = (shared[k] for k in ('table','columns','crop'))

figures = {
    5:(2,[(72,595,320,722)]), 6:(3,[(77,111,551,225)]),
    8:(3,[(76,458,540,782)]), 16:(5,[(75,295,362,475)]),
    22:(6,[(72,438,176,566)]), 23:(7,[(70,116,442,264)]),
    30:(9,[(69,116,451,297)]), 34:(10,[(69,113,254,262)]),
    36:(10,[(68,538,347,685)]), 40:(11,[(75,394,320,496)]),
    41:(12,[(68,153,231,310),(68,335,395,507)]), 42:(12,[(69,542,189,659)]),
    43:(13,[(60,133,475,341)]), 44:(13,[(68,412,381,598)]),
    45:(14,[(72,140,531,460)]), 46:(14,[(68,521,218,662)]),
    47:(15,[(77,161,429,350)]), 48:(15,[(89,525,250,729)]),
    49:(16,[(46,271,554,773)]),
}

def transcribe(n, lines):
    if n == 32:
        return 'If a mother has AB blood group and the father has B blood group, then the type of blood group that the children will NEVER have is', ['O.', 'A.', 'B.', 'AB.']
    indices = [i for i, line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)', line)]
    stem = ' '.join(lines[:indices[0]] if len(indices)==4 else lines)
    choices = [' '.join([lines[i][2:].strip(), *lines[i+1:j]]).strip() for i,j in zip(indices, indices[1:]+[len(lines)])]
    visual = {
        5:'In the given vertical section diagram of the human eye, the part which causes refraction of light is labelled as',
        8:'What will be the pathway for a spinal reflex action when the hand of an individual is pricked by a needle?',
        41:'The given photomicrograph depicts one of the phases of the cell cycle. This phase takes place at the labelled part',
        43:'The given image represents a model of the human ear. Which labelled part would be affected if a patient has an infection in the middle ear?',
        44:'After the brain injury in an accident, a person is unable to maintain and coordinate motor functions. The part of the brain that has been affected in this case is labelled as',
        45:'The given images represent different pieces of potato tubers. Which piece would NOT be able to produce a stem?',
        48:'In the given image of the human skeleton, patella is labelled as',
        49:'Sana obtained the following data related to the height (cm) of her class fellows.\n\n'+table(
            ['Height range (cm)','Number of students'],['150.5–160.5','5'],['160.5–170.5','3'],
            ['170.5–180.5','7'],['180.5–190.5','4'])+'\n\nThe CORRECT graphical representation of this data is',
    }
    if n in visual:
        stem = visual[n]
        label = {8:'Pathway',45:'Image',49:'Graph'}.get(n,'Label')
        choices = [f'{label} {key}' for key in 'ABCD']
    paired = {
        12:('After consuming a carbohydrate-rich meal, the blood levels of glucagon and insulin in a non-diabetic person will',
            'decrease/increase|increase/decrease|decrease/decrease|increase/increase','Glucagon level/Insulin level'),
        29:('The given table shows the result of breeding cattle with unknown genotypes for coat colour. Black (B) is completely dominant over red (b).\n\n'+table(
            ['Cross','Cow','Bull','Black offspring (%)','Red offspring (%)'],['I','Black','Red','50','50'],
            ['II','Black','Black','75','25'],['III','Black','Red','100','0'])+
            '\n\nIf the parental black cow from cross III is bred with the parental black bull from cross II, which option describes the offspring genotypes?',
            '0%/100%|25%/75%|50%/50%|75%/25%','Heterozygous offspring/Homozygous offspring'),
        31:('The option that CORRECTLY identifies the inheritance of the co-dominant trait from the parents to the offspring is',
            "straight and curly hair texture/wavy hair|red and white Japanese four o’clock plants/pink colour|AB and A blood group/AB blood group|free earlobe and attached earlobe/free earlobe",
            'Parent phenotype/Offspring phenotype'),
        34:('Consider the given food web. Which of the following combinations is CORRECT?',
            'Hawk/Secondary consumer|Snake/Primary consumer|Grass/Primary consumer|Mouse/Secondary consumer','Organism/Trophic level'),
        40:('In environmental management, the given logos represent','reuse/recycle|recycle/reduce|reduce/reuse|recycle/reuse','Logo I/Logo II'),
    }
    if n in paired:
        stem, values, headings = paired[n]
        choices = columns(values, headings)
    replacements = {
        3:'A biologist treated a cell with a certain type of chemical that inhibited the cell’s ability to synthesise DNA. If this treated cell undergoes the cell cycle, which phase would be affected?',
        6:'Diagrams I and II represent the conditions of the pupil, while III and IV show the shape of the eye lens. Which diagrams show the condition of the pupil and shape of the lens when looking at the moon?',
        11:'The given symptoms are observed in a patient with over-production of a hormone.\n\n- Shivering of hands\n- Frequent sweating\n- Increase in heartbeat\n- Increase in energy production\n\nThe hormone identified is',
        16:'In pollination, pollen transfers between which labelled parts?',
        17:'Given are the characteristics of a type of asexual reproduction.\n\nI. Parent cells are surrounded by cyst.\nII. It occurs mostly in unfavourable conditions.\nIII. Nucleus and cytoplasm divide simultaneously.\n\nThe characteristic(s) of multiple fission is/are',
        22:'The given diagram represents the working of one of the types of joints present in the human skeleton. The pair of joints that shows this type of working is',
        23:'The given diagram shows the anterior view of different bones of the human skeleton. The parts which form the knee joint are labelled as',
        30:'The pedigree shows the inheritance of fur colour in pure breeding rats. In the given pedigree, the total number of rats that are homozygous is',
        36:'In the given food web, the living organism X could be a/an',
        42:'The given photomicrograph depicts one of the phases of mitosis. If the chromosome number is $X$ in this phase of mitosis, then the number of chromosomes in the daughter nuclei after telophase would be',
        46:'The given diagram represents a longitudinal section of a maize seed. The labelled part Q is',
        47:'The given diagram shows an experiment to study the conditions necessary for seed germination. The seeds in test tube I would germinate while there would be no germination in test tube II.\n\nIn test tube II, the seeds will not germinate because\n\nI. oxygen is absent in water\nII. 17°C is inappropriate for seed germination\nIII. cotton absorbed the required amount of water for germination',
        50:'The given data represents the height (cm) of grade 10 students.\n\n100.5, 106.6, 110.9, 119.8, 125.6, 130.4, 130.6, 134.5, 138.9, 140, 145.9, 147.8, 150.4, 155.5, 157.9, 160.1, 165.3, 169.2, 170.6, 180.4, 190.8, 200.5, 205.5, 210.6, 215.9, 220.6\n\nThe height range which contains the HIGHEST number of students is',
    }
    stem = replacements.get(n,stem)
    if n==42:
        choices = [r'$X$', r'$2X$', r'$\frac{X}{4}$', r'$\frac{X}{2}$']
    assert stem and len(choices)==4 and all(choices),(n,stem,choices)
    return stem, choices
def main():
    reviews={}
    for line in (data/'ssc2_2021_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head,explanation,*feedback=[s.strip() for s in line.split('|')]
        n,code=head.split()
        assert len(feedback)==4
        reviews[int(n)]=code,explanation,feedback
    official={}
    with pymupdf.open(assets/(prefix+'keys.pdf')) as d:
        for pg in list(d)[:2]:
            for n,old,answer,k,u,a in re.findall(r'(?:^|\n)\s*(\d{1,2})\s*\n\s*([\"\d., ]+?)\s*\n\s*([A-D])\s*\n\s*N\s*\n\s*([1-])\s*\n\s*([1-])\s*\n\s*([1-])', pg.get_text()):
                assert (k,u,a).count('1')==1
                official[int(n)]=(', '.join(re.findall(r'\d+(?:\.\d+){2,3}',old)),answer,'KUA'[(k,u,a).index('1')])
    assert sorted(official)==list(range(1,51)),sorted(official)
    rows=[]
    with pymupdf.open(assets/(prefix+'paper-i.pdf')) as doc:
        for page in list(doc)[1:18]:
            numbers=sorted((w for w in page.get_text('words') if 38<w[0]<56 and 80<w[1]<780 and re.fullmatch(r'\d{1,2}\.',w[4])),key=lambda w:w[1])
            for i,(left,top,_,_,token,*_) in enumerate(numbers):
                n=int(token[:-1]);end=numbers[i+1][1]-2 if i+1<len(numbers) else 790
                figure=figures.get(n)
                if figure: assert figure[0]==page.number+1
                lines=[]
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        x,y,*_=line['bbox']
                        if line['dir']!=(1.,0.) or not top-2<=y<end or x<left-1: continue
                        if figure and any(x0<=x<=x1 and y0<=y<y1 for x0,y0,x1,y1 in figure[1]):continue
                        value=''.join(span['text'] for span in line['spans']).strip()
                        if value and value!=token and not value.startswith(('S2102-','THEORY','PLEASE TURN','END OF PAPER','Annual Examinations','ALTERNATE TO PRACTICAL')):
                            lines.append((y,x,value))
                stem,choices=transcribe(n,[value for _,_,value in sorted(lines)])
                code,explanation,feedback=reviews[n]
                old,key,level=official[n]
                rows.append(dict(number=str(n),page=page.number+1,code=code,stem=stem,choices=choices,
                    answer="A" if n==47 else key,officialAnswer=key,originalSlo=old,originalLevel=level,
                    explanation=explanation,feedback=feedback,
                    answerStatus="ANSWER_CORRECTED" if n==47 else "ANSWER_CONFIRMED",
                    answerOrigin="BIOLOGICAL_EVALUATION" if n==47 else "OFFICIAL_KEY_VERIFIED",
                    **(dict(answerReviewNote=("Printed key C includes statement II, but a temperature of 17 C is not shown to prevent germination. "
                                              "Boiled water under oil lacks dissolved oxygen, so statement I alone explains the failure.")) if n==47 else {}),
                    diagramUrl=crop(doc,f'paper-i-q{n}',figure,prefix=prefix,directory=assets,url=url) if figure else None))
    assert [int(q['number']) for q in rows]==list(range(1,51))
    (data/'ssc2_2021_past_mcqs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    # Official key summary
    notes_map = {
        5: "Reviewed: label A is the cornea, the principal refracting surface; the lens only fine-tunes the focus set by the cornea. Official key A confirmed.",
        25: "Reviewed: the strand specifies 30 G and 60 T; complementary pairing adds 30 C and 60 A, so the double-stranded segment has 180 nucleotides. Official key D confirmed.",
        27: "Reviewed: the cross is read as homozygous dominant x homozygous recessive (AA x aa), so 100% of F1 are heterozygous and show the dominant phenotype. Official key A confirmed.",
        30: "Reviewed: the two pure-breeding parents are homozygous; the 3:1 F2 from heterozygous F1 contains one BB and one bb, giving 2 + 2 = 4 homozygous rats. Official key B confirmed.",
        47: "Corrected answer: lack of dissolved oxygen in boiled water under oil seal prevents germination. Temperature of 17 C is not shown to prevent germination. Verified answer is A."
    }
    key_list = []
    for q in rows:
        num = int(q['number'])
        key_list.append({
            'questionNumber': num,
            'officialKey': q['officialAnswer'],
            'verifiedKey': q['answer'],
            'originalSlo': q['originalSlo'],
            'currentSlo': q['code'],
            'cognitiveLevel': q['originalLevel'],
            'hasDiscrepancy': q['officialAnswer'] != q['answer'],
            'note': notes_map.get(num),
        })
    (data/'ssc2_2021_official_key.json').write_text(json.dumps(key_list, indent=2), encoding='utf-8')
    print("Saved ssc2_2021_official_key.json.")

    # Manifest
    import hashlib
    sources = {}
    for role, fname in [('p1', 'biology-x-2021-paper-i.pdf'), ('key', 'biology-x-2021-keys.pdf')]:
        fpath = assets / fname
        data_bytes = fpath.read_bytes()
        doc_src = pymupdf.open(str(fpath))
        sources[role] = {
            'filename': fname,
            'url': url + fname,
            'pages': len(doc_src),
            'bytes': len(data_bytes),
            'sha256': hashlib.sha256(data_bytes).hexdigest(),
        }
        doc_src.close()

    manifest_crops = []
    for q in rows:
        if q['diagramUrl']:
            manifest_crops.append({'role': f'paper-i-q{q["number"]}', 'url': q['diagramUrl']})

    manifest_data = {
        'sources': sources,
        'crops': manifest_crops,
        'paperI': {
            'totalQuestions': 50,
            'theoryQuestions': 40,
            'atpQuestions': 10,
            'totalMarks': 50,
            'durationMinutes': 100,
        }
    }
    (data/'ssc2_2021_source_manifest.json').write_text(json.dumps(manifest_data, indent=2), encoding='utf-8')
    print("Saved ssc2_2021_source_manifest.json.")

if __name__=='__main__':
    main()

