import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2025_source_manifest.json';

describe('Mathematics IX annual 2025 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-IX-2025-P1')!;
    const p2 = getFallbackPaper('MTH-IX-2025-P2')!;
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3a', '3b', '4a', '4b', '5', '6', '7', '8a', '8b', '8c']);
    expect(p2.totalMarks).toBe(30);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([9, 9]);
    for (const p of [p1, p2]) expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    for (const crop of manifest.crops) expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    for (const source of Object.values(manifest.sources)) expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    expect(manifest.crops).toHaveLength(37);
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((sum, q) => sum + q.marks, 0);
    expect(compulsory + 4 + 4 + 6).toBe(30);
  });

  it('keeps old codes separate and maps moved topics to actual Grade X outcomes', () => {
    const codes = { 9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))), 10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))) };
    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-IX-2025-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else expect(meta.current_mapping).toEqual([]);
    }
    const q9 = papers[0].questions[8].sourceRegion;
    expect(q9.slo).toBe('2.5.4');
    expect(q9.current_slo).toBe('17.1.5');
    expect(q9.mapping_scope?.grade).toBe(10);
    expect(q9.in_syllabus).toBe(false);
    expect(papers[1].questions.find(q => q.questionNumber === '7')?.sourceRegion.current_slo).toBe('21.1.2');
  });

  it('uses authorized corrected answers and retains the original board keys', () => {
    const questions = getFallbackPaper('MTH-IX-2025-P1')!.questions;
    const blocked = questions.filter(q => !paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices)));
    expect(blocked).toEqual([]);
    const corrected = questions.filter(q => q.sourceRegion.answer_status === 'ANSWER_CORRECTED');
    expect(corrected.map(q => q.questionNumber)).toEqual(['3', '18', '43']);
    expect(corrected.map(q => q.sourceRegion.official_answer)).toEqual(['*', 'C', 'C']);
    expect(corrected.map(q => paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices)))).toEqual(['D', 'D', 'A']);
    // Verify every displayed Venn-region element against A union complement B.
    const universal = [1,2,3,4,5,6,7,8,9,10], a = new Set([1,2,3,4,5,6]), b = new Set([1,3,5,7,9]);
    expect(universal.filter(n => a.has(n) || !b.has(n))).toEqual([1,2,3,4,5,6,8,10]);
    expect(361 - 8 * -60).toBe(29 ** 2);
    expect(questions[17].sourceRegion.solved_correct_option).toBe('D');
    // Equal perpendicular distances give an angle bisector, not a midpoint:
    // triangle with B=(0,0), A=(4,0), C=(0,6), D=(2.4,2.4).
    expect(Math.hypot(4 - 2.4, 2.4)).not.toBeCloseTo(Math.hypot(2.4, 6 - 2.4));
    expect(questions[42].sourceRegion.solved_correct_option).toBe('A');
    const q8b = getFallbackPaper('MTH-IX-2025-P2')!.questions.find(q => q.questionNumber === '8b')!;
    expect(q8b.sourceRegion.model_answer).toContain('4.5');
    expect(q8b.sourceRegion.answer_review_note).toContain('5.4');
  });
});
