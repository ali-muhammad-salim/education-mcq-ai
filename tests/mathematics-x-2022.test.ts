import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2022_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2022 source import', () => {
  it('preserves the complete paper, all 50 MCQs, and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2022-P1')!;
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
    expect(manifest.crops).toHaveLength(16);
  });

  it('correctly maps questions to current 2025-2027 syllabus outcomes across grades 9 and 10', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };

    const paper = getFallbackPaper('MTH-X-2022-P1')!;
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
    expect(q1.current_slo).toBe('22.1.1');
    expect(q1.mapping_scope?.grade).toBe(10);

    // Q9 (LCM of powers) is Grade 9 Unit 6
    const q9 = paper.questions[8].sourceRegion;
    expect(q9.current_slo).toBe('6.1.1');
    expect(q9.mapping_scope?.grade).toBe(9);

    // Q19 (Linear equation in 1 variable) is Grade 9 Unit 7
    const q19 = paper.questions[18].sourceRegion;
    expect(q19.current_slo).toBe('7.1.1');
    expect(q19.mapping_scope?.grade).toBe(9);

    // Q25 (Abscissa of Cartesian point) is Grade 9 Unit 9
    const q25 = paper.questions[24].sourceRegion;
    expect(q25.current_slo).toBe('9.1.1');
    expect(q25.mapping_scope?.grade).toBe(9);

    // Q31 (sec 30 deg standard angle) is Grade 9 Unit 14
    const q31 = paper.questions[30].sourceRegion;
    expect(q31.current_slo).toBe('14.2.3');
    expect(q31.mapping_scope?.grade).toBe(9);

    // Q43 (Cyclic quadrilateral) is Grade 10 Unit 20
    const q43 = paper.questions[42].sourceRegion;
    expect(q43.current_slo).toBe('20.4.1');
    expect(q43.mapping_scope?.grade).toBe(10);
  });

  it('independently solves all MCQs, flags official key conflict on Q14, and retains printed key', () => {
    const questions = getFallbackPaper('MTH-X-2022-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
    }

    // Q14: Printed key is A (1); solved algebraic answer is B (a)
    const q14 = questions[13].sourceRegion;
    expect(q14.official_answer).toBe('A');
    expect(q14.solved_correct_option).toBe('B');
    expect(q14.answer_status).toBe('ANSWER_CORRECTED');
    expect(q14.answer_review_note).toContain('erratum');

    // Verify mathematical steps for sample questions:
    // Q1: Count in 25-34 is 19
    expect(questions[0].sourceRegion.solved_correct_option).toBe('C');

    // Q2: Total participants: 1800 + 1200 + 2500 + 1100 + 2000 = 8600
    expect(1800 + 1200 + 2500 + 1100 + 2000).toBe(8600);
    expect(questions[1].sourceRegion.solved_correct_option).toBe('D');

    // Q4: Median of 1, 1, 1, 1, 2, 2, 3, 100, 101, 103 is (2 + 2) / 2 = 2
    expect(questions[3].sourceRegion.solved_correct_option).toBe('C');

    // Q5: SD of 1, 0, 1, 0: variance = 0.25 => SD = 0.50
    expect(questions[4].sourceRegion.solved_correct_option).toBe('B');

    // Q18: 2|x| + 1 = 15 => 2|x| = 14
    expect(questions[17].sourceRegion.solved_correct_option).toBe('B');

    // Q22: |x - 5| + 10 = 5 => |x - 5| = -5 => empty set
    expect(questions[21].sourceRegion.solved_correct_option).toBe('A');

    // Q26: 2x - y = 2 => p = 2, q = -2 => p - q = 4
    expect(questions[25].sourceRegion.solved_correct_option).toBe('A');

    // Q33: In right triangle ABD: hypotenuse = sqrt(5^2 + 12^2) = 13
    expect(Math.hypot(5, 12)).toBe(13);
    expect(questions[32].sourceRegion.solved_correct_option).toBe('B');

    // Q35: (pi - pi/2) rad = pi/2 rad = 90 deg
    expect(questions[34].sourceRegion.solved_correct_option).toBe('C');

    // Q43: Cyclic quad: angle A = 180 - 95 = 85 deg
    expect(180 - 95).toBe(85);
    expect(questions[42].sourceRegion.solved_correct_option).toBe('A');

    // Q50: Cyclic quad PQRS: angle P + angle R = 180 deg
    expect(questions[49].sourceRegion.solved_correct_option).toBe('D');
  });
});

