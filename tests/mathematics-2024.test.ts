import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2024_source_manifest.json';

describe('Mathematics IX annual 2024 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-IX-2024-P1')!;
    const p2 = getFallbackPaper('MTH-IX-2024-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3a', '3b', '4a', '4b', '5', '6', '7', '8a', '8b', '8c']);
    expect(p2.totalMarks).toBe(30);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([9, 9]);

    for (const p of [p1, p2]) {
      expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    }
    for (const crop of manifest.crops) {
      expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    }
    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }
    expect(manifest.crops).toHaveLength(38);
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((sum, q) => sum + q.marks, 0);
    expect(compulsory + 4 + 4 + 6).toBe(30);
  });

  it('keeps old codes separate and maps moved topics to actual Grade X outcomes', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };
    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-IX-2024-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else {
        expect(meta.current_mapping).toEqual([]);
      }
    }
    const q9 = papers[0].questions[8].sourceRegion;
    expect(q9.slo).toBe('2.5.5');
    expect(q9.current_slo).toBe('17.1.5');
    expect(q9.mapping_scope?.grade).toBe(10);
    expect(q9.in_syllabus).toBe(false);

    const q6 = papers[1].questions.find(q => q.questionNumber === '6')?.sourceRegion;
    expect(q6?.current_slo).toBe('18.5.8');
    expect(q6?.mapping_scope?.grade).toBe(10);
  });

  it('handles reviewed correction on Q16 (originally asterisked)', () => {
    const questions = getFallbackPaper('MTH-IX-2024-P1')!.questions;
    const q16 = questions[15];
    expect(q16.questionNumber).toBe('16');
    expect(q16.sourceRegion.official_answer).toBe('*');
    expect(q16.sourceRegion.answer_status).toBe('ANSWER_CORRECTED');
    expect(q16.sourceRegion.correct_answer).toBe('C');
    expect(paperAnswer(q16.sourceRegion, paperChoices(q16.sourceRegion.choices))).toBe('C');
  });
});
