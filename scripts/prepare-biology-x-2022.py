"""Build the Biology X 2022 digital transcript and reviewed question figures."""
import json
from pathlib import Path
import re
import runpy
import pymupdf

root = Path(__file__).resolve().parents[1]
assets = root/'public/materials/ssc/biology/ssc-2'
data = root/'data/biology'
prefix = 'biology-x-2022-'
url = '/materials/ssc/biology/ssc-2/'
shared = runpy.run_path(str(root/'scripts/prepare-biology-ix-2024.py'))
table,columns,crop = (shared[k] for k in ('table','columns','crop'))

figures = {
    1:(2,[(69,161,555,379)]), 6:(3,[(66,310,331,464)]),
    11:(4,[(73,433,471,644)]), 13:(5,[(65,111,447,207)]),
    18:(6,[(68,200,429,444)]), 19:(7,[(67,110,269,260)]),
    20:(7,[(66,391,510,634)]), 21:(8,[(40,107,546,326)]),
    24:(8,[(72,546,387,650)]), 25:(9,[(70,131,530,233)]),
    27:(9,[(70,538,357,681)]), 34:(11,[(64,368,550,552)]),
    36:(12,[(68,135,567,321)]), 40:(13,[(68,140,527,351)]),
    41:(13,[(69,443,376,661)]), 42:(14,[(69,109,199,287)]),
    43:(14,[(69,399,334,567)]), 44:(15,[(67,137,358,309),(64,338,430,562)]),
    45:(15,[(67,617,528,741)]), 46:(16,[(69,115,419,290),(69,321,540,426)]),
    47:(16,[(68,462,284,640)]), 48:(17,[(76,134,463,317),(70,360,494,538)]),
    50:(18,[(68,168,365,400)]),
}

def with_table(before, content, after):
    return before+'\n\n'+content+'\n\n'+after

def transcribe(n,lines):
    indices=[i for i,line in enumerate(lines) if re.match(r'^[A-D]\.(?:$|\s)',line)]
    ordinary=len(indices)==4
    stem_lines=lines[:indices[0]] if ordinary else lines
    choices=[' '.join([lines[i][2:].strip(),*lines[i+1:j]]).strip() for i,j in zip(indices,indices[1:]+[len(lines)])] if ordinary else []
    stem=' '.join(stem_lines)
    diagram_only={
        11:'The given diagram represents the cross-sectional view of the spinal cord. The labelled part which contains the cell bodies of motor neurons is',
        21:'All of the given images of different types of joints contain articular cartilage EXCEPT',
        40:'The pyramid of number that CORRECTLY represents the given food chain is\n\nTree → Birds → Mosquitoes',
        41:'The given graph depicts the change in the DNA quantity during a cell cycle. The labelled part which shows the division phase of the cell cycle is',
        43:'In the given image of a human eye, the labelled part which contains photoreceptors, rods and cones is',
        44:'An ENT specialist recommends a cochlear implant to a patient with a hearing problem. The given diagram represents the component that has to be implanted. The surgeon will implant the electrode at the part labelled as',
        45:'A student CORRECTLY identified tuber from the following images. His or her answer is represented as',
        46:'The given image represents the process of budding in a yeast cell. In this image, the missing stage X is',
        47:'In the given diagram of maize seed, the part that stores food is labelled as',
        48:'An orthopaedic surgeon has recommended an implant for an injured joint. Diagram I represents the individual components of the implant while diagram II shows the complete implant. The surgeon will fix this implant at the position labelled as',
    }
    if n in diagram_only:
        stem=diagram_only[n]
        name={21:'Diagram',40:'Pyramid',45:'Image',46:'Diagram'}.get(n,'Label')
        choices=[f'{name} {k}' for k in 'ABCD']
    if n==1:
        stem='The given diagram shows two different processes (I and II) occurring in sexually reproducing animals. The statement that is CORRECT about process I is that it'
    if n==2:
        stem='During gametogenesis, DNA replicates once but cell division occurs twice. This results in the formation of gametes consisting of\n\nI. a single copy of each homologous chromosome\nII. non-homologous chromosomes with their sister chromatids\nIII. a pair of homologous chromosomes with its sister chromatids'
    if n==6:
        stem='The given image depicts a fight-or-flight situation. The gland that will be activated in person Y is'
    if n==10:
        stem='The option that CORRECTLY matches the gland with its location in the human body is'
        choices=columns('adrenal gland/liver|pituitary gland/brain|pancreas/stomach|thyroid gland/abdomen','Gland/Location')
    if n==13:
        stem='The table shows two different states of the pupil (R and S) in a human eye. The state of pupil R shows that a person\n\nI. is focusing a close object\nII. is looking at a distant object\nIII. has entered into a dark room\nIV. has entered into a bright room'
    if n==15:
        stem='Consider the given statements.\n\nI. It is formed by the stigma.\nII. It produces an enzyme to dissolve the tissue of style.\nIII. It enters into the ovary through micropyle.\n\nWith reference to the pollen tube of a flower, the TRUE statement(s) is/are'
    if n==18:
        stem='The given diagram represents one of the stages in the life cycle of flowering plants. The type of cell division(s) that cells X and Y undergo is/are'
        choices=columns('mitosis/meiosis|mitosis/mitosis|meiosis/meiosis|meiosis/mitosis','X/Y')
    if n==24:
        stem='The given image shows an experimental setup to determine tropism in plants. The type(s) of tropism illustrated in this experiment is/are\n\nI. phototropism\nII. hydrotropism\nIII. geotropism'
    if n==25:
        stem='The given pedigree shows a cross between red and white flowers. The allele R for red flower is completely dominant over the allele r for white flower. Which of the following options CORRECTLY identifies Y and Z?'
        choices=columns('RR/Red|Rr/Red|RR/White|Rr/White','Y genotype/Z phenotype')
    if n==27:
        stem='In the given diagram, the labelled parts I, II and III represent'
        choices=columns('gene/DNA/chromosome|chromatid/gene/chromatin|chromosome/chromatin/DNA|gene/chromosome/chromatid','I/II/III')
    if n==30:
        stem='The parental genotypes which can produce offspring with 50% A and 50% AB blood group are'
        choices=['Iᴬi and Iᴮi.', 'Iᴬi and IᴮIᴮ.', 'IᴬIᴬ and Iᴮi.', 'IᴬIᴬ and IᴮIᴮ.']
    if n==33:
        stem=with_table('The given table shows blood types in a family.',table(['Family member','Blood type'],['Wife','AB'],['Husband','B'],['Child X','O'],['Child Y','B']),'Which of the following inferences is CORRECT regarding the given table with respect to the blood-group genotypes of the wife and husband?')
    if n==35:
        stem='Which of the following options is CORRECT about parasitism?'
        choices=columns('True/False/True|False/True/True|True/False/False|False/True/False','Parasites are mostly less in number/Host is not killed immediately/Parasitism is done for food and shelter')
    if n==50:
        stem='A medical survey team recorded the heights (cm) of Grade X students to provide supplements for their proper growth. Their data is represented in the given histogram. After their survey, they concluded that the students below 135 cm height need to consume growth supplements regularly. According to the given data, how many students are required to consume growth supplements regularly?'
    assert stem and len(choices)==4 and all(choices),(n,stem,choices)
    return stem,choices

def main():
    reviews={}
    for line in (data/'ssc2_2022_mcq_review.txt').read_text(encoding='utf-8').strip().splitlines():
        head,explanation,*feedback=[s.strip() for s in line.split('|')]
        n,code=head.split()
        assert len(feedback)==4
        reviews[int(n)]=code,explanation,feedback
    official={}
    with pymupdf.open(assets/(prefix+'keys.pdf')) as d:
        for pg in list(d)[:2]:
            for n,old,answer,k,u,a in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D])\s+N\s+([1-])\s+([1-])\s+([1-])',pg.get_text()):
                assert (k,u,a).count('1')==1
                official[int(n)]=(old,answer,'KUA'[(k,u,a).index('1')])
    assert sorted(official)==list(range(1,51)),sorted(official)
    rows=[]
    with pymupdf.open(assets/(prefix+'paper-i.pdf')) as doc:
        for page in list(doc)[1:18]:
            numbers=sorted((w for w in page.get_text('words') if 38<w[0]<46 and 80<w[1]<780 and re.fullmatch(r'\d{1,2}\.',w[4])),key=lambda w:w[1])
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
                        if value and value!=token and not value.startswith(('S2202-','PLEASE TURN','END OF PAPER','Annual Examinations','ALTERNATE TO PRACTICAL')):
                            lines.append((y,x,value))
                stem,choices=transcribe(n,[value for _,_,value in sorted(lines)])
                code,explanation,feedback=reviews[n]
                old,key,level=official[n]
                rows.append(dict(number=str(n),page=page.number+1,code=code,stem=stem,choices=choices,
                    answer=None if n in (15,25,33) else key,officialAnswer=key,originalSlo=old,originalLevel=level,
                    explanation=explanation,feedback=feedback,
                    diagramUrl=crop(doc,f'paper-i-q{n}',figure,prefix=prefix,directory=assets,url=url) if figure else None))
    assert [int(q['number']) for q in rows]==list(range(1,51))
    (data/'ssc2_2022_past_mcqs.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    main()
