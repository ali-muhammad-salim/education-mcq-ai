import {describe,it,expect} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import StructuredContent from '../components/StructuredContent';
import {hsscComputerScience2024Papers} from '../lib/hsscComputerScience2024';
import {getFallbackPaper} from '../lib/paperDataService';
import {hsscMcqsData} from '../lib/hsscMcqsData';
import {paperAnswer,paperChoices} from '../lib/paperPresentation';
import marking from '../data/computer-science/hssc_xi_2024_written.json';
describe('Computer Science XI 2024 source review',()=>{
 it('keeps database field names literal and contains wide tables',()=>{
  const html=renderToStaticMarkup(React.createElement(StructuredContent,{text:'| Reg_No | Company |\n| --- | --- |\n| V123 | Buzuki |'}));
  expect(html).toContain('Reg_No');
  expect(html).not.toContain('katex');
  expect(html).toContain('min-width:0');
  expect(html).toContain('overflow-x:auto');
  expect(html).toContain('max-width:100%');
 });
 it('preserves source keys while correcting the fetch-cycle error',()=>{
  const p=hsscComputerScience2024Papers[0];expect(p.questions).toHaveLength(50);
  expect(p.questions[20].sourceRegion.official_answer).toBe('D');
  expect(paperAnswer(p.questions[20].sourceRegion,paperChoices(p.questions[20].sourceRegion.choices))).toBe('A');
  expect(p.questions[14].sourceRegion.official_answer).toBe('C,D');
  expect(p.questions[28].sourceRegion.official_answer).toBe('*');
  expect(p.questions[38].sourceRegion.official_answer).toBe('*');
  expect(p.questions.filter(q=>!q.sourceRegion.solved_correct_option).map(q=>q.questionNumber)).toEqual(['15','29','32','40']);
  for(const q of p.questions){expect(Object.keys(paperChoices(q.sourceRegion.choices))).toEqual(['A','B','C','D']);expect(q.sourceRegion.option_feedback).toHaveLength(4);}
 });
 it('keeps archive scope and current mapping scope distinct',()=>{
  expect(getFallbackPaper('CS-XI-2024-P1')?.academicClass.level).toBe(11);
  const old=hsscComputerScience2024Papers[0].questions[0];
  expect(old.sourceRegion.mapping_status).toBe('NO_DIRECT_OUTCOME');expect(old.slos).toHaveLength(0);
  const mapped=hsscComputerScience2024Papers[0].questions.filter(q=>q.slos?.length);
  expect(mapped).toHaveLength(8);expect(mapped.every(q=>q.sourceRegion.mapping_scope?.grade===12)).toBe(true);
  const xi=hsscMcqsData(11,'/akueb/XI/computer-science','computer-science');
  expect(xi.papers.find(p=>p.code==='CS-XI-2024-P1')?.questions).toHaveLength(46);
  const xii=hsscMcqsData(12,'/akueb/XII/computer-science','computer-science');
  expect(xii.papers.find(p=>p.code==='CS-XI-2024-P1')?.chapterOnly).toBe(true);
  expect(xii.papers.find(p=>p.code==='CS-XI-2024-P1')?.questions).toHaveLength(8);
 });
 it('includes both ERQ alternatives and project-authored marking allocations',()=>{
  const p=hsscComputerScience2024Papers[1];expect(p.questions).toHaveLength(10);
  expect(p.questions.filter(q=>!q.questionNumber.endsWith('b')).reduce((s,q)=>s+(q.marks??0),0)).toBe(35);
  expect(marking.every(q=>q.answer&&q.rubric.length)).toBe(true);
  expect(p.questions.every(q=>q.sourceRegion.model_answer_origin?.includes('Project-authored'))).toBe(true);
  expect(p.questions.find(q=>q.questionNumber==='8a')?.sourceRegion.model_answer).toContain('BookAuthors');
 });
});
