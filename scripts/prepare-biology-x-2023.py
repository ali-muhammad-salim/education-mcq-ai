"""Build the Biology X 2023 digital source transcript and reviewed image crops."""
import json
from pathlib import Path
import re
import runpy
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root/'public/materials/ssc/biology/ssc-2'
data = root/'data/biology'
prefix = 'biology-x-2023-'
url = '/materials/ssc/biology/ssc-2/'
shared = runpy.run_path(str(root/'scripts/prepare-biology-ix-2024.py'))
table,columns,crop = (shared[k] for k in ('table','columns','crop'))

figures = {
    6:(3,(91,137,549,455)), 8:(4,(67,120,457,305)),
    9:(4,(68,440,527,694)), 12:(5,(96,373,202,587)),
    13:(6,(36,152,528,431)), 14:(6,(64,541,230,654)),
    15:(7,(96,117,498,306)), 16:(7,(91,522,345,720)),
    20:(8,(36,487,538,670)), 22:(9,(94,218,355,390)),
    23:(10,(37,130,542,279)), 28:(11,(101,312,318,468)),
    31:(12,(65,206,224,319)), 32:(12,(68,442,405,655)),
    36:(13,(96,462,410,684)),
}
written_figures = {'1':(2,(32,139,451,297)),'3':(3,(57,134,257,273)),'5b':(4,(61,245,303,397))}
samples = {
    '1': ([(3,0),(3,2)],[(3,1),(3,3)]),
    '2': ([(5,0)],[(6,1)]),
    '3': ([(8,0),(9,1)],[(9,0),(9,2)]),
    '4': ([(11,0)],[(12,0),(12,1)]),
    '5a': ([(15,0)],[(16,0)]),
    '5b': ([(18,0)],[(18,1)]),
    '6a': ([(21,0),(22,0)],[(23,0)]),
    '6b': ([(25,0),(25,1)],[(26,0),(26,1)]),
}

def save(doc,label,figure):
    page,rect=figure
    return crop(doc,label,(page,[rect]),prefix=prefix,directory=assets,url=url)

def sample(doc,label,images):
    regions=[(page-1,pymupdf.Rect(doc[page-1].get_image_info()[index]['bbox'])) for page,index in images]
    if len(regions)==1:
        page,rect=regions[0]
        return save(doc,label,(page+1,rect))
    width=max(rect.width for _,rect in regions)
    height=sum(rect.height for _,rect in regions)+8*(len(regions)-1)
    with pymupdf.open() as combined:
        surface=combined.new_page(width=width,height=height)
        y=0
        for page,r in regions:
            surface.show_pdf_page(pymupdf.Rect(0,y,r.width,y+r.height),doc,page,clip=r)
            y+=r.height+8
        surface.get_pixmap(matrix=pymupdf.Matrix(2,2)).save(assets/(prefix+label+'.png'))

def transcribe(n,lines):
    indices=[i for i,line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)',line)]
    standard=len(indices)==4
    stem_lines=lines[:indices[0]] if standard else lines
    choices=[' '.join([lines[i][2:].strip(),*lines[i+1:j]]).strip() for i,j in zip(indices,indices[1:]+[len(lines)])] if standard else []
    stem=' '.join(stem_lines)
    if n==4:
        stem='The process of cytokinesis is different in animal and plant cells. Which of the following options supports the given statement?'
        choices=columns('It is the last stage of cell division./It occurs during interphase.|Daughter cells receive equal amounts of cytoplasm./Daughter cells receive unequal amounts of cytoplasm.|Cleavage furrow forms at the equatorial plane./Phragmoplast forms at the equatorial plane.|Contractile ring causes the division of the cell./Spindle apparatus causes the division of the cell.','Animal cells/Plant cells')
    if n==8:
        stem='The given diagram shows the process of haemodialysis. The blood present in tube Q is different from the blood in tube P due to a considerable decrease in the concentration of'
    if n==12:
        stem='A person, during his eyesight test, was asked to read the following chart from a distance of 20 feet. The image of the letters appears to him as shown. Which option correctly identifies the disorder and its recommended treatment?'
        choices=columns('Long-sightedness (hypermetropia)/Convex lens|Long-sightedness (hypermetropia)/Concave lens|Short-sightedness (myopia)/Convex lens|Short-sightedness (myopia)/Concave lens','Disorder/Treatment')
    if n==13: stem='The images that CORRECTLY show the direction of impulse in two different types of neurons are\n\n(Note: Arrows show direction of impulse.)'
    if n==15:
        stem='The given graph shows the changes in blood glucose concentration over time. In order to maintain blood glucose concentration, the hormones secreted in higher concentrations at X and Y are'
        choices=columns('estrogen/progesterone|insulin/glucagon|glucagon/insulin|progesterone/estrogen','X/Y')
    if n==16:
        stem='The part of a flower where germination of pollen grains takes place after pollination is labelled as'
        choices=[f'Label {key}' for key in 'ABCD']
    if n==17:
        stem='In flowering plants, the number of nuclei and cells in the mature female gametophyte (embryo sac) are'
        choices=columns('8/6|8/7|4/4|3/4','Nuclei/Cells')
    if n==22:
        stem='The given diagram represents the range of movement provided by the elbow joint. The option which CORRECTLY identifies movement I and movement II is'
        choices=columns('flexion/extension|flexion/flexion|extension/extension|extension/flexion','Movement I/Movement II')
    if n==24:
        stem='The parental genotypes that can produce offspring with 50% A and 50% AB blood group are'
        choices=['Iᴬi and Iᴮi.', 'Iᴬi and IᴮIᴮ.', 'IᴬIᴬ and Iᴮi.', 'IᴬIᴬ and IᴮIᴮ.']
    if n==29:
        stem='A homozygous red-skinned apple is crossed with a yellow-skinned apple. As a result, all the apples obtained in the F₁ generation are red-skinned. (Note: R is dominant for red skin and r is recessive for yellow skin.) If any two individuals of the F₁ generation are crossed, then the expected phenotypic ratio of red-skinned to yellow-skinned apples will be'
        choices=['1 : 1','2 : 1','3 : 1','1 : 3']
    if n==33:
        stem='Plasmodium is categorised as a parasite of human beings because it\n\nI. completely paralyses the host\nII. lives within the host\nIII. acts as a vector of various pathogens\nIV. gets benefit at the expense of its host'
        choices=['I and IV.', 'I and III.', 'II and III.', 'II and IV.']
    if n==34:
        stem='Decomposers are advantageous to the terrestrial ecosystem because they'
    if n==39:
        stem='Referring to the causative agent of the disease in the given table, the use of antibiotics can cure'
        choices=columns('ascariasis/roundworm|typhoid/bacteria|dandruff/fungus|measles/virus','Disease/Causative agent')
    assert stem and len(choices)==4 and all(choices),(n,stem,choices)
    return stem,choices

def main():
    reviews={}
    for line in (data/'ssc2_2023_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head,explanation,*feedback=[s.strip() for s in line.split('|')]
        n,code=head.split()
        assert len(feedback)==4
        reviews[int(n)]=code,explanation,feedback
    with pymupdf.open(assets/(prefix+'keys.pdf')) as key:
        official={int(n):(re.sub(r'\s*,?\s+','; ',old.strip()),answer,level) for n,old,answer,level in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+(?:[,\s]+\d+\.\d+\.\d+)?)\s+([A-D])\s+([KUA])\b',key[0].get_text())}
    assert sorted(official)==list(range(1,41)),sorted(official)
    rows=[]
    with pymupdf.open(assets/(prefix+'paper-i.pdf')) as doc:
        for page in list(doc)[1:14]:
            numbers=sorted((w for w in page.get_text('words') if 39<w[0]<75 and 80<w[1]<790 and re.fullmatch(r'\d{1,2}\.',w[4])),key=lambda w:w[1])
            for i,(left,top,_,_,token,*_) in enumerate(numbers):
                n=int(token[:-1])
                end=numbers[i+1][1]-2 if i+1<len(numbers) else 790
                figure=figures.get(n)
                if figure: assert figure[0]==page.number+1
                lines=[]
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        x,y,*_=line['bbox']
                        if line['dir']!=(1.,0.) or not top-2<=y<end or x<left-1: continue
                        if figure:
                            x0,y0,x1,y1=figure[1]
                            if x0<=x<=x1 and y0<=y<y1: continue
                        value=''.join(span['text'] for span in line['spans']).strip()
                        if value and value!=token and not value.startswith(('S2302-','PLEASE TURN','END OF PAPER','AKU-EB Annual')):
                            lines.append((y,x,value))
                stem,choices=transcribe(n,[value for _,_,value in sorted(lines)])
                code,explanation,feedback=reviews[n]
                old,key,level=official[n]
                rows.append(dict(number=str(n),page=page.number+1,code=code,stem=stem,choices=choices,
                                 answer=None if n==14 else key,officialAnswer=key,originalSlo=old,
                                 originalLevel=level,explanation=explanation,feedback=feedback,
                                 diagramUrl=save(doc,f'paper-i-q{n}',figure) if figure else None))
    assert [int(q['number']) for q in rows]==list(range(1,41))
    with pymupdf.open(assets/(prefix+'paper-ii.pdf')) as doc:
        for n,figure in written_figures.items(): save(doc,f'paper-ii-q{n}',figure)
    with pymupdf.open(assets/(prefix+'emarking.pdf')) as doc:
        for n,(stronger,weaker) in samples.items():
            sample(doc,f'emarking-q{n}-stronger',stronger)
            sample(doc,f'emarking-q{n}-weaker',weaker)
    (data/'ssc2_2023_past_mcqs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    main()
