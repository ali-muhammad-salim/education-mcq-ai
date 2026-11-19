"""Extract 2023 HSSC-I Computer Science questions and preserve the official key."""
from pathlib import Path
import json,re,pymupdf
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/materials/hssc/computer-science'
URL='/materials/hssc/computer-science/'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
def crop(doc,n,page,rect):
 folder=ROOT/'public/paper-crops/CS-XI-2023-P1';folder.mkdir(parents=True,exist_ok=True)
 name=f'diagram-{n}.png';doc[page-1].get_pixmap(clip=pymupdf.Rect(rect),matrix=pymupdf.Matrix(2,2)).save(folder/name)
 return '/paper-crops/CS-XI-2023-P1/'+name
key={}
with pymupdf.open(BASE/'computer-science-xi-2023-keys.pdf') as doc:
 for n,old,answer,level in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D](?:,[A-D])?|\*)\s+([UKA])',doc[0].get_text()):key[int(n)]=(old,answer,level)
assert len(key)==50
questions=[]
with pymupdf.open(BASE/'computer-science-xi-2023-paper-i.pdf') as doc:
 for p in list(doc)[1:]:
  starts=sorted([w for w in p.get_text('words') if 30<w[0]<80 and 85<w[1]<755 and re.fullmatch(r'\d+\.',w[4])],key=lambda w:w[1])
  lines=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) if l['dir']==(1.,0.)]
  for i,w in enumerate(starts):
   n=int(w[4][:-1]);end=starts[i+1][1]-2 if i+1<len(starts) else 780
   stem=[];choices={};active=None
   for l in lines:
    x,y,_,_=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
    if x<w[0]-1 or not w[1]-1<=y<end or not text or text==w[4] or re.match(r'H2301-|PLEASE TURN|END OF PAPER',text):continue
    m=re.match(r'^([A-D])\.\s*(.*)$',text)
    if m:active=m[1];choices[active]=m[2]
    elif active:choices[active]=(choices[active]+' '+text).strip()
    else:stem.append(text)
   old,official,level=key[n]
   questions.append(dict(number=str(n),page=p.number+1,stem=' '.join(stem).replace('\uf0b7','\n- '),choices=choices,answer=official,officialAnswer=official,originalSlo=old,level=level,slo=None,grade=None))
 for n,page in [(27,6),(42,9),(44,10)]:
  rect=doc[page-1].get_image_info()[0]['bbox'];questions[n-1]['diagramUrl']=crop(doc,n,page,rect)
assert len(questions)==50
(ROOT/'data/computer-science/hssc_xi_2023_mcqs.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for q in questions:print(q['number'],q['stem'],q['choices'])
