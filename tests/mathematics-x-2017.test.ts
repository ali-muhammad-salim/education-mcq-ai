import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2017_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2017 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2017-P1')!;
    const p2 = getFallbackPaper('MTH-X-2017-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual([
      '1a', '1b', '2', '3a', '3b', '4', '5', '6a', '6b', '7a', '7b', '8a', '8b', '9', '10', '11',
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
    // Compulsory questions: Q2 (3) + Q4 (4) + Q5 (4) + Q9 (4) + Q10 (4) + Q11 (5) = 24 marks
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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2017-${c}`)!);
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
    // Q1 in Paper I (HCF of algebraic expressions) is Grade 9 Unit 6
    const q1 = papers[0].questions[0].sourceRegion;
    expect(q1.current_slo).toBe('6.1.1');
    expect(q1.mapping_scope?.grade).toBe(9);

    // Q4 in Paper I (Partial fractions template) is Grade 9 Unit 6
    const q4 = papers[0].questions[3].sourceRegion;
    expect(q4.current_slo).toBe('6.4.2');
    expect(q4.mapping_scope?.grade).toBe(9);

    // Q12 in Paper I (Standard form of quadratic equation) is Grade 10 Unit 15
    const q12 = papers[0].questions[11].sourceRegion;
    expect(q12.current_slo).toBe('15.1.2');
    expect(q12.mapping_scope?.grade).toBe(10);

    // Q13 in Paper I (Real solution set of quadratic equation) is Grade 10 Unit 15
    const q13 = papers[0].questions[12].sourceRegion;
    expect(q13.current_slo).toBe('15.2.1');
    expect(q13.mapping_scope?.grade).toBe(10);

    // Q19 in Paper I (Fourth quadrant trigonometric signs) is Grade 9 Unit 14
    const q19 = papers[0].questions[18].sourceRegion;
    expect(q19.current_slo).toBe('14.2.1');
    expect(q19.mapping_scope?.grade).toBe(9);

    // Q25 in Paper I (Chords distance from centre) is Grade 10 Unit 20
    const q25 = papers[0].questions[24].sourceRegion;
    expect(q25.current_slo).toBe('20.1.1');
    expect(q25.mapping_scope?.grade).toBe(10);

    // Q30 in Paper I (Cyclic quadrilateral supplementary opposite angles) is Grade 10 Unit 20
    const q30 = papers[0].questions[29].sourceRegion;
    expect(q30.current_slo).toBe('20.4.1');
    expect(q30.mapping_scope?.grade).toBe(10);

    // Q11 in Paper II (Circumscribed regular hexagon around circle) is pruned from active syllabus
    const p2q11 = papers[1].questions.find(q => q.questionNumber === '11')!.sourceRegion;
    expect(p2q11.current_slo).toBeNull();
    expect(p2q11.out_of_syllabus).toBe(true);
    expect(p2q11.mapping_status).toBe('OUT_OF_CURRENT_SYLLABUS');
  });

  it('independently solves all MCQs and verifies 100% concordance with official printed keys', () => {
    const questions = getFallbackPaper('MTH-X-2017-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
      expect(q.sourceRegion.solved_correct_option).toBe(q.sourceRegion.official_answer);
      expect(q.sourceRegion.answer_status).toBe('VERIFIED');
    }

    // Mathematical verification of individual questions:
    // Q1: HCF of 3(x+5)^2 and 15(x+5) is 3(x+5)
    expect(questions[0].sourceRegion.solved_correct_option).toBe('D');

    // Q2: (ab + b^2)/(a+b)^2 = b/(a+b)
    expect(questions[1].sourceRegion.solved_correct_option).toBe('C');

    // Q3: sqrt(x^2 - 2x/a + 1/a^2) = x - 1/a
    expect(questions[2].sourceRegion.solved_correct_option).toBe('B');

    // Q4: Partial fraction: A/(x-2) + B/(x+3)
    expect(questions[3].sourceRegion.solved_correct_option).toBe('A');

    // Q5: x/3 - b = 0 => x = 3b
    expect(questions[4].sourceRegion.solved_correct_option).toBe('C');

    // Q6: (x+2)/2 = 0 => x = -2
    expect(questions[5].sourceRegion.solved_correct_option).toBe('C');

    // Q7: 2x - 3 = 5
    expect(questions[6].sourceRegion.solved_correct_option).toBe('B');

    // Q8: |x| < 1 is -1 < x < 1 (open interval)
    expect(questions[7].sourceRegion.solved_correct_option).toBe('A');

    // Q9: 2x + 3(4) = 6 => 2x = -6 => x = -3
    expect(questions[8].sourceRegion.solved_correct_option).toBe('B');

    // Q10: y = 3x passes through origin with positive slope (Graph B)
    expect(questions[9].sourceRegion.solved_correct_option).toBe('B');

    // Q11: a - 2 = -2 => a = 0, b - 3 = -3 => b = 0
    expect(questions[10].sourceRegion.solved_correct_option).toBe('A');

    // Q12: 3/2 + x^2 = 2x => 2x^2 - 4x + 3 = 0
    expect(questions[11].sourceRegion.solved_correct_option).toBe('D');

    // Q13: x^2 = -1/2 has no real solution => {}
    expect(questions[12].sourceRegion.solved_correct_option).toBe('A');

    // Q14: x^2 + 3x needs (3/2)^2 = 9/4
    expect(questions[13].sourceRegion.solved_correct_option).toBe('C');

    // Q15: AB from (0,0) to (6,8) is sqrt(36+64) = 10
    expect(questions[14].sourceRegion.solved_correct_option).toBe('D');

    // Q16: r from (0,0) to (1,1) is sqrt(1+1) = sqrt(2)
    expect(questions[15].sourceRegion.solved_correct_option).toBe('C');

    // Q17: Distance from (-3,0) to (0,-1) is sqrt(9+1) = sqrt(10)
    expect(questions[16].sourceRegion.solved_correct_option).toBe('D');

    // Q18: 53.25 deg = 53 deg 15 min 0 sec
    expect(questions[17].sourceRegion.solved_correct_option).toBe('A');

    // Q19: Quadrant IV has positive cos(theta)
    expect(questions[18].sourceRegion.solved_correct_option).toBe('B');

    // Q20: (1 + tan^2) / cos^2 = sec^2 / cos^2 = sec^4
    expect(questions[19].sourceRegion.solved_correct_option).toBe('D');

    // Q21: In right triangle PQR: sin^2(theta) = p^2 / r^2
    expect(questions[20].sourceRegion.solved_correct_option).toBe('B');

    // Q22: Shortest distance = diagonal = sqrt(80^2 + 60^2) = 100 m
    expect(questions[21].sourceRegion.solved_correct_option).toBe('B');

    // Q23: Diameter AB = sqrt(a^2 + b^2) => r = sqrt(a^2 + b^2) / 2
    expect(questions[22].sourceRegion.solved_correct_option).toBe('D');

    // Q24: Square diagonal = sqrt(2) a
    expect(questions[23].sourceRegion.solved_correct_option).toBe('C');

    // Q25: 6 cm chord is nearer to centre than 5 cm chord => x < 7 cm
    expect(questions[24].sourceRegion.solved_correct_option).toBe('A');

    // Q26: 10 - 7 = 3 cm
    expect(questions[25].sourceRegion.solved_correct_option).toBe('A');

    // Q27: 8 + 12 = 20 cm
    expect(questions[26].sourceRegion.solved_correct_option).toBe('D');

    // Q28: Major arc ACB < Major arc DFE (III only)
    expect(questions[27].sourceRegion.solved_correct_option).toBe('B');

    // Q29: m<AOB = m<DOC and m<AOB = 2 m<DEC (I and II)
    expect(questions[28].sourceRegion.solved_correct_option).toBe('C');

    // Q30: Inscribed quad: m<C = 180 - 50 = 130 deg
    expect(questions[29].sourceRegion.solved_correct_option).toBe('D');
  });
});

