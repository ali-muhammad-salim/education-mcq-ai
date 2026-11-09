import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getFallbackPaper, getAllStandardPapers } from '@/lib/paperDataService';
import { sourcePracticeQuestion } from '@/services/assessment/service';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import manifest from '@/data/mathematics/ssc1_2023_source_manifest.json';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';

describe('Mathematics IX annual 2023 source completeness', () => {
  const p1 = getFallbackPaper('MTH-IX-2023-P1')!;
  const p2 = getFallbackPaper('MTH-IX-2023-P2')!;
  it('preserves every question, alternative, source hash and crop', () => {
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1','2','3a','3b','4a','4b','5','6','7','8a','8b','8c']);
    expect(p2.questions.every(q => q.questionType === 'CONSTRUCTED_RESPONSE')).toBe(true);
    expect(manifest.crops).toHaveLength(39);
    for (const source of Object.values(manifest.sources)) {
      const bytes = readFileSync(path.join(process.cwd(), 'public', source.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(source.sha256);
    }
    for (const crop of manifest.crops) expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    expect(getAllStandardPapers().filter(p => /^MTH-IX-2023-P[12]$/.test(p.paperCode))).toHaveLength(2);
    expect(p2.totalMarks).toBe(30);
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((s,q) => s+q.marks,0);
    expect(compulsory+4+4+6).toBe(30);
  });
  it('uses all 45 independently checked official keys in quiz scoring', () => {
    for (const q of p1.questions) {
      const meta=q.sourceRegion, key=paperAnswer(meta,paperChoices(meta.choices));
      expect(key).toBe(meta.official_answer);
      const scored=sourcePracticeQuestion(q);
      expect(scored.options.filter(o=>o.isCorrect).map(o=>o.id)).toEqual([key]);
    }
    expect(p1.questions[5].questionText).toContain('(0,4)');
    expect(p1.questions[5].sourceRegion.choices?.B).toContain('(0,(0,4))');
    expect(1+Math.log2(32)-Math.log2(1/8)).toBe(9);
    expect((1-(-1))*(1-1*(-1)+(-1)**2)).toBe(6);
  });
  it('validates current descriptions and all per-part outcomes without reusing old codes', () => {
    const outcomes = new Map([...ix,...x].flatMap(u=>u.subtopics.flatMap(s=>s.slos.map(o=>[o.code,o.description] as const))));
    for (const q of [...p1.questions,...p2.questions]) for (const m of q.sourceRegion.current_mapping || []) expect(outcomes.get(m.code)).toBe(m.description);
    const q6=p2.questions.find(q=>q.questionNumber==='6')!;
    expect(q6.sourceRegion.current_mapping?.map(m=>m.code)).toEqual(['18.5.4','18.3.2','18.4.1']);
    expect(q6.slos).toHaveLength(3);
    expect(q6.sourceRegion.mapping_scope?.grade).toBe(10);
    expect(p2.questions.find(q=>q.questionNumber==='7')?.sourceRegion.current_slo).toBe('21.1.2');
    expect(p2.questions.find(q=>q.questionNumber==='8c')?.sourceRegion.current_mapping).toEqual([]);
    expect(p1.questions[2].sourceRegion.slo).toBe('1.2.1(g)');
    expect(p1.questions[2].sourceRegion.current_slo).toBe('3.3.1');
  });
});
