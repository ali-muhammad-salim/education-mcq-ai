"""Extract 2024 HSSC-I Computer Science questions and preserve the official key."""
from pathlib import Path
import json,re,pymupdf
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/materials/hssc/computer-science'
URL='/materials/hssc/computer-science/'
def table(headers,rows):
 return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
def crop(doc,n,page,rect):
 folder=ROOT/'public/paper-crops/CS-XI-2024-P1';folder.mkdir(parents=True,exist_ok=True)
 name=f'diagram-{n}.png';doc[page-1].get_pixmap(clip=pymupdf.Rect(rect),matrix=pymupdf.Matrix(2,2)).save(folder/name)
 return '/paper-crops/CS-XI-2024-P1/'+name
key={}
with pymupdf.open(BASE/'computer-science-xi-2024-keys.pdf') as doc:
 for n,old,answer,level in re.findall(r'(\d+)\s+(\d+\.\d+\.\d+)\s+([A-D](?:,[A-D])?|\*)\s+([UKA])',doc[0].get_text()):key[int(n)]=(old,answer,level)
assert len(key)==50
review={}
for line in (ROOT/'data/computer-science/hssc_xi_2024_review.txt').read_text(encoding='utf-8-sig').splitlines():
 head,note=line.split('|',1);n,slo,answer=head.split();review[int(n)]=(slo,answer,note.strip())
questions=[]
with pymupdf.open(BASE/'computer-science-xi-2024-paper-i.pdf') as doc:
 for p in list(doc)[1:]:
  starts=sorted([w for w in p.get_text('words') if 30<w[0]<80 and 85<w[1]<755 and re.fullmatch(r'\d+\.',w[4])],key=lambda w:w[1])
  lines=[l for b in p.get_text('dict')['blocks'] for l in b.get('lines',[]) if l['dir']==(1.,0.)]
  for i,w in enumerate(starts):
   n=int(w[4][:-1]);end=starts[i+1][1]-2 if i+1<len(starts) else 780
   stem=[];choices={};active=None
   for l in lines:
    x,y,_,_=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
    if x<w[0]-1 or not w[1]-1<=y<end or not text or text==w[4] or re.match(r'H2401-|PLEASE TURN|END OF PAPER',text):continue
    m=re.match(r'^([A-D])\.\s*(.*)$',text)
    if m:active=m[1];choices[active]=m[2]
    elif active:choices[active]=(choices[active]+' '+text).strip()
    else:stem.append(text)
   slo,answer,note=review[n];old,official,level=key[n]
   questions.append(dict(number=str(n),page=p.number+1,stem=' '.join(stem).replace('\uf0b7','\n- '),choices=choices,answer=None if answer=='-' else answer,officialAnswer=official,originalSlo=old,level=level,slo=None if slo=='-' else slo.split(':')[1],grade=None if slo=='-' else int(slo.split(':')[0]),explanation=note))
 for n,page,rect in [(27,7,(109,113,307,248)),(42,10,(82,116,318,195)),(45,10,(81,566,279,613))]:
  questions[n-1]['diagramUrl']=crop(doc,n,page,rect)
# Rebuild the multi-column tables without losing column association.
q=questions[20]
q['stem']='The memory contains the following addresses and contents.\n\n'+table(['Address','Content'],[['00100','10101010'],['00101','11001100'],['00110','11110000'],['00111','00110011']])+'\n\nIf PC holds 00101 at the beginning of the fetch cycle, what are the values placed in MAR and IR?'
q['choices']={k:table(['MAR','IR'],[row]) for k,row in zip('ABCD',[['00101','11001100'],['00110','11110000'],['00111','00110011'],['00100','10101010']])}
questions[28]['stem']='Which option describes memory-chip placement on both sides of SIMM and DIMM modules?'
questions[28]['choices']={k:table(['SIMM','DIMM'],[row]) for k,row in zip('ABCD',[['Yes','Yes'],['Yes','No'],['No','Yes'],['No','No']])}
vehicle=table(['Reg_No','Company','Model','Color','Year'],[['V121','Fonda','Rezel','White','2019'],['V122','Photon','Gaga','Black','2022'],['V123','Buzuki','Gultus','Silver','2021'],['V124','Toyoto','Norolla','Black','2020'],['V125','Buzuki','Diaz','Grey','2019']])
headers=['Grid row','Reg_No','Company','Model','Color','Year']
questions[48]['stem']='Use the Vehicle table below. Which design-view query changes Buzuki Gultus from Silver to Black?\n\n'+vehicle
questions[48]['choices']={k:table(headers,rows) for k,rows in zip('ABCD',[
 [['Update To','','','','Black',''],['Criteria','="V123"','','','','']],
 [['Update To','','','','Black',''],['Criteria','','="Buzuki"','','','']],
 [['Update To','','','','Silver',''],['Criteria','','="Buzuki"','','','']],
 [['Update To','','','','Silver',''],['Criteria','="V123"','="Buzuki"','','','']]])}
questions[49]['stem']='Use the Vehicle table below. Which design-view delete query removes the Buzuki Diaz record?\n\n'+vehicle
questions[49]['choices']={k:table(headers,[['Delete','Where','Where','Where','Where','Where'],*rows]) for k,rows in zip('ABCD',[
 [['Criteria','','="Diaz"','','','']],
 [['Criteria','','="Buzuki"','="Diaz"','','']],
 [['Criteria','','','','','="2019"']],
 [['Criteria','','="Buzuki"','','',''],['Or','','','="Diaz"','','']]])}
for n in [46,47,48]:
 questions[n-1]['choices']={k:'```sql\n'+v+'\n```' for k,v in questions[n-1]['choices'].items()}
feedback={}
for line in (ROOT/'data/computer-science/hssc_xi_2024_feedback.txt').read_text(encoding='utf-8-sig').splitlines():
 n,*reasons=[item.strip() for item in line.split('|')]
 assert len(reasons)==4
 feedback[n]=[{'key':k,'reason':v} for k,v in zip('ABCD',reasons)]
for q in questions:q['feedback']=feedback[q['number']]
assert [q['number'] for q in questions]==list(map(str,range(1,51)))
assert all(set(q['choices'])==set('ABCD') for q in questions)
(ROOT/'data/computer-science/hssc_xi_2024_mcqs.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('50 questions with original keys, reviewed answers and mappings')
