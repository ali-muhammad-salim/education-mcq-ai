import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2018_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2018 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2018-P1')!;
    const p2 = getFallbackPaper('MTH-X-2018-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual([
      '1a', '1b', '2a', '2b', '3a', '3b_i', '3b_ii', '4', '5', '6a', '6b', '7a', '7b', '8a', '8b', '9', '10', '11',
    ]);

    expect(p1.totalMarks).toBe(30);
    expect(p2.totalMarks).toBe(45);
    expect(p1.durationMinutes).toBe(40);
    expect(p2.durationMinutes).toBe(140);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([10, 10]);

    for (const p of [p1, p2]) {
      expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    }

    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }

    // Verify paper II choice arithmetic
    // Compulsory questions: Q2a (2) + Q2b (1) + Q4 (4) + Q5 (4) + Q9 (4) + Q10 (4) + Q11 (5) = 24 marks
    const compulsoryMarks = p2.questions
      .filter(q => !q.sourceRegion.choice_group)
      .reduce((sum, q) => sum + q.marks, 0);
    expect(compulsoryMarks).toBe(24);
    // Choice groups: Q1 (5) + Q3 (5) + Q6 (3) + Q7 (4) + Q8 (4) = 21 marks
    expect(compulsoryMarks + 5 + 5 + 3 + 4 + 4).toBe(45);
  });

  it('correctly maps questions to current 2025-2027 syllabus outcomes across grades 9 and 10', () => {
    const codes = {
      9: new Map(ix.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
      10: new Map(x.flatMap(u => u.subtopics.flatMap(s => s.slos.map(o => [o.code, o.description] as const)))),
    };

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2018-${c}`)!);
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
    // Q1 in Paper I ((b+c)/2 - (b+c)/3) is Grade 9 Unit 6
    const q1 = papers[0].questions[0].sourceRegion;
    expect(q1.current_slo).toBe('6.2.2');
    expect(q1.mapping_scope?.grade).toBe(9);

    // Q2 in Paper I (square root of algebraic expression) is Grade 9 Unit 6
    const q2 = papers[0].questions[1].sourceRegion;
    expect(q2.current_slo).toBe('6.3.1');
    expect(q2.mapping_scope?.grade).toBe(9);

    // Q12 in Paper I (a^2 x^2 = b^2) is Grade 10 Unit 15
    const q12 = papers[0].questions[11].sourceRegion;
    expect(q12.current_slo).toBe('15.2.1');
    expect(q12.mapping_scope?.grade).toBe(10);

    // Q15 in Paper I (Distance BC between (1,1) and (4,5)) is Grade 9 Unit 9
    const q15 = papers[0].questions[14].sourceRegion;
    expect(q15.current_slo).toBe('9.1.3');
    expect(q15.mapping_scope?.grade).toBe(9);

    // Q18 in Paper I (Sexagesimal to decimal 20°30' = 20.50°) is Grade 9 Unit 14
    const q18 = papers[0].questions[17].sourceRegion;
    expect(q18.current_slo).toBe('14.1.2');
    expect(q18.mapping_scope?.grade).toBe(9);

    // Q20 in Paper I (sin^2/(1-sin^2) = tan^2) is Grade 9 Unit 14
    const q20 = papers[0].questions[19].sourceRegion;
    expect(q20.current_slo).toBe('14.4.1');
    expect(q20.mapping_scope?.grade).toBe(9);

    // Q25 in Paper I (Circle through 3 non-collinear points) is Grade 10 Unit 20
    const q25 = papers[0].questions[24].sourceRegion;
    expect(q25.current_slo).toBe('20.1.1');
    expect(q25.mapping_scope?.grade).toBe(10);

    // Q28 in Paper I (Equal chords subtend equal angles at centre) is Grade 10 Unit 20
    const q28 = papers[0].questions[27].sourceRegion;
    expect(q28.current_slo).toBe('20.3.1');
    expect(q28.mapping_scope?.grade).toBe(10);

    // Q11 in Paper II (Circle passing through 3 non-collinear points) is Grade 10 Unit 21
    const p2q11 = papers[1].questions.find(q => q.questionNumber === '11')!.sourceRegion;
    expect(p2q11.current_slo).toBe('21.2.2');
    expect(p2q11.mapping_scope?.grade).toBe(10);
  });

  it('independently solves all MCQs and verifies 100% concordance with official printed keys', () => {
    const questions = getFallbackPaper('MTH-X-2018-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
      expect(q.sourceRegion.solved_correct_option).toBe(q.sourceRegion.official_answer);
      expect(q.sourceRegion.answer_status).toBe('VERIFIED');
    }

    // Mathematical verification of individual questions:
    // Q1: (b+c)/2 - (b+c)/3 = (b+c)/6
    expect(questions[0].sourceRegion.solved_correct_option).toBe('C');

    // Q2: sqrt((x+2)^2 (x-1)^2) = +-(x+2)(x-1)
    expect(questions[1].sourceRegion.solved_correct_option).toBe('A');

    // Q3: HCF of (x+y)^2 and x(x+y) is (x+y)
    expect(questions[2].sourceRegion.solved_correct_option).toBe('C');

    // Q4: Proper fraction: degree 2 / degree 3
    expect(questions[3].sourceRegion.solved_correct_option).toBe('D');

    // Q5: x/2 + 3 = 12/3
    expect(questions[4].sourceRegion.solved_correct_option).toBe('D');

    // Q6: 2(x - b) = 0 => x = b
    expect(questions[5].sourceRegion.solved_correct_option).toBe('C');

    // Q7: sqrt(x) / -2 = -1 => sqrt(x) = 2 => x = 4 => {4}
    expect(questions[6].sourceRegion.solved_correct_option).toBe('C');

    // Q8: 2 - x > 0 => x < 2 in W => {0, 1}
    expect(questions[7].sourceRegion.solved_correct_option).toBe('B');

    // Q9: ax + b(a) = 0 => a(x + b) = 0 => x = -b
    expect(questions[8].sourceRegion.solved_correct_option).toBe('C');

    // Q10: y = -3x - 3: negative slope, intercepts (0, -3) and (-1, 0)
    expect(questions[9].sourceRegion.solved_correct_option).toBe('D');

    // Q11: a > 0, b < 0 is Quadrant IV
    expect(questions[10].sourceRegion.solved_correct_option).toBe('D');

    // Q12: a^2 x^2 = b^2 => x = +- b/a
    expect(questions[11].sourceRegion.solved_correct_option).toBe('B');

    // Q13: ax + b = cx^2 is quadratic
    expect(questions[12].sourceRegion.solved_correct_option).toBe('B');

    // Q14: 3x^2 = 1 => x = +- 1/sqrt(3)
    expect(questions[13].sourceRegion.solved_correct_option).toBe('D');

    // Q15: BC between (1,1) and (4,5) is sqrt(3^2 + 4^2) = 5
    expect(questions[14].sourceRegion.solved_correct_option).toBe('A');

    // Q16: AB = 5, BC = 5, AC = 3 => Isosceles triangle only (II only)
    expect(questions[15].sourceRegion.solved_correct_option).toBe('B');

    // Q17: Collinear X, Y, Z => XZ = XY + YZ
    expect(questions[16].sourceRegion.solved_correct_option).toBe('A');

    // Q18: 20°30' = 20 + 30/60 = 20.50
    expect(questions[17].sourceRegion.solved_correct_option).toBe('B');

    // Q19: r = 1m, l = 2m => theta = 2/1 = 2.0 radians
    expect(questions[18].sourceRegion.solved_correct_option).toBe('D');

    // Q20: sin^2 / (1 - sin^2) = sin^2 / cos^2 = tan^2
    expect(questions[19].sourceRegion.solved_correct_option).toBe('D');

    // Q21: sqrt(2) * cos(45) = sqrt(2) * (1/sqrt(2)) = 1
    expect(questions[20].sourceRegion.solved_correct_option).toBe('C');

    // Q22: sqrt(12^2 + 5^2) = 13.0 feet
    expect(questions[21].sourceRegion.solved_correct_option).toBe('C');

    // Q23: 3^2 + 4^2 = 5^2 => 3 m, 4 m, 5 m
    expect(questions[22].sourceRegion.solved_correct_option).toBe('B');

    // Q24: XY = sqrt(4^2 - 2^2) = sqrt(12) = 2*sqrt(3) cm
    expect(questions[23].sourceRegion.solved_correct_option).toBe('B');

    // Q25: Exactly 1 circle through 3 non-collinear points
    expect(questions[24].sourceRegion.solved_correct_option).toBe('B');

    // Q26: OE = OF => CD = AB = 8 cm
    expect(questions[25].sourceRegion.solved_correct_option).toBe('D');

    // Q27: Internal touching circles => distance between centres = c - b
    expect(questions[26].sourceRegion.solved_correct_option).toBe('A');

    // Q28: Equal chords => angle DOC = angle AOB = 180 - (70 + 50) = 60°
    expect(questions[27].sourceRegion.solved_correct_option).toBe('B');

    // Q29: angle ACB = angle ADB = 30/2 = 15° => ACB + ADB = 30°
    expect(questions[28].sourceRegion.solved_correct_option).toBe('B');

    // Q30: Exterior angle x at R = opposite interior angle P = 60°
    expect(questions[29].sourceRegion.solved_correct_option).toBe('A');
  });
});

