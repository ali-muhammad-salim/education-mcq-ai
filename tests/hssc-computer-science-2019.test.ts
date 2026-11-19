import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import StructuredContent from '@/components/StructuredContent';
import {hsscComputerScience2019Papers as papers,hsscComputerScience2019Resources as resources} from '@/lib/hsscComputerScience2019';
import {getFallbackPaper,getAllStandardPapers} from '@/lib/paperDataService';
import {hsscMcqsData} from '@/lib/hsscMcqsData';
import {paperAnswer,paperChoices} from '@/lib/paperPresentation';
import {resolveQuestionDiagram} from '@/lib/diagramResolver';

describe('Computer Science XI 2019 reviewed publication',()=>{
 it('preserves the original files, timing, marks and both ERQ alternatives',()=>{
  expect(resources.papers).toHaveLength(4);
  expect(papers[0].questions).toHaveLength(30);expect(papers[0].durationMinutes).toBe(45);expect(papers[0].totalMarks).toBe(30);
  expect(papers[1].questions).toHaveLength(11);expect(papers[1].durationMinutes).toBe(135);expect(papers[1].totalMarks).toBe(55);
  expect(papers[1].questions.filter(q=>q.questionNumber!=='10b').reduce((s,q)=>s+q.marks,0)).toBe(55);
  expect(papers[1].questions.filter(q=>q.sourceRegion.choice_group==='10').map(q=>q.questionNumber)).toEqual(['10a','10b']);
  const originals=['Computer-Science-XI-Paper-I-2019.pdf','Computer-Science-XI-Keys-2019-1.pdf','Computer-Science-XI-Paper-II-2019.pdf','E-marking-Notes-Computer-Science-XI-2019.pdf'];
  resources.papers.forEach((r,i)=>{
   const dest=readFileSync(path.join(process.cwd(),'public',r.file));
   const original=path.join('C:/Users/Mak Tech/Downloads',originals[i]);
   if(existsSync(original))expect(createHash('sha256').update(dest).digest('hex')).toBe(createHash('sha256').update(readFileSync(original)).digest('hex'));
  });
  for(const p of papers){expect(getFallbackPaper(p.paperCode)?.questions).toHaveLength(p.questions.length);expect(getAllStandardPapers().some(x=>x.paperCode===p.paperCode)).toBe(true);}
 });
 it('resolves the withdrawn switch question without overwriting original key decisions',()=>{
  const p=papers[0];const switchQuestion=p.questions[11];
  expect(switchQuestion.sourceRegion.official_answer).toBe('*');expect(switchQuestion.sourceRegion.answer_status).toBe('ANSWER_CORRECTED');
  expect(paperAnswer(switchQuestion.sourceRegion,paperChoices(switchQuestion.sourceRegion.choices))).toBe('B');
  expect(p.questions[13].sourceRegion.official_answer).toBe('C,B');
  expect(p.questions.filter(q=>!paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices))).map(q=>q.questionNumber)).toEqual(['14','30']);
  for(const q of p.questions){expect(q.questionText).toBeTruthy();expect(Object.keys(paperChoices(q.sourceRegion.choices))).toEqual(['A','B','C','D']);expect(q.sourceRegion.option_feedback).toHaveLength(4);}
 });
 it('renders real visual choices, literal paths and formulas, and complete source examples',()=>{
  for(const text of Object.values(paperChoices(papers[0].questions[14].sourceRegion.choices))){
   const html=renderToStaticMarkup(React.createElement(StructuredContent,{text}));
   expect(html).toContain('<img');expect(html).not.toContain('![');
   expect(existsSync(path.join(process.cwd(),'public',/\(([^)]+)\)/.exec(text)![1]))).toBe(true);
  }
  for(const index of [26,28])for(const text of Object.values(paperChoices(papers[0].questions[index].sourceRegion.choices))){
   const html=renderToStaticMarkup(React.createElement(StructuredContent,{text}));expect(html).toContain('<code');expect(html).not.toContain('katex');
  }
  for(const q of papers[1].questions){
   expect(q.sourceRegion.model_answer).toBeTruthy();
   expect(q.sourceRegion.better_response).toBeTruthy();expect(q.sourceRegion.weaker_response).toBeTruthy();
   for(const field of ['better_response_image','weaker_response_image'] as const)expect(existsSync(path.join(process.cwd(),'public',q.sourceRegion[field]!))).toBe(true);
  }
  expect(papers[1].questions.filter(q=>q.sourceRegion.diagramUrl).map(q=>q.questionNumber)).toEqual(['10a']);
  for(const n of ['1','10','15','20','25','30'])expect(resolveQuestionDiagram('CS-XI-2019-P1',n,{diagramBased:true})).toBeUndefined();
  const erq=papers[1].questions.find(q=>q.questionNumber==='10a')!;
  expect(resolveQuestionDiagram('CS-XI-2019-P2','10a',erq)).toBe(erq.sourceRegion.diagramUrl);
 });
 it('corrects spreadsheet counts and exact font-size instructions in the worked answers',()=>{
  const excel=papers[1].questions.find(q=>q.questionNumber==='9')!.sourceRegion.model_answer!;
  expect(excel).toContain('=COUNTA(A3:A9)');expect(excel).toContain('=COUNTIF(D3:D9,">=30")');
  const ages=[32,26,29,30,28,27,31];expect(ages.reduce((a,b)=>a+b,0)/ages.length).toBe(29);expect(ages.filter(a=>a>=30)).toHaveLength(3);
  expect(papers[1].questions.find(q=>q.questionNumber==='8')!.sourceRegion.model_answer).toContain('`Ctrl+[` four times');
  for(const text of [papers[1].questions.find(q=>q.questionNumber==='9')!.sourceRegion.better_response!,papers[0].questions[7].questionText])expect(renderToStaticMarkup(React.createElement(StructuredContent,{text}))).not.toContain('katex');
  expect(papers[1].questions.find(q=>q.questionNumber==='2')!.sourceRegion.model_answer).toContain('Using decimal SI units consistently');
 });
 it('routes only current outcomes into chapter practice and keeps historical topics explicit',()=>{
  const xi=hsscMcqsData(11,'/akueb/XI/computer-science','computer-science');
  expect(xi.papers.find(p=>p.code==='CS-XI-2019-P1')?.questions).toHaveLength(28);
  expect(xi.units.flatMap(u=>u.groups.filter(g=>g.paperCode==='CS-XI-2019-P1').flatMap(g=>g.questionIds))).toHaveLength(4);
  expect(papers[0].questions.filter(q=>q.sourceRegion.in_syllabus).map(q=>q.questionNumber)).toEqual(['6','10','20','26']);
  const erq=papers[1].questions.find(q=>q.questionNumber==='10b')!;
  expect(erq.slos?.map(s=>s.slo.code)).toEqual(['1.8.1','1.8.2']);
  expect(papers[1].questions.filter(q=>q.sourceRegion.in_syllabus).map(q=>q.questionNumber)).toEqual(['10b']);
 });
});
