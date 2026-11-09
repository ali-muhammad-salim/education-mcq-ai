import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2018_source_manifest.json';

describe('Mathematics IX annual 2018 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-IX-2018-P1')!;
    const p2 = getFallbackPaper('MTH-IX-2018-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual([
      '1a', '1b', '2a', '2b', '3', '4a', '4b', '5a', '5b', '6a', '6b', '7', '8', '9', '10a', '10b', '11'
    ]);
    expect(p1.totalMarks).toBe(30);
    expect(p2.totalMarks).toBe(45);
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
    expect(manifest.crops).toHaveLength(51);
    for (const q of p2.questions) for (const image of [q.sourceRegion.better_response_image, q.sourceRegion.weaker_response_image]) if (image) expect(existsSync(path.join(process.cwd(), 'public', image))).toBe(true);
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((sum, q) => sum + q.marks, 0);
    expect(compulsory + 4 + 4 + 4 + 5 + 4 + 4).toBe(45);
  });

  it('keeps old codes separate and maps moved topics to actual Grade X outcomes', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };
    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-IX-2018-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else {
        expect(meta.current_mapping).toEqual([]);
      }
    }

    // P1 Q19: Matrices multiplication order moved to Grade X
    const q19 = papers[0].questions[18].sourceRegion;
    expect(q19.current_slo).toBe('18.4.2');
    expect(q19.mapping_scope?.grade).toBe(10);
    expect(q19.in_syllabus).toBe(false);

    // P1 Q22: Median of ungrouped data moved to Grade X Unit 22
    const q22 = papers[0].questions[21].sourceRegion;
    expect(q22.current_slo).toBe('22.3.1');
    expect(q22.mapping_scope?.grade).toBe(10);

    // P2 Q1b: Complex numbers moved to Grade X Unit 17
    const q1b = papers[1].questions.find(q => q.questionNumber === '1b')?.sourceRegion;
    expect(q1b?.current_slo).toBe('17.1.5');
    expect(q1b?.mapping_scope?.grade).toBe(10);

    // P2 Q7: Matrices equation and conformability moved to Grade X Unit 18
    const q7 = papers[1].questions.find(q => q.questionNumber === '7')?.sourceRegion;
    expect(q7?.current_slo).toBe('18.3.1');
    expect(q7?.mapping_scope?.grade).toBe(10);

    // P2 Q11: Medians construction moved to Grade X Unit 21
    const q11 = papers[1].questions.find(q => q.questionNumber === '11')?.sourceRegion;
    expect(q11?.current_slo).toBe('21.1.2');
    expect(q11?.mapping_scope?.grade).toBe(10);
  });

  it('verifies all 30 MCQs have gradable verified answers and valid options', () => {
    const p1 = getFallbackPaper('MTH-IX-2018-P1')!;
    for (const q of p1.questions) {
      const meta = q.sourceRegion;
      expect(meta.answer_status).toBe('VERIFIED');
      expect(['A', 'B', 'C', 'D']).toContain(meta.correct_answer);
      expect(paperAnswer(meta, paperChoices(meta.choices))).toBe(meta.correct_answer);
      expect(Object.keys(meta.choices || {})).toEqual(['A', 'B', 'C', 'D']);
    }
  });
});

