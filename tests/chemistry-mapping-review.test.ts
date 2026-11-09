import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import review from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
import ix from '@/data/chemistry/ssc1_exact_syllabus.json';
import x from '@/data/chemistry/ssc2_exact_syllabus.json';
import { getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';

describe('Content-reviewed Chemistry syllabus mappings', () => {
  it('ties every decision to the exact question and the supplied syllabus', () => {
    expect(review.questions).toHaveLength(168);
    const bytes=readFileSync(path.join(process.cwd(),'public',review.syllabus.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(review.syllabus.sha256);
    const outcomes=new Map([...[ix,x].flatMap((units,index)=>units.flatMap(u=>u.subtopics.flatMap(s=>s.slos.map(o=>[`${index+9}:${o.code}`,o.description] as const))))]);
    for(const row of review.questions) {
      const q=getFallbackPaper(row.paperCode)!.questions.find(q=>q.questionNumber===row.questionNumber)!;
      expect(createHash('sha256').update(q.questionText).digest('hex')).toBe(row.questionSha256);
      expect(q.sourceRegion.slo).toBe(row.originalSlo);
      expect(q.sourceRegion.current_syllabus_reviewed).toBe(true);
      expect(q.sourceRegion.mapping_status).toBe(row.mappingStatus);
      expect(q.sourceRegion.mapping_review_source_sha256).toBe(review.syllabus.sha256);
      expect(q.sourceRegion.current_mapping).toEqual(row.outcomes);
      for(const o of row.outcomes) expect(outcomes.get(`${row.grade}:${o.code}`)).toBe(o.description);
      if(q.questionType==='MULTIPLE_CHOICE') expect(paperAnswer(q.sourceRegion,paperChoices(q.sourceRegion.choices))).toBeTruthy();
    }
  });
  it('retains multiple outcomes and cross-grade mappings without forcing unsupported topics', () => {
    expect(review.questions.filter(q=>q.outcomes.length)).toHaveLength(165);
    expect(review.questions.filter(q=>q.outcomes.length>1)).toHaveLength(30);
    const noDirect=review.questions.filter(q=>!q.outcomes.length);
    expect(noDirect.map(q=>`${q.paperCode}/${q.questionNumber}`)).toEqual(['CHM-IX-2023-P1/6','CHM-IX-2021-P1/44','CHM-X-2023-P1/14']);
    for(const row of noDirect) expect(row.mappingStatus).toBe('NO_DIRECT_OUTCOME');
    const copper=getFallbackPaper('CHM-IX-2017-P2')!.questions.find(q=>q.questionNumber==='Q.8b')!;
    expect(copper.sourceRegion.current_slo).toBe('16.2.4');
    expect(copper.sourceRegion.mapping_scope?.grade).toBe(10);
    const gas=getFallbackPaper('CHM-X-2024-P1')!.questions.find(q=>q.questionNumber==='11')!;
    expect(gas.sourceRegion.current_slo).toBe('2.3.6');
    expect(gas.sourceRegion.mapping_scope?.grade).toBe(9);
    const multi=getFallbackPaper('CHM-IX-2017-P2')!.questions.find(q=>q.questionNumber==='Q.4')!;
    expect(multi.sourceRegion.current_mapping?.map(o=>o.code)).toEqual(['6.3.2','7.4.1']);
  });
});
