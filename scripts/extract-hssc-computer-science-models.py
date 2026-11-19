"""Extract editable HSSC Computer Science question text from the official model PDFs."""
from pathlib import Path
import json,re
import pymupdf

ROOT=Path(__file__).resolve().parents[1]
PDFS=ROOT/'public/materials/hssc/computer-science'

def extract(roman):
    doc=pymupdf.open(PDFS/f'computer-science-model-{roman.lower()}-i.pdf')
    rows=[]
    for page in list(doc)[1:]:
        words=page.get_text('words')
        starts=sorted([w for w in words if 30<w[0]<80 and 85<w[1]<755 and re.fullmatch(r'\d{1,2}\.',w[4])],key=lambda w:w[1])
        lines=[l for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) if l['dir']==(1.,0.)]
        for i,w in enumerate(starts):
            n=int(w[4][:-1]); bottom=starts[i+1][1]-2 if i+1<len(starts) else 780
            region=[]
            for l in lines:
                x,y,_,_=l['bbox'];text=''.join(s['text'] for s in l['spans']).strip()
                if x<w[0]-1 or not w[1]-2<=y<bottom or not text or text==w[4]:continue
                if re.match(r'AKU-EB|Model Paper|for Teaching|Page \d+|PLEASE TURN|END OF PAPER|Computer Science Model',text):continue
                region.append((x,y,text))
            choices={};stem=[];active=None
            for x,y,text in region:
                m=re.match(r'^([ABCD])\.\s*(.*)$',text)
                if m:
                    active=m[1];choices[active]=m[2]
                elif active:choices[active]=(choices[active]+' '+text).strip()
                else:stem.append(text)
            rows.append(dict(number=n,page=page.number+1,stem=' '.join(stem),choices=choices,region=[w[0],w[1],555,bottom]))
    assert [q['number'] for q in rows]==list(range(1,51))
    return rows

if __name__=='__main__':
    data={roman:extract(roman) for roman in ['XI','XII']}
    overrides=json.loads((ROOT/'data/computer-science/hssc_model_transcription_overrides.json').read_text(encoding='utf-8'))
    for roman,rows in data.items():
        for row in rows:
            row.update(overrides.get(roman,{}).get(str(row['number']),{}))
            if '```' not in row['stem']:
                row['stem']=' '.join(row['stem'].split()).replace('\uf0b7', '\n- ')
    (ROOT/'data/computer-science/hssc_model_transcripts.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for roman,rows in data.items():
        print(roman,'50 questions;',[(q['number'],len(q['choices'])) for q in rows if len(q['choices'])!=4])

