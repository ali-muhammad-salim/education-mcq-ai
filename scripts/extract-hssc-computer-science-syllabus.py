"""Extract the official HSSC Computer Science 2025 outcomes and activities."""
import json
from pathlib import Path
import re
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT/'public/materials/hssc/computer-science/computer-science-hssc-syllabus-2025.pdf'

def compact(value):
    return ' '.join(value.split())

def prose(lines):
    result = ''
    for line in lines:
        text = compact(line)
        if not text:
            continue
        if re.fullmatch(r'[a-z]\.', text):
            result += '\n'+text+' '
        elif re.match(r'^[a-z]\.\s', text):
            result += '\n'+text
        else:
            result += ' '+text
    return result.strip()

def units(pdf, first, last):
    result = []
    for number in range(first,last+1):
        page = pdf[number-1]
        words = page.get_text('words')
        codes = sorted([w for w in words if 275<w[0]<330 and re.fullmatch(r'\d+\.\d+\.\d+',w[4])],key=lambda w:w[1])
        heads = sorted([w for w in words if 60<w[0]<125 and re.fullmatch(r'\d+\.(?:\d+)?',w[4])],key=lambda w:w[1])
        marks = [w for w in words if w[0]>660 and (w[4]=='*' or w[1]>95) and w[4] in ('*','A','An','E','C','FA','FA2')]
        lines = [l for b in page.get_text('dict')['blocks'] for l in b.get('lines',[])]
        for head in heads:
            token=head[4]
            bottom=min([w[1] for w in heads if w[1]>head[1]+2],default=520)
            text=compact(page.get_text(clip=pymupdf.Rect(head[2]+.3,head[1]-.5,280,bottom)))
            if token.endswith('.'):
                unit=dict(unitNumber=int(token[:-1]),name=text,subtopics=[])
                result.append(unit)
            else:
                topic=next((t for t in unit['subtopics'] if t['subtopicNumber']==token),None)
                if topic is None:
                    topic=dict(subtopicNumber=token,name=token+' '+text,slos=[])
                    unit['subtopics'].append(topic)
        for i, code in enumerate(codes):
            token=code[4]
            topic=next(t for u in result for t in u['subtopics'] if t['subtopicNumber']==token.rsplit('.',1)[0])
            bottom=codes[i+1][1] if i+1<len(codes) else 520
            body=prose([''.join(s['text'] for s in l['spans']) for l in lines
                if l['dir']==(1.,0.) and 325<l['bbox'][0]<660 and code[1]-1<=l['bbox'][1]<bottom-1])
            matches=[m for m in marks if abs(m[1]-code[1])<8]
            assert len(matches)==1,(number,token,matches)
            mark=matches[0]
            level=mark[4].removesuffix('2') if mark[4]!='*' else 'R' if mark[0]<690 else 'U' if mark[0]<735 else 'A'
            assert body,(number,token)
            topic['slos'].append(dict(code=token,description=body,cognitiveLevel=level,sourcePage=number))
    return result

def practicals(pdf,first,last,chapter):
    rows=[]
    for number in range(first,last+1):
        for table in pdf[number-1].find_tables().tables:
            for cells in table.extract():
                firstcell=compact(cells[0] or '')
                match=re.fullmatch(r'(\d+)\.',firstcell)
                activity=cells[1] or ''
                if match:
                    rows.append(dict(number=int(match[1]),chapter=chapter,activity=prose(activity.splitlines()),apparatus='Computer · '+('MS SQL' if chapter==11 and int(match[1])>=15 else 'Python IDE')))
                elif rows and not firstcell and activity and not activity.startswith('Topic'):
                    rows[-1]['activity']+=' '+prose(activity.splitlines())
    assert [r['number'] for r in rows]==list(range(1,len(rows)+1)),rows
    for row in rows:
        row['activity']=row['activity'].strip()
    assert all(r['activity'] for r in rows)
    return rows

if __name__=='__main__':
    with pymupdf.open(PDF) as pdf:
        data={}
        for grade,first,last,lab,end,spec,chapter in [(11,10,26,40,41,47,3),(12,27,38,42,43,48,11)]:
            u=units(pdf,first,last)
            p=practicals(pdf,lab,end,chapter)
            codes=[s['code'] for x in u for t in x['subtopics'] for s in t['slos']]
            assert len(codes)==len(set(codes))
            data[str(grade)]=dict(units=u,practicals=p,assessmentPage=spec,practicalPage=lab)
            print(grade,len(u),len(codes),len(p))
    (ROOT/'data/computer-science/hssc_syllabus_2025.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')






