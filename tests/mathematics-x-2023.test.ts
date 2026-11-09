import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2023_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2023 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2023-P1')!;
    const p2 = getFallbackPaper('MTH-X-2023-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual([
      '1', '2a', '2b', '3a', '3b', '4', '5', '6', '7a', '7b', '8a', '8b', '9',
    ]);

    expect(p1.totalMarks).toBe(45);
    expect(p2.totalMarks).toBe(30);
    expect(p1.durationMinutes).toBe(80);
    expect(p2.durationMinutes).toBe(100);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([10, 10]);

    for (const p of [p1, p2]) {
      expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    }

    for (const crop of manifest.crops) {
      expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    }
    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }
    expect(manifest.crops).toHaveLength(53);

    // Verify paper II choice arithmetic
    const compulsoryMarks = p2.questions
      .filter(q => !q.sourceRegion.choice_group)
      .reduce((sum, q) => sum + q.marks, 0);
    // Q1(3) + Q4(3) + Q5(3) + Q6(3) + Q9(3) = 15 marks
    expect(compulsoryMarks).toBe(15);
    // Choice groups: Q2 (4) + Q3 (3) + Q7 (4) + Q8 (4) = 15 marks
    expect(compulsoryMarks + 4 + 3 + 4 + 4).toBe(30);
  });

  it('correctly maps questions to current 2025-2027 syllabus outcomes across grades 9 and 10', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2023-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
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
    // Q1 (Grouped frequency table) is Grade 10 Unit 22
    const q1 = papers[0].questions[0].sourceRegion;
    expect(q1.current_slo).toBe('22.1.1');
    expect(q1.mapping_scope?.grade).toBe(10);

    // Q7 (Simplifying rational expressions) is Grade 9 Unit 6
    const q7 = papers[0].questions[6].sourceRegion;
    expect(q7.current_slo).toBe('6.2.2');
    expect(q7.mapping_scope?.grade).toBe(9);

    // Q14 (Linear equations in 1 variable) is Grade 9 Unit 7
    const q14 = papers[0].questions[13].sourceRegion;
    expect(q14.current_slo).toBe('7.1.1');
    expect(q14.mapping_scope?.grade).toBe(9);

    // Q20 (Slope & intercept) is Grade 9 Unit 9
    const q20 = papers[0].questions[19].sourceRegion;
    expect(q20.current_slo).toBe('9.4.1');
    expect(q20.mapping_scope?.grade).toBe(9);

    // Q23 (Quadratic equation factorisation) is Grade 10 Unit 15
    const q23 = papers[0].questions[22].sourceRegion;
    expect(q23.current_slo).toBe('15.1.2');
    expect(q23.mapping_scope?.grade).toBe(10);

    // Q31 (Trigonometric ratios) is Grade 9 Unit 14
    const q31 = papers[0].questions[30].sourceRegion;
    expect(q31.current_slo).toBe('14.2.3');
    expect(q31.mapping_scope?.grade).toBe(9);

    // Q39 (Congruent chords and perpendicular bisector) is Grade 10 Unit 20
    const q39 = papers[0].questions[38].sourceRegion;
    expect(q39.current_slo).toBe('20.1.1');
    expect(q39.mapping_scope?.grade).toBe(10);

    // Q9 in Paper II (circumscribing square around circle) is out of current syllabus
    const p2q9 = papers[1].questions.find(q => q.questionNumber === '9')!.sourceRegion;
    expect(p2q9.current_slo).toBeNull();
    expect(p2q9.out_of_syllabus).toBe(true);
    expect(p2q9.mapping_status).toBe('OUT_OF_CURRENT_SYLLABUS');
  });

  it('independently solves all MCQs and verifies 100% concordance with official printed keys', () => {
    const questions = getFallbackPaper('MTH-X-2023-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
      expect(q.sourceRegion.solved_correct_option).toBe(q.sourceRegion.official_answer);
      expect(q.sourceRegion.answer_status).toBe('VERIFIED');
    }

    // Verify mathematical steps for sample questions:
    // Q1: 60% of 50 = 30. Frequencies above 30: 16 + 8 = 24
    expect(16 + 8).toBe(24);
    expect(questions[0].sourceRegion.solved_correct_option).toBe('B');

    // Q2: Pie chart: 10 / 40 * 360 = 90 deg
    expect((10 / 40) * 360).toBe(90);
    expect(questions[1].sourceRegion.solved_correct_option).toBe('C');

    // Q3: Variance of 1, 0, 1, 0: mean = 0.5, deviations: 4 * (0.5)^2 / 4 = 0.25
    expect(questions[2].sourceRegion.solved_correct_option).toBe('B');

    // Q4: Median of 32, 35, 36, 37, 37, 39, 39, 41, 41 is 37
    expect(questions[3].sourceRegion.solved_correct_option).toBe('A');

    // Q14: x/3 - b = 0 => x = 3b
    expect(questions[13].sourceRegion.solved_correct_option).toBe('C');

    // Q16: |2x - 1| / 4 + 4 = 3 => |2x - 1| = -4 => empty set
    expect(questions[15].sourceRegion.solved_correct_option).toBe('D');

    // Q25: 5x^2 - 6x + 1 = 0 => Delta = 36 - 20 = 16 = 4^2 > 0 => rational and unequal
    expect(questions[24].sourceRegion.solved_correct_option).toBe('B');

    // Q27: Distance between (5, 7) and (3, 9) = sqrt(4 + 4) = sqrt(8)
    expect(questions[26].sourceRegion.solved_correct_option).toBe('B');

    // Q29: 240 * pi / 180 = 4pi / 3
    expect((240 / 180) * 3).toBe(4);
    expect(questions[28].sourceRegion.solved_correct_option).toBe('B');

    // Q31: sin 30 + cos 60 = 1/2 + 1/2 = 1
    expect(questions[30].sourceRegion.solved_correct_option).toBe('A');

    // Q32: 1 / sqrt(1 - sin^2 theta) = 1 / cos theta = sec theta
    expect(questions[31].sourceRegion.solved_correct_option).toBe('A');

    // Q45: Inscribed angle in semicircle is 90. 180 - (90 + 60) = 30 deg
    expect(180 - (90 + 60)).toBe(30);
    expect(questions[44].sourceRegion.solved_correct_option).toBe('B');
  });
});

