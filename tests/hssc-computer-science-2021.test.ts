import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import StructuredContent from '@/components/StructuredContent';
import {hsscComputerScience2021Papers as papers,hsscComputerScience2021Resources as resources} from '@/lib/hsscComputerScience2021';
import {getFallbackPaper,getAllStandardPapers} from '@/lib/paperDataService';
import {hsscMcqsData} from '@/lib/hsscMcqsData';
import {paperAnswer,paperChoices} from '@/lib/paperPresentation';

const paper=papers[0];
describe('Computer Science XI 2021 combined publication',()=>{
 it('preserves all 65 theory/ATP items, raw marks and original files',()=>{
  expect(paper.questions).toHaveLength(65);expect(paper.totalMarks).toBe(65);expect(paper.durationMinutes).toBe(130);
  expect(paper.questions.filter(q=>q.sourceRegion.assessmentSection==='Theory')).toHaveLength(50);
  expect(paper.questions.filter(q=>q.sourceRegion.assessmentSection==='Alternate to Practical')).toHaveLength(15);
  expect(paper.markScalingNote).toContain('equated to 85');
  expect(getFallbackPaper(paper.paperCode)?.questions).toHaveLength(65);
  expect(getAllStandardPapers().some(p=>p.paperCode===paper.paperCode)).toBe(true);
  expect(resources.papers).toHaveLength(2);
  resources.papers.forEach((r,i)=>{
   const bytes=readFileSync(path.join(process.cwd(),'public',r.file));
   const original=`C:/Users/Mak Tech/Downloads/Computer-Science-XI-${i?'Keys':'Paper'}-2021.pdf`;
   if(existsSync(original))expect(createHash('sha256').update(bytes).digest('hex')).toBe(createHash('sha256').update(readFileSync(original)).digest('hex'));
  });
 });
 it('preserves alternate keys, corrects incorrect keys and explains every option',()=>{
  const held=paper.questions.filter(q=>!paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices)));
  expect(held.map(q=>q.questionNumber)).toEqual(['19','26','48']);
  expect(paper.questions[25].sourceRegion.official_answer).toBe('A,C');
  for(const [n,old,correct] of [[38,'B','C'],[62,'B','D']] as const){
   const q=paper.questions[n-1];expect(q.sourceRegion.official_answer).toBe(old);
   expect(paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices))).toBe(correct);
  }
  for(const q of paper.questions){
   expect(q.questionText.length).toBeGreaterThan(15);
   expect(Object.keys(paperChoices(q.sourceRegion.choices))).toEqual(['A','B','C','D']);
   expect(q.sourceRegion.option_feedback).toHaveLength(4);
   expect(q.sourceRegion.explanation).toBeTruthy();
  }
  expect(paper.questions[47].sourceRegion.explanation).toContain('Like "J???"');
 });
 it('renders practical queries as complete tables and SQL as literal code',()=>{
  for(const n of [6,11,13,36,58,59,60,61,62]){
   for(const option of Object.values(paperChoices(paper.questions[n-1].sourceRegion.choices))){
    const html=renderToStaticMarkup(React.createElement(StructuredContent,{text:option}));
    expect(html).toContain('<table');expect(html).toContain('overflow-x:auto');
   }
  }
  const update=paperChoices(paper.questions[52].sourceRegion.choices).C;
  expect(update).toContain("JoiningDate = '29/04/2016', Salary = 65000");
  const html=renderToStaticMarkup(React.createElement(StructuredContent,{text:update}));
  expect(html).toContain('<code');expect(html).not.toContain('katex');
  for(const text of [paper.questions[40].questionText,...Object.values(paperChoices(paper.questions[18].sourceRegion.choices))]){
   expect(renderToStaticMarkup(React.createElement(StructuredContent,{text}))).not.toContain('katex');
  }
  expect(paper.questions[61].sourceRegion.explanation).toContain('separate OR rows');
  for(const n of [30,43,55,57])expect(existsSync(path.join(process.cwd(),'public',paper.questions[n-1].sourceRegion.diagramUrl!))).toBe(true);
 });
 it('routes only applicable outcomes into the current XI and XII chapters',()=>{
  const xi=hsscMcqsData(11,'/akueb/XI/computer-science','computer-science');
  expect(xi.papers.find(p=>p.code===paper.paperCode)?.questions).toHaveLength(62);
  expect(xi.units.flatMap(u=>u.groups.filter(g=>g.paperCode===paper.paperCode).flatMap(g=>g.questionIds))).toEqual(['CS-XI-2021-P1-q30','CS-XI-2021-P1-q37']);
  const xii=hsscMcqsData(12,'/akueb/XII/computer-science','computer-science').papers.find(p=>p.code===paper.paperCode);
  expect(xii?.chapterOnly).toBe(true);expect(xii?.questions).toHaveLength(19);
  expect(paper.questions.filter(q=>q.sourceRegion.mapping_status==='NO_DIRECT_OUTCOME').every(q=>!q.slos?.length)).toBe(true);
 });
});
