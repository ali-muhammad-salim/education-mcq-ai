import { describe, expect, it } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

describe('Source-checked Maths corrections', () => {
  it('keeps defective printed questions visible but out of scored practice', () => {
    for (const [code, excluded] of [
      ['MTH-X-2019-P1', [8, 19]], ['MTH-X-2021-P1', [15, 23]], ['MTH-X-2025-P1', [4, 8, 14, 19]],
    ] as const) {
      const paper = getFallbackPaper(code)!;
      const scored = gradablePracticeQuestions(code, paper.questions);
      expect(scored).toHaveLength(paper.questions.length - excluded.length);
      for (const number of excluded) {
        const q = paper.questions.find(q => Number(q.questionNumber) === number)!;
        expect(q).toBeDefined();
        expect(q.sourceRegion.official_answer).toMatch(/^[A-D]$/);
        expect(paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices))).toBeUndefined();
        expect(scored.some(item => item.id === q.id)).toBe(false);
      }
    }
    // The two reported ranges are genuinely equal, so Q4 cannot have a unique key.
    const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    expect([3, 4].map(x => range([x, 9, 10, 11, 3 * x]))).toEqual([8, 8]);
  });
  it('prepares exactly one reviewed answer for every eligible Maths MCQ', () => {
    for (const summary of getAllStandardPapers().filter(p => p.paperCode.startsWith('MTH-') && p.paperCode.endsWith('-P1'))) {
      const paper = getFallbackPaper(summary.paperCode)!;
      for (const q of gradablePracticeQuestions(paper.paperCode, paper.questions)) {
        expect(sourcePracticeQuestion(q).options.filter(o => o.isCorrect)).toHaveLength(1);
      }
    }
  });
  it('restores source fractions and corrects invented geometry/arithmetic alternatives', () => {
    const q5 = getFallbackPaper('MTH-X-2018-P1')!.questions[4];
    expect(q5.sourceRegion.choices!.D).toContain('\\frac{x}{2}+3');
    expect(q5.sourceRegion.pageNumber).toBe(3);
    const centre = [2 * 3 - 3, 2 * 8 - 6];
    expect(centre).toEqual([3, 10]);
    const q6b = getFallbackPaper('MTH-X-2018-P2')!.questions.find(q => q.questionNumber === '6b')!;
    expect(q6b.sourceRegion.model_answer).toContain('C=(3,10)');
    expect(q6b.sourceRegion.model_answer).not.toContain('(3,12)');
    expect([10, 25, 30, 15, 20, 14, 12].reduce((n, f, i) => n + f * (18 + 5 * i), 0)).toBe(4028);
    expect(getFallbackPaper('MTH-X-2023-P2')!.questions[0].sourceRegion.model_answer).toContain('4028');
  });
});
