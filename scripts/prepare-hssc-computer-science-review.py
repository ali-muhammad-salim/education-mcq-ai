"""Compile reviewed answers and per-option feedback with syllabus validation."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]/'data/computer-science'
syllabus=json.loads((ROOT/'hssc_syllabus_2025.json').read_text(encoding='utf-8'))
for roman,grade in [('xi','11'),('xii','12')]:
    feedback={}
    for line in (ROOT/f'hssc_{roman}_model_option_feedback.txt').read_text(encoding='utf-8-sig').splitlines():
        n,*reasons=[item.strip() for item in line.split('|')]
        assert len(reasons)==4 and all(reasons),(roman,n)
        feedback[n]=[{'key':key,'reason':reason} for key,reason in zip('ABCD',reasons)]
    reviews={}
    for line in (ROOT/f'hssc_{roman}_model_answer_review.txt').read_text(encoding='utf-8-sig').splitlines():
        head,note=line.split('|',1)
        number,slo,answer=head.split()
        reviews[number]={'slo':slo,'answer':None if answer=='-' else answer,'explanation':note.strip(),
            'status':'KEY_CONFLICT' if answer=='-' else 'PROJECT_REVIEWED','origin':'PROJECT_REVIEW',
            'feedback':feedback[number]}
    valid={s['code'] for u in syllabus[grade]['units'] for t in u['subtopics'] for s in t['slos']}
    assert set(reviews)==set(feedback)==set(map(str,range(1,51)))
    assert all(q['slo'] in valid for q in reviews.values())
    (ROOT/f'hssc_{roman}_model_answer_review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(roman,len(reviews),'reviews,',sum(q['answer'] is None for q in reviews.values()),'source conflicts, 200 option explanations')
