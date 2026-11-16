"""Create the reviewed Biology X 2025 transcription and source crops."""
import json
from pathlib import Path
import re
import runpy
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root / 'public/materials/ssc/biology/ssc-2'
data = root / 'data/biology'
prefix = 'biology-x-2025-'
url = '/materials/ssc/biology/ssc-2/'
shared = runpy.run_path(str(root / 'scripts/prepare-biology-ix-2024.py'))
table, columns, crop = (shared[key] for key in ('table', 'columns', 'crop'))

figures = {
    4: (2, [(76,398,410,516)]), 6: (3, [(102,112,327,291)]),
    7: (3, [(95,438,508,467)]), 10: (4, [(47,151,533,567)]),
    15: (5, [(93,490,434,652)]), 16: (6, [(68,123,415,260)]),
    20: (7, [(96,119,293,295)]), 21: (7, [(98,431,304,572)]),
    28: (9, [(97,113,440,274)]), 30: (9, [(95,508,297,665)]),
    32: (10, [(36,305,513,565)]),
}
responses = {
    '1': ((2,(129,385,451,492)), (2,(128,602,429,700))),
    '2a': ((4,(127,35,449,119)), (4,(127,200,420,287))),
    '2b': ((5,(129,229,511,313)), (5,(128,437,452,508))),
    '3': ((6,(125,631,386,718)), (7,(128,93,385,172))),
    '4': ((8,(130,290,354,520)), (9,(128,37,344,215))),
    '5a': ((10,(127,186,465,481)), (11,(126,35,377,230))),
    '5b': ((12,(128,189,423,396)), (13,(128,35,428,298))),
    '6a': ((14,(121,329,444,578)), (15,(121,37,432,286))),
    '6b': ((16,(120,447,455,726)), (17,(121,146,421,378))),
}

def save(doc, label, region):
    return crop(doc, label, region, prefix=prefix, directory=assets, url=url)

def transcription(n, lines):
    indices = [i for i, line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)', line)]
    standard = len(indices)==4
    stem_lines = lines[:indices[0]] if standard else lines
    choices = [' '.join([lines[i][2:].strip(), *lines[i+1:j]]).strip() for i,j in zip(indices,indices[1:]+[len(lines)])] if standard else []
    stem = ' '.join(stem_lines)
    if n == 2:
        stem = 'Skin cells do NOT enter $G_0$ phase of the cell cycle as'
        choices[0] = 'they lack $G_1$ phase.'
    if n == 10:
        stem = 'Based on the direction of nerve impulses, the CORRECTLY labelled structure of a motor neuron is\n\n(Note: Arrow indicates direction of nerve impulse.)'
        choices = [f'Diagram {key}' for key in 'ABCD']
    if n == 11:
        stem = 'Consider the given functions.\n\n• Blinking of eye\n• Peristalsis\n• Heartbeat\n\nThe part of human brain that controls the given functions is'
    if n == 13:
        stem = 'In the human body, endocrine glands are located adjacent to different organs. The option that CORRECTLY matches the endocrine gland with its adjacent organ is'
        choices = columns('adrenal gland/liver|pituitary gland/brain|pancreas/kidney|thyroid gland/stomach','Gland/Adjacent organ')
    if n == 15:
        stem = 'The given diagram represents the internal structure of human ear. The part which contains sound receptors is labelled as'
        choices = [f'Label {key}' for key in 'ABCD']
    if n == 16:
        stem = 'Consider the given diagrams I and II. The types of artificial vegetative propagation in plants shown in the given diagrams are'
        choices = columns('budding/suckering|suckering/budding|stem cutting/grafting|grafting/stem cutting','Diagram I/Diagram II')
    if n == 21:
        stem = 'In the given diagram of pelvic girdle, the part that forms ball and socket joint with femur is labelled as'
        choices = [f'Label {key}' for key in 'ABCD']
    if n == 26:
        stem = 'The given table shows some examples of genetic cross and their resultant phenotypes.\n\n' + table(
            ['','Genetic cross','Resultant phenotype'],
            ['I','Two flies with brown body and red eyes are crossed','19% of offspring have black bodies and red eyes'],
            ['II','A man with free earlobes and a woman with attached earlobes have children','50% with attached earlobes and 50% with free earlobes'],
            ['III','A cat with black fur mates with a cat with brown fur','100% of offspring with black fur'],
            ['IV','Two tall pea plants with purple flowers are crossed','One out of 16 offspring is short with white flowers'],
        ) + '\n\nBased on the genetic cross and phenotypes of offspring, Mendel’s law of independent assortment is applied on'
    if n == 32:
        stem = 'Consider the given food chain.\n\nTree → Termites → Lizard → Owl\n\nThe CORRECT pyramid of number for this food chain is'
        choices = [f'Pyramid {key}' for key in 'ABCD']
    stem = stem.replace('\uf0b7','')
    assert stem and len(choices)==4 and all(choices),(n,stem,choices)
    return stem, choices

def main():
    reviews = {}
    for line in (data/'ssc2_2025_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head, explanation, *feedback = [part.strip() for part in line.split('|')]
        n, code = head.split()
        assert len(feedback)==4
        reviews[int(n)] = (code,explanation,feedback)
    with pymupdf.open(assets/(prefix+'keys.pdf')) as key:
        official = {int(n):(old,answer,level) for n,old,answer,level in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+(?:\s*,\s*\d+\.\d+\.\d+)?)\s+([A-D])\s+([KUA])\b',key[0].get_text())}
    assert sorted(official)==list(range(1,41)),sorted(official)
    rows = []
    with pymupdf.open(assets/(prefix+'paper-i.pdf')) as doc:
        for page in list(doc)[1:11]:
            numbers = sorted((w for w in page.get_text('words') if 39<w[0]<75 and 80<w[1]<790 and re.fullmatch(r'\d{1,2}\.',w[4])),key=lambda w:w[1])
            for i,(left,top,_,_,token,*_) in enumerate(numbers):
                n=int(token[:-1])
                end=numbers[i+1][1]-2 if i+1<len(numbers) else 790
                figure=figures.get(n)
                if figure:
                    assert figure[0]==page.number+1
                lines=[]
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        x,y,*_=line['bbox']
                        if line['dir']!=(1.,0.) or not top-2<=y<end or x<left-1:
                            continue
                        if figure and any(x0<=x<=x1 and y0<=y<=y1 for x0,y0,x1,y1 in figure[1]):
                            continue
                        value=''.join(span['text'] for span in line['spans']).strip()
                        if value and value!=token and not value.startswith(('S2502-','PLEASE TURN','END OF PAPER','AKU-EB Annual')):
                            lines.append((y,x,value))
                stem,choices=transcription(n,[value for _,_,value in sorted(lines)])
                code,explanation,feedback=reviews[n]
                old,answer,level=official[n]
                diagram=save(doc,f'paper-i-q{n}',figure) if figure else None
                rows.append(dict(number=str(n),page=page.number+1,code=code,stem=stem,choices=choices,
                                 answer=None if n in (2,5,11,30,37) else answer,officialAnswer=answer,
                                 originalSlo=old,originalLevel=level,explanation=explanation,feedback=feedback,diagramUrl=diagram))
    assert [int(row['number']) for row in rows]==list(range(1,41))
    with pymupdf.open(assets/(prefix+'paper-ii.pdf')) as doc:
        save(doc,'paper-ii-q3',(3,[(67,172,225,462)]))
    with pymupdf.open(assets/(prefix+'emarking.pdf')) as doc:
        for n, pair in responses.items():
            for status,(page,box) in zip(('stronger','weaker'),pair):
                source=doc[page-1]
                image=next((i for i in source.get_image_info() if all(abs(a-b)<1 for a,b in zip(box,i['bbox']))),None)
                assert image,(n,status,box)
                save(doc,f'emarking-q{n}-{status}',(page,[image['bbox']]))
    (data/'ssc2_2025_past_mcqs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    main()
