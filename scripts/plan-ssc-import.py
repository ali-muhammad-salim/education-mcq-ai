"""Build an explicit, reviewable import plan from this SSC collection inventory."""
import argparse,json,re
from collections import Counter
from pathlib import Path
import pymupdf

SUBJECTS={'Computer':'Computer Science','English':'English Compulsory','Urdu Compulsory':'Urdu Compulsory','Mathematics (Humanities Group)':'Mathematics Humanities Group','Mathematics (Science Group)':'Mathematics Science Group'}
def number(value):return {'IX':9,'X':10,'9':9,'10':10}[value.upper()]
def roman(grade):return {9:'IX',10:'X'}[grade]
def build(inventory,activation):
    items=[];seen=set();issues=[]
    for row in inventory['files']:
        if row['sha256'] in seen:continue
        seen.add(row['sha256'])
        path=Path(row['relativePath']);folder=path.parts[0];name=path.name.lower();subject=SUBJECTS.get(folder,folder)
        with pymupdf.open(row['path']) as doc:texts=[re.sub(r'\s+',' ',page.get_text(sort=True)) for page in doc]
        head=' '.join(texts[:2]);alltext=' '.join(texts);notes=[]
        if 'syllabus' in name:
            kind='syllabus';classes=[10] if folder=='Pakistan Studies' else [9] if folder in ['Ethics','Islamiyat'] else [9,10]
            if folder in ['Ethics','Islamiyat'] and 'urdu' in name:kind='syllabus_companion';notes.append('Urdu companion to the English canonical syllabus; do not replace its outcomes.')
            if folder=='Chemistry' and name=='chemistry-ssc-i-syllabus-2025.pdf':kind='syllabus_companion';notes.append('The full extracted text matches the final copy but page rendering differs. Preserve this source variant for comparison without replacing canonical outcomes.')
        elif 'anthology' in name:kind='textbook';classes=[10 if re.search(r'ssc-ii\b',name) else 9]
        elif 'listening' in name:kind='listening_material';classes=[]
        elif 'practical' in name:kind='practical_paper';classes=[]
        elif 'pacing' in name:kind='pacing_guide';classes=[]
        elif 'guide-for-teachers' in name:kind='teacher_guide';classes=[9,10]
        elif 'resource' in name and 'guide' in name:kind='resource_guide';classes=[]
        elif 'model' in name:kind='model_paper';classes=[]
        else:issues.append(row['relativePath']+': unclassified type');continue
        if not classes:
            if row['relativePath']=='Computer\\pacing-guide-for-ssc-computer-science-2025.pdf':classes=[9];notes.append('Grade IX verified visually on the cover; extracted title text has broken reading order.')
            if row['relativePath']=='English\\resource-guide-2025-ssc-english-compulsory-final.pdf':classes=[9,10];notes.append('Cover explicitly states that the recommended texts apply to Grades IX and X.')
        if not classes:
            if kind=='resource_guide':
                found=[]
                for text in texts:
                    for hit in re.finditer(r'Teaching\s+and\s+Learning\s+Resources\s+(?:for\s+)?Grades?\s+(IX|X|9|10)\b(?:\s*(?:&|and|,)\s*(?:Grade\s*)?(IX|X|9|10)\b)?',text,re.I):
                        found.extend(number(v) for v in hit.groups() if v)
                classes=sorted(set(found))
            if not classes:
                match=re.search(r'CLASS\s+(IX|X)\b',head,re.I) if kind in ['model_paper','practical_paper','listening_material'] else None
                if match:classes=[number(match[1])]
                elif re.search(r'(?:ssc-ii\b|(?:^|-)x(?:-|\.)|grade-10)',name):classes=[10]
                elif re.search(r'(?:ssc-i\b|(?:^|-)ix(?:-|\.)|grade-9)',name):classes=[9]
                elif folder=='Pakistan Studies':classes=[10]
                elif folder in ['Ethics','Islamiyat','Urdu Compulsory']:classes=[9]
                else:issues.append(row['relativePath']+': class needs review');continue
        medium=' · Urdu' if folder in ['Islamiyat','Ethics'] and 'urdu' in name else ' · English' if folder in ['Islamiyat','Ethics'] and 'english' in name else ''
        labels={'syllabus':'Syllabus','syllabus_companion':'Other syllabus copy','textbook':'Anthology','listening_material':'Listening instructions' if 'instruction' in name else 'Listening passages','practical_paper':'Practical paper','pacing_guide':'Pacing guide','resource_guide':'Resource guide','teacher_guide':'Teacher guide','model_paper':'Model paper'}
        classlabel='Class '+('IX–X' if classes==[9,10] else roman(classes[0]))
        component='paper_3' if kind=='practical_paper' else 'paper_2' if re.search(r'paper-ii\b',name) else 'paper_1' if re.search(r'paper-i\b',name) else None
        label=labels[kind]+(' II' if component=='paper_2' else ' I' if component=='paper_1' and kind=='model_paper' else '')
        title=f'{subject} · {classlabel} · {label}{medium}'
        entry={'relativePath':row['relativePath'],'sha256':row['sha256'],'subject':subject,'classLevel':'Class '+roman(classes[0]),'classLevels':classes,'resourceType':kind,'title':title,'publishAfterReview':True,'studyResources':kind=='textbook'}
        if component:entry['paperComponent']=component
        if kind in ['model_paper','practical_paper']:
            year=re.search(r'MODEL\s+EXAMINATION\s+PAPER\s+(\d{4})',head,re.I)
            if not year:issues.append(row['relativePath']+': printed model year needs review')
            else:entry['examYear']=year[1];entry['title']+=' · '+year[1]+(' onwards' if 'ONWARDS' in head.upper() else '')
        if kind=='syllabus':entry['syllabusEffectiveFrom']=activation;notes.append('Owner authorized the newest verified edition as the study default on '+activation+'; this is site activation, not a claim of a printed publication day.')
        if notes:entry['note']=' '.join(notes)
        items.append((entry,row['pages']))
    syllabuses={entry['subject']:entry['sha256'] for entry,_ in items if entry['resourceType']=='syllabus'}
    for entry,_ in items:
        if entry['resourceType'] in ['model_paper','past_paper','practical_paper','textbook']:
            entry['syllabusSourceSha256']=syllabuses[entry['subject']]
        if entry['resourceType']=='textbook':
            entry['studyKinds']=['CHAPTER_NOTES','CHEAT_SHEET','FLASHCARDS','PRACTICE_SET','CHAPTER_READER']
    # A short, single-class guide proves the live source pipeline before long syllabuses.
    items.sort(key=lambda pair:(0 if pair[0]['relativePath'].endswith('resources-guide-computer-science-x-2026-final.pdf') else 1 if pair[0]['resourceType']=='syllabus' else 2 if pair[0]['resourceType'] in ['model_paper','practical_paper'] else 3,pair[0]['subject'],pair[0]['relativePath']))
    return {'version':1,'board':'AKU-EB','entries':[entry for entry,_ in items]},issues,Counter(entry['resourceType'] for entry,_ in items)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('inventory',type=Path);parser.add_argument('output',type=Path);parser.add_argument('--activate-on',required=True);args=parser.parse_args()
    data=json.loads(args.inventory.read_text(encoding='utf-8'));manifest,issues,counts=build(data,args.activate_on)
    args.output.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'planned':len(manifest['entries']),'types':dict(counts),'issues':issues},ensure_ascii=False,indent=2))
