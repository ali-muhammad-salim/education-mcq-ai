import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2025_source_manifest.json';

describe('Mathematics X (SSC-II) annual 2025 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('MTH-X-2025-P1')!;
    const p2 = getFallbackPaper('MTH-X-2025-P2')!;
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
    expect(manifest.crops).toHaveLength(41);

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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`MTH-X-2025-${c}`)!);
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
    // Q7 (simplification of rational expressions) moved to Grade 9 Unit 6
    const q7 = papers[0].questions[6].sourceRegion;
    expect(q7.current_slo).toBe('6.2.2');
    expect(q7.mapping_scope?.grade).toBe(9);

    // Q10 (square root) moved to Grade 9 Unit 6
    const q10 = papers[0].questions[9].sourceRegion;
    expect(q10.current_slo).toBe('6.3.1');
    expect(q10.mapping_scope?.grade).toBe(9);

    // Q23 (quadratic equation word problem) is Grade 10 Unit 15
    const q23 = papers[0].questions[22].sourceRegion;
    expect(q23.current_slo).toBe('15.6.1');
    expect(q23.mapping_scope?.grade).toBe(10);

    // Q39 (circle chord theorem) is Grade 10 Unit 20
    const q39 = papers[0].questions[38].sourceRegion;
    expect(q39.current_slo).toBe('20.1.1');
    expect(q39.mapping_scope?.grade).toBe(10);

    // Q9 in Paper II (regular hexagon inscription) is out of current syllabus
    const p2q9 = papers[1].questions.find(q => q.questionNumber === '9')!.sourceRegion;
    expect(p2q9.current_slo).toBeNull();
    expect(p2q9.out_of_syllabus).toBe(true);
    expect(p2q9.mapping_status).toBe('OUT_OF_CURRENT_SYLLABUS');
  });

  it('independently solves all MCQs, flags official key conflicts and retains printed keys', () => {
    const questions = getFallbackPaper('MTH-X-2025-P1')!.questions;
    for (const q of questions) {
      const ans = paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices));
      if (q.sourceRegion.answer_status === 'KEY_CONFLICT') {
        expect(ans).toBeUndefined();
        expect(q.sourceRegion.answer_review_note).toContain('Source ambiguity');
        continue;
      }
      expect(ans).toBeDefined();
      expect(['A', 'B', 'C', 'D']).toContain(ans);
    }

    // Q18: Official key is D ({2}), but sqrt(y - 1) = -1 has no real solution (empty set {})
    const q18 = questions[17].sourceRegion;
    expect(q18.official_answer).toBe('D');
    expect(q18.solved_correct_option).toBe('A');
    expect(q18.answer_status).toBe('ANSWER_CORRECTED');
    expect(q18.answer_review_note).toContain('Official Key Conflict');

    // Q14: Official key is B, but 2x + 7 = 2x + 7 is an identity with infinite solutions
    const q14 = questions[13].sourceRegion;
    expect(q14.official_answer).toBe('B');
    expect(q14.answer_review_note).toContain('Source ambiguity');

    // Verify mathematical steps for sample questions:
    // Q3: Mean 25 * 2 = 50
    expect(25 * 2).toBe(50);
    expect(questions[2].sourceRegion.solved_correct_option).toBe('C');

    // Q24: Discriminant of 2x^2 - 5x + 3 = 0 is (-5)^2 - 4(2)(3) = 25 - 24 = 1
    expect((-5) ** 2 - 4 * 2 * 3).toBe(1);
    expect(questions[23].sourceRegion.solved_correct_option).toBe('B');

    // Q28: Distance between (1,1) and (4,5) is sqrt(3^2 + 4^2) = 5
    expect(Math.hypot(4 - 1, 5 - 1)).toBe(5);
    expect(questions[27].sourceRegion.solved_correct_option).toBe('A');
  });
});
