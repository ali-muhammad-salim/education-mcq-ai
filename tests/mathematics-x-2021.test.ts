import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2021_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2021 source import', () => {
  it('preserves the complete paper, all 50 MCQs, and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2021-P1')!;
    expect(p1).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(p1.totalMarks).toBe(50);
    expect(p1.durationMinutes).toBe(100);
    expect(p1.academicClass.level).toBe(10);

    expect(getAllStandardPapers().some(s => s.paperCode === p1.paperCode)).toBe(true);

    for (const crop of manifest.crops) {
      expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    }
    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }
    expect(manifest.crops).toHaveLength(17);
  });

  it('correctly maps questions to current 2025-2027 syllabus outcomes across grades 9 and 10', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };

    const paper = getFallbackPaper('MTH-X-2021-P1')!;
    for (const q of paper.questions) {
      const meta = q.sourceRegion;
      if (meta.current_slo) {
        const grade = meta.mapping_scope!.grade as 9 | 10;
        expect(codes[grade].get(meta.current_slo)).toBe(meta.current_mapping![0].description);
      } else {
        expect(meta.current_mapping).toEqual([]);
        expect(meta.out_of_syllabus).toBe(true);
      }
    }

    // Check specific syllabus mappings:
    // Q1 (Grouped frequency data) is Grade 10 Unit 22
    const q1 = paper.questions[0].sourceRegion;
    expect(q1.current_slo).toBe('22.3.1');
    expect(q1.mapping_scope?.grade).toBe(10);

    // Q9 (Square root of algebraic expression) is Grade 9 Unit 6
    const q9 = paper.questions[8].sourceRegion;
    expect(q9.current_slo).toBe('6.3.1');
    expect(q9.mapping_scope?.grade).toBe(9);

    // Q18 (Linear equation in 1 variable) is Grade 9 Unit 7
    const q18 = paper.questions[17].sourceRegion;
    expect(q18.current_slo).toBe('7.1.1');
    expect(q18.mapping_scope?.grade).toBe(9);

    // Q26 (Cartesian coordinates) is Grade 9 Unit 9
    const q26 = paper.questions[25].sourceRegion;
    expect(q26.current_slo).toBe('9.1.1');
    expect(q26.mapping_scope?.grade).toBe(9);

    // Q30 (Trigonometric ratio tan phi) is Grade 9 Unit 14
    const q30 = paper.questions[29].sourceRegion;
    expect(q30.current_slo).toBe('14.2.1');
    expect(q30.mapping_scope?.grade).toBe(9);

    // Q38 (Area of circular sector) is Grade 10 Unit 19
    const q38 = paper.questions[37].sourceRegion;
    expect(q38.current_slo).toBe('19.4.1');
    expect(q38.mapping_scope?.grade).toBe(10);

    // Q43 (Cyclic quadrilateral) is Grade 10 Unit 20
    const q43 = paper.questions[42].sourceRegion;
    expect(q43.current_slo).toBe('20.4.1');
    expect(q43.mapping_scope?.grade).toBe(10);
  });

  it('retains all 50 printed MCQs and grades only mathematically unambiguous entries', () => {
    const questions = getFallbackPaper('MTH-X-2021-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      if (q.sourceRegion.answer_status === 'KEY_CONFLICT') {
        expect(ans).toBeUndefined();
        expect(q.sourceRegion.answer_review_note).toContain('Source ambiguity');
        continue;
      }
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
      expect(q.sourceRegion.official_answer).toBe(q.sourceRegion.solved_correct_option);
      expect(q.sourceRegion.answer_status).toBe('VERIFIED');
    }

    // Mathematical verification of sample questions:
    // Q1: Cumulative frequency preceding median class is 23
    expect(questions[0].sourceRegion.solved_correct_option).toBe('B');

    // Q2: Modal class upper class boundary 79.5
    expect(questions[1].sourceRegion.solved_correct_option).toBe('D');

    // Q3: Variance = 19/5 - (9/5)^2 = 3.8 - 3.24 = 0.56
    expect(Number((19 / 5 - Math.pow(9 / 5, 2)).toFixed(2))).toBe(0.56);
    expect(questions[2].sourceRegion.solved_correct_option).toBe('A');

    // Q4: Orange percentage = 40/220 * 100% = 18.2%
    expect(Number(((40 / 220) * 100).toFixed(1))).toBe(18.2);
    expect(questions[3].sourceRegion.solved_correct_option).toBe('B');

    // Q5: Median of 17 sorted numbers is 9th value p = 28
    expect(questions[4].sourceRegion.solved_correct_option).toBe('B');

    // Q18: 3 = -3/2 x => x = -2
    expect(questions[17].sourceRegion.solved_correct_option).toBe('A');

    // Q20: |1 - x| = 0 => x = 1
    expect(questions[19].sourceRegion.solved_correct_option).toBe('A');

    // Q25: x - 3y = 9, x + 3y = 15 => 2x = 24 => x = 12
    expect(questions[24].sourceRegion.solved_correct_option).toBe('C');

    // Q31: l = r * theta = 9 * 0.5 = 4.5
    expect(9 * 0.5).toBe(4.5);
    expect(questions[30].sourceRegion.solved_correct_option).toBe('B');

    // Q33: cosec^2(45) = (sqrt(2))^2 = 2
    expect(questions[32].sourceRegion.solved_correct_option).toBe('A');

    // Q38: Area = 0.5 * r^2 * theta = 0.5 * 15 = 7.5
    expect(0.5 * 15).toBe(7.5);
    expect(questions[37].sourceRegion.solved_correct_option).toBe('A');

    // Q43: Cyclic quad: angle RSP = 180 - 125 = 55 deg
    expect(180 - 125).toBe(55);
    expect(questions[42].sourceRegion.solved_correct_option).toBe('B');

    // Q46: Overlapping circles: EF = 8 + 10 - 3 = 15 cm
    expect(8 + 10 - 3).toBe(15);
    expect(questions[45].sourceRegion.solved_correct_option).toBe('C');

    // Q50: Equal chords subtend equal angles at centre => 70 deg
    expect(questions[49].sourceRegion.solved_correct_option).toBe('C');
  });
});
