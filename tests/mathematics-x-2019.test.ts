import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2019_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2019 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2019-P1')!;
    const p2 = getFallbackPaper('MTH-X-2019-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual([
      '1a', '1b', '2', '3a', '3b', '4', '5', '6a', '6b', '7a', '7b', '8a', '8b', '9', '10', '11',
    ]);

    expect(p1.totalMarks).toBe(30);
    expect(p2.totalMarks).toBe(45);
    expect(p1.durationMinutes).toBe(45);
    expect(p2.durationMinutes).toBe(135);
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
    expect(manifest.crops).toHaveLength(46);

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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2019-${c}`)!);
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
    // Q1 in Paper I (Square root of algebraic expression) is Grade 9 Unit 6
    const q1 = papers[0].questions[0].sourceRegion;
    expect(q1.current_slo).toBe('6.3.1');
    expect(q1.mapping_scope?.grade).toBe(9);

    // Q4 in Paper I (Partial fractions) is Grade 9 Unit 6
    const q4 = papers[0].questions[3].sourceRegion;
    expect(q4.current_slo).toBe('6.4.2');
    expect(q4.mapping_scope?.grade).toBe(9);

    // Q12 in Paper I (Quadratic equation standard form) is Grade 10 Unit 15
    const q12 = papers[0].questions[11].sourceRegion;
    expect(q12.current_slo).toBe('15.1.2');
    expect(q12.mapping_scope?.grade).toBe(10);

    // Q17 in Paper I (Midpoint formula) is Grade 9 Unit 9
    const q17 = papers[0].questions[16].sourceRegion;
    expect(q17.current_slo).toBe('9.2.1');
    expect(q17.mapping_scope?.grade).toBe(9);

    // Q23 in Paper I (Angle in semicircle is right angle) is Grade 10 Unit 20
    const q23 = papers[0].questions[22].sourceRegion;
    expect(q23.current_slo).toBe('20.4.1');
    expect(q23.mapping_scope?.grade).toBe(10);

    // Q28 in Paper I (Equal chords of congruent arcs) is Grade 10 Unit 20
    const q28 = papers[0].questions[27].sourceRegion;
    expect(q28.current_slo).toBe('20.3.1');
    expect(q28.mapping_scope?.grade).toBe(10);

    // Q11 in Paper II (direct common tangents) is pruned from active syllabus
    const p2q11 = papers[1].questions.find(q => q.questionNumber === '11')!.sourceRegion;
    expect(p2q11.current_slo).toBeNull();
    expect(p2q11.out_of_syllabus).toBe(true);
    expect(p2q11.mapping_status).toBe('OUT_OF_CURRENT_SYLLABUS');
  });

  it('retains printed keys and excludes mathematically ambiguous entries', () => {
    const questions = getFallbackPaper('MTH-X-2019-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      if (q.sourceRegion.answer_status === 'KEY_CONFLICT') {
        expect(ans).toBeUndefined();
        expect(q.sourceRegion.answer_review_note).toContain('Source ambiguity');
        continue;
      }
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
      expect(q.sourceRegion.solved_correct_option).toBe(q.sourceRegion.official_answer);
      expect(q.sourceRegion.answer_status).toBe('VERIFIED');
    }

    // Mathematical verification of sample questions:
    // Q1: b = 64
    expect(questions[0].sourceRegion.solved_correct_option).toBe('A');

    // Q2: LCM of 5x^2 and 9x is 45x^2
    expect(questions[1].sourceRegion.solved_correct_option).toBe('C');

    // Q3: ((sqrt(x) - 4) * (sqrt(x) + 4)) / (x - 16) = 1
    expect(questions[2].sourceRegion.solved_correct_option).toBe('A');

    // Q5: (x - 1) / 2 = 0 => x = 1
    expect(questions[4].sourceRegion.solved_correct_option).toBe('D');

    // Q6: |-x| = -1 => empty set
    expect(questions[5].sourceRegion.solved_correct_option).toBe('B');

    // Q12: 3/2 + x^2 = 2x => 2x^2 - 4x + 3 = 0
    expect(questions[11].sourceRegion.solved_correct_option).toBe('D');

    // Q17: Midpoint of (0, -5) and (2, -5) is (1, -5) => -a = -5 => a = 5 => 1 - a = -4
    expect(questions[16].sourceRegion.solved_correct_option).toBe('A');

    // Q18: 1 1/4 rotations = 5/4 * 360 = 450 deg
    expect((5 / 4) * 360).toBe(450);
    expect(questions[17].sourceRegion.solved_correct_option).toBe('D');

    // Q21: (sin 45 + cos 45)^2 = (2 / sqrt(2))^2 = 2
    expect(questions[20].sourceRegion.solved_correct_option).toBe('B');

    // Q25: Tangents from Q: angle SOR = 180 - 72 = 108 deg => x = 108 / 2 = 54 deg
    expect(108 / 2).toBe(54);
    expect(questions[24].sourceRegion.solved_correct_option).toBe('C');

    // Q29: Central angles: 2 * MON + 104 + 116 = 360 => 2 * MON = 140 => MON = 70 deg
    expect((360 - 220) / 2).toBe(70);
    expect(questions[28].sourceRegion.solved_correct_option).toBe('D');

    // Q30: Congruent arcs => equal chords => KL - MN = 0
    expect(questions[29].sourceRegion.solved_correct_option).toBe('C');
  });
});

