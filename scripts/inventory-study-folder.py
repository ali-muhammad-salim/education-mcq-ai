"""Read-only PDF inventory; never renames/deletes the source collection."""
import argparse, hashlib, json, re
from collections import defaultdict
from pathlib import Path
import pymupdf

def digest(value):
    return hashlib.sha256(value).hexdigest()

def inventory(root, destination):
    records=[]
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        row={'relativePath':str(path.relative_to(root)), 'path':str(path.resolve()), 'bytes':path.stat().st_size, 'sha256':digest(path.read_bytes())}
        try:
            with pymupdf.open(path) as doc:
                texts=[page.get_text(sort=True) for page in doc]
                row.update(pages=len(doc),encrypted=bool(doc.needs_pass),textCharacters=sum(map(len,texts)),
                           textHash=digest('\n\f\n'.join(re.sub(r'\s+',' ',t).strip() for t in texts).encode()),
                           firstPages='\n'.join(texts[:2])[:11000],lastPages='\n'.join(texts[-3:])[-13000:],
                           pageTextLengths=[len(t) for t in texts])
        except Exception as error:
            row['error']=type(error).__name__+': '+str(error)[:300]
        records.append(row)
    hashes=defaultdict(list);text_hashes=defaultdict(list)
    for row in records:
        hashes[row['sha256']].append(row['relativePath'])
        if row.get('textCharacters',0)>100: text_hashes[row['textHash']].append(row['relativePath'])
    result={'root':str(root.resolve()),'fileCount':len(records),'totalBytes':sum(r['bytes'] for r in records),'totalPages':sum(r.get('pages',0) for r in records),'uniqueBytes':len(hashes),'exactDuplicates':[v for v in hashes.values() if len(v)>1],'matchingTextCandidates':[v for v in text_hashes.values() if len(v)>1],'files':records}
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='files'},ensure_ascii=False,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('root',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();inventory(args.root,args.output)
