import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {hsscComputerScience2023Papers as papers,hsscComputerScience2023Resources as resources} from '@/lib/hsscComputerScience2023';
import {getFallbackPaper,getAllStandardPapers} from '@/lib/paperDataService';
import {hsscMcqsData} from '@/lib/hsscMcqsData';
import {paperAnswer,paperChoices} from '@/lib/paperPresentation';

describe('Computer Science XI 2023 reviewed publication',()=>{
 it('registers both papers and all source documents without changing their bytes',()=>{
  for(const [part,count] of [[1,50],[2,10]]){
   const code=`CS-XI-2023-P${part}`;
   expect(getFallbackPaper(code)?.questions).toHaveLength(count);
   expect(getAllStandardPapers().some(p=>p.paperCode===code)).toBe(true);
  }
  const originals=['Computer-Science-XI-Paper-I-2023.pdf','Computer-Science-XI-Keys-2023.pdf','Computer-Science-XI-Paper-II-2023.pdf','E-marking-Notes-Computer-Science-XI-2023.pdf'];
  resources.papers.forEach((r,i)=>{
   const dest=readFileSync(path.join(process.cwd(),'public',r.file));
   const original=path.join('C:/Users/Mak Tech/Downloads',originals[i]);
   if(existsSync(original))expect(createHash('sha256').update(dest).digest('hex')).toBe(createHash('sha256').update(readFileSync(original)).digest('hex'));
  });
 });
 it('corrects three source-key errors and excludes six ambiguous questions from scoring',()=>{
  const p=papers[0];
  expect(p.questions.filter(q=>!paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices))).map(q=>q.questionNumber)).toEqual(['5','9','13','14','29','45']);
  for(const [n,old,answer] of [[30,'C','A'],[34,'B','C'],[39,'B','A']] as const){
   const q=p.questions[n-1];expect(q.sourceRegion.official_answer).toBe(old);
   expect(paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices))).toBe(answer);
  }
  for(const q of p.questions){
   expect(Object.keys(paperChoices(q.sourceRegion.choices))).toEqual(['A','B','C','D']);
   expect(q.sourceRegion.option_feedback).toHaveLength(4);
   if(q.diagramBased)expect(existsSync(path.join(process.cwd(),'public',q.sourceRegion.diagramUrl!))).toBe(true);
  }
 });
 it('adds only relevant questions to the correct current class chapters',()=>{
  const xi=hsscMcqsData(11,'/akueb/XI/computer-science','computer-science');
  expect(xi.papers.find(p=>p.code==='CS-XI-2023-P1')?.questions).toHaveLength(44);
  expect(xi.units.flatMap(u=>u.groups.filter(g=>g.paperCode==='CS-XI-2023-P1').flatMap(g=>g.questionIds))).toEqual(['CS-XI-2023-P1-q31','CS-XI-2023-P1-q32']);
  const xii=hsscMcqsData(12,'/akueb/XII/computer-science','computer-science');
  const migrated=xii.papers.find(p=>p.code==='CS-XI-2023-P1');
  expect(migrated?.chapterOnly).toBe(true);expect(migrated?.questions).toHaveLength(7);
  expect(papers[1].questions.filter(q=>q.sourceRegion.in_syllabus).map(q=>q.questionNumber)).toEqual(['1','6','8b']);
 });
 it('keeps typed questions, official response crops and corrected worked solutions distinct',()=>{
  const p=papers[1];
  expect(p.questions.filter(q=>!q.questionNumber.endsWith('b')).reduce((sum,q)=>sum+q.marks,0)).toBe(35);
  for(const q of p.questions){
   expect(q.questionText).toBeTruthy();expect(q.sourceRegion.diagramUrl).toBeUndefined();
   expect(q.sourceRegion.model_answer).toBeTruthy();expect(q.sourceRegion.official_marking_notes).toBeTruthy();
   expect(q.sourceRegion.original_reference_source).toContain('2023-emarking.pdf');
   for(const field of ['better_response_image','weaker_response_image'] as const)expect(existsSync(path.join(process.cwd(),'public',q.sourceRegion[field]!))).toBe(true);
  }
  const sql=p.questions.find(q=>q.questionNumber==='8b')!.sourceRegion.model_answer!;
  expect(sql).toContain("'Arbab', 45, 23, 'Finance'");
  expect(sql).toContain('official e-marking INSERT example uses age 42 and experience 13');
  expect(p.questions.find(q=>q.questionNumber==='6')!.sourceRegion.model_answer).toContain('uniqueness is essential');
 });
});
