import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2021_source_manifest.json';

describe('Mathematics IX annual 2021 source import', () => {
  it('preserves the complete paper, all 50 MCQs and source assets', () => {
    const p1 = getFallbackPaper('MTH-IX-2021-P1')!;
    expect(p1).toBeDefined();
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(p1.totalMarks).toBe(50);
    expect(p1.academicClass.level).toBe(9);

    expect(getAllStandardPapers().some(s => s.paperCode === p1.paperCode)).toBe(true);

    for (const crop of manifest.crops) {
      expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    }
    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }
    expect(manifest.crops).toHaveLength(12);
  });

  it('keeps old codes separate and maps moved topics to actual Grade X outcomes', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };
    const p1 = getFallbackPaper('MTH-IX-2021-P1')!;
    for (const q of p1.questions) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else {
        expect(meta.current_mapping).toEqual([]);
      }
    }

    // Q31: Matrices moved to Grade X
    const q31 = p1.questions[30].sourceRegion;
    expect(q31.slo).toBe('7.3.5');
    expect(q31.current_slo).toBe('18.3.7');
    expect(q31.mapping_scope?.grade).toBe(10);
    expect(q31.in_syllabus).toBe(false);

    // Q36: Square matrix in Grade X
    const q36 = p1.questions[35].sourceRegion;
    expect(q36.current_slo).toBe('18.2.1');
    expect(q36.mapping_scope?.grade).toBe(10);

    // Q48: Triangle medians concurrency in Grade X
    const q48 = p1.questions[47].sourceRegion;
    expect(q48.current_slo).toBe('21.1.2');
    expect(q48.mapping_scope?.grade).toBe(10);
  });

  it('verifies all 50 questions have gradable verified answers and valid options', () => {
    const p1 = getFallbackPaper('MTH-IX-2021-P1')!;
    for (const q of p1.questions) {
      const meta = q.sourceRegion;
      expect(meta.answer_status).toBe('VERIFIED');
      expect(['A', 'B', 'C', 'D']).toContain(meta.correct_answer);
      expect(paperAnswer(meta, paperChoices(meta.choices))).toBe(meta.correct_answer);
      expect(Object.keys(meta.choices || {})).toEqual(['A', 'B', 'C', 'D']);
    }
  });
});

