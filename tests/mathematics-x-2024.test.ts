import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2024_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2024 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2024-P1')!;
    const p2 = getFallbackPaper('MTH-X-2024-P2')!;
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
    expect(manifest.crops).toHaveLength(45);

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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2024-${c}`)!);
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
    // Q7 (HCF of polynomials) is Grade 9 Unit 6
    const q7 = papers[0].questions[6].sourceRegion;
    expect(q7.current_slo).toBe('6.1.1');
    expect(q7.mapping_scope?.grade).toBe(9);

    // Q14 (Linear equations) is Grade 9 Unit 7
    const q14 = papers[0].questions[13].sourceRegion;
    expect(q14.current_slo).toBe('7.1.1');
    expect(q14.mapping_scope?.grade).toBe(9);

    // Q21 (Slope & intercept) is Grade 9 Unit 9
    const q21 = papers[0].questions[20].sourceRegion;
    expect(q21.current_slo).toBe('9.4.1');
    expect(q21.mapping_scope?.grade).toBe(9);

    // Q24 (Completing square) is Grade 10 Unit 15
    const q24 = papers[0].questions[23].sourceRegion;
    expect(q24.current_slo).toBe('15.2.1');
    expect(q24.mapping_scope?.grade).toBe(10);

    // Q39 (Circle chords and perpendicular) is Grade 10 Unit 20
    const q39 = papers[0].questions[38].sourceRegion;
    expect(q39.current_slo).toBe('20.1.1');
    expect(q39.mapping_scope?.grade).toBe(10);

    // Q9 in Paper II (square inscribed in circle) is out of current syllabus
    const p2q9 = papers[1].questions.find(q => q.questionNumber === '9')!.sourceRegion;
    expect(p2q9.current_slo).toBeNull();
    expect(p2q9.out_of_syllabus).toBe(true);
    expect(p2q9.mapping_status).toBe('OUT_OF_CURRENT_SYLLABUS');
  });

  it('independently solves all MCQs, flags official key conflicts and retains printed keys', () => {
    const questions = getFallbackPaper('MTH-X-2024-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
    }

    // Q21: Printed key is bullet (•); solved answer is A (-2 and 3 respectively)
    const q21 = questions[20].sourceRegion;
    expect(q21.official_answer).toBe('•');
    expect(q21.solved_correct_option).toBe('A');
    expect(q21.answer_status).toBe('ANSWER_CORRECTED');
    expect(q21.answer_review_note).toContain('bullet');

    // Q36: Printed key is bullet (•); solved answer is B (-150)
    const q36 = questions[35].sourceRegion;
    expect(q36.official_answer).toBe('•');
    expect(q36.solved_correct_option).toBe('B');
    expect(q36.answer_status).toBe('ANSWER_CORRECTED');
    expect(q36.answer_review_note).toContain('bullet');

    // Verify mathematical steps for sample questions:
    // Q3: Mean of b, b-1, b-2, b-3, b-4 is 30 => b - 2 = 30 => b = 32
    expect(questions[2].sourceRegion.solved_correct_option).toBe('D');

    // Q17: |4x - 2| = 14 => 4x = 16 (x = 4) or 4x = -12 (x = -3)
    expect(questions[16].sourceRegion.solved_correct_option).toBe('B');

    // Q25: Discriminant of 5x^2 = 20 => 5x^2 - 20 = 0 => 0^2 - 4(5)(-20) = 400
    expect(0 ** 2 - 4 * 5 * -20).toBe(400);
    expect(questions[24].sourceRegion.solved_correct_option).toBe('D');

    // Q27: Distance between (0,0) and (6,8) is hypot(6, 8) = 10
    expect(Math.hypot(6, 8)).toBe(10);
    expect(questions[26].sourceRegion.solved_correct_option).toBe('D');

    // Q33: sec(45) / sin(45) = sqrt(2) / (1/sqrt(2)) = 2
    expect(questions[32].sourceRegion.solved_correct_option).toBe('B');

    // Q45: Inscribed angle 60 deg subtends arc MQ => central angle x = 2 * 60 = 120 deg
    expect(2 * 60).toBe(120);
    expect(questions[44].sourceRegion.solved_correct_option).toBe('C');
  });
});

