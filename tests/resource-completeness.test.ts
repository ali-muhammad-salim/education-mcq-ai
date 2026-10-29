import { describe, expect, it } from 'vitest';
import ix from '@/data/physics/ssc1_exact_syllabus.json';
import x from '@/data/physics/ssc2_exact_syllabus.json';
import { annualOriginalReference, annualCurrentMapping } from '@/lib/legacyPaperEvidence';
import { pageExtraction } from '@/services/ingestion/trust';
import { syllabusCoverageConflicts } from '@/services/ingestion/learning-validation';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { mcqCategories } from '@/lib/mcqCategories';

describe('Source completeness and historical references',()=>{
  it('restores the source optics page including nested lists and cognitive evidence',()=>{
    const rows=x.flatMap(u=>u.subtopics.flatMap(s=>s.slos));
    for(const code of ['13.1.1','13.1.2','13.1.3','13.2.1','13.2.2','13.2.3','13.2.4','13.2.5','13.3.1','13.3.2','13.3.3']) expect(rows.find(row=>row.code===code)).toBeDefined();
    expect(rows.find(row=>row.code==='14.1.5')?.description).toContain('damp conditions');
    expect(rows.find(row=>row.code==='13.1.3')?.cognitiveLevel).toBe('Evaluation');
    expect(new Set(rows.map(row=>row.code)).size).toBe(rows.length);
    expect(ix.flatMap(u=>u.subtopics.flatMap(s=>s.slos))).toHaveLength(151);
  });
  it('uses the official 2025 code without falsely claiming a current mapping',()=>{
    const original=annualOriginalReference(1);
    expect(original.slo).toBe('1.3.1');
    expect(original.original_reference_verified).toBe(true);
    for (const number of [12,39,40]) expect(annualOriginalReference(number).answer_review_note).toContain('Official key:');
    expect(annualOriginalReference(1).answer_review_note).toBeUndefined();
    expect(questionSyllabus(original,[],9,'Physics','AKU-EB',true).status).toBe('pending');
  });
  it('rejects a published syllabus missing a printed SLO or indexed chapter',()=>{
    const extraction=pageExtraction.parse({text:'13.1.1 describe reflection; 13.1.2 state laws;',continuation:'',regions:[],learning:{outcomes:[{grade:10,chapterCode:'13',chapterTitle:'Optics',subtopicCode:'13.1',subtopicTitle:'Reflection',code:'13.1.1',description:'describe reflection;',cognitiveLevel:'U'}]}});
    const issues=syllabusCoverageConflicts([{pageNumber:30,extraction}],[{classLevel:10,chapterCode:'13'},{classLevel:10,chapterCode:'14'}]);
    expect(issues.some(issue=>issue.includes('13.1.2'))).toBe(true);
    expect(issues.some(issue=>issue.includes('chapter 14'))).toBe(true);
  });
  it('provides unique category routes suitable for direct navigation',()=>{
    expect(new Set(mcqCategories.map(c=>c.id)).size).toBe(4);
    expect(mcqCategories.find(c=>c.id==='past-papers')?.key).toBe('past_papers');
  });
  it('only applies the reviewed semantic mapping to the exact known question',()=>{
    const mapping=annualCurrentMapping(1,'Which of the following is a base physical quantity?');
    expect(questionSyllabus(mapping,[],9,'Physics','AKU-EB',true).code).toBe('1.1.3');
    expect(annualCurrentMapping(1,'A replacement question with the same number')).toEqual({});
    expect(annualCurrentMapping(20,'Unresolved question')).toEqual({});
    expect(questionSyllabus(mapping,[],10,'Physics','AKU-EB',true).status).toBe('pending');
  });
});
