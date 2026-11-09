"""Compare stored printed keys with the supplied PDFs, independently of manifest key rows."""
import pathlib,json,re,pymupdf
report=[];issues=[];total=0
for p in sorted(pathlib.Path('data/mathematics').glob('*source_manifest.json')):
 m=json.loads(p.read_text(encoding='utf8'));d=pymupdf.open('public'+m['sources']['key']['url']);keys={};previous=0
 for pg in d:
  for table in pg.find_tables().tables:
   for row in table.extract():
    if not row or not row[0]:continue
    ids=row[0].splitlines();idx=1 if len(row)==3 else 2
    if len(row)<=idx or not row[idx]:continue
    ans=row[idx].splitlines()
    if len(ids)!=len(ans) or any(not re.fullmatch(r'[ABCD](?:[,/][ABCD])*|\*|•',s.strip()) for s in ans):continue
    for number,answer in zip(ids,ans):
     if re.fullmatch(r'\d+\.?',number.strip()):n=int(number.strip().rstrip('.'))
     elif number.strip() in ['II','IJ','IS','JI','J2','J3','J4','J5','J6','J7','J8','J9','JO']:n=previous+1
     else:continue
     keys[n]=answer.strip();previous=n
 qs=json.loads(p.with_name(p.name.replace('source_manifest','past_mcqs')).read_text(encoding='utf8'));bad=[]
 for q in qs:
  n=int(q['questionNumber'])
  if n not in keys:bad.append({'question':n,'issue':'Key row extraction needs visual review'})
  elif q['official_answer']!=keys[n] and not {q['official_answer'],keys[n]}.issubset({'*','•'}):bad.append({'question':n,'stored':q['official_answer'],'printed':keys[n]})
 total+=len(keys);report.append({'source':p.name,'rows':len(keys),'questions':len(qs),'issues':bad});issues.extend({'source':p.name,**b} for b in bad)
output_dir=pathlib.Path('output/mathematics-full-audit')
output_dir.mkdir(parents=True,exist_ok=True)
out={'printedKeyRowsRead':total,'papers':report,'issues':issues};(output_dir/'printed-key-comparison.json').write_text(json.dumps(out,indent=2),encoding='utf8');print(json.dumps({'printedKeyRowsRead':total,'issues':issues},indent=2))

if issues: raise SystemExit(1)
