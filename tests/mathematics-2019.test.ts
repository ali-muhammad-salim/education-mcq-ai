import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2019_source_manifest.json';

describe('Mathematics IX annual 2019 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-IX-2019-P1')!;
    const p2 = getFallbackPaper('MTH-IX-2019-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4a', '4b', '5a', '5b', '6', '7', '8', '9a', '9b', '9c']);
    expect(p1.totalMarks).toBe(35);
    expect(p2.totalMarks).toBe(40);
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
    expect(compulsory + 5 + 5 + 6).toBe(40);
  });

  it('keeps old codes separate and maps moved topics to actual Grade X outcomes', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };
    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-IX-2019-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else {
        expect(meta.current_mapping).toEqual([]);
      }
    }

    // P1 Q6: Complex numbers moved to Grade X
    const q6 = papers[0].questions[5].sourceRegion;
    expect(q6.current_slo).toBe('17.1.5');
    expect(q6.mapping_scope?.grade).toBe(10);
    expect(q6.in_syllabus).toBe(false);

    // P1 Q24: Row/rectangular matrices moved to Grade X
    const q24 = papers[0].questions[23].sourceRegion;
    expect(q24.current_slo).toBe('18.2.1');
    expect(q24.mapping_scope?.grade).toBe(10);

    // P1 Q32: Centroid median ratio moved to Grade X
    const q32 = papers[0].questions[31].sourceRegion;
    expect(q32.current_slo).toBe('21.1.2');
    expect(q32.mapping_scope?.grade).toBe(10);

    // P2 Q7: Matrices inverse moved to Grade X
    const q7 = papers[1].questions.find(q => q.questionNumber === '7')?.sourceRegion;
    expect(q7?.current_slo).toBe('18.5.5');
    expect(q7?.mapping_scope?.grade).toBe(10);

    // P2 Q8: Altitudes concurrency moved to Grade X
    const q8 = papers[1].questions.find(q => q.questionNumber === '8')?.sourceRegion;
    expect(q8?.current_slo).toBe('21.1.2');
    expect(q8?.mapping_scope?.grade).toBe(10);
  });

  it('verifies all 35 MCQs have gradable verified answers and valid options', () => {
    const p1 = getFallbackPaper('MTH-IX-2019-P1')!;
    for (const q of p1.questions) {
      const meta = q.sourceRegion;
      expect(meta.answer_status).toBe('VERIFIED');
      expect(['A', 'B', 'C', 'D']).toContain(meta.correct_answer);
      expect(paperAnswer(meta, paperChoices(meta.choices))).toBe(meta.correct_answer);
      expect(Object.keys(meta.choices || {})).toEqual(['A', 'B', 'C', 'D']);
    }
  });
});

