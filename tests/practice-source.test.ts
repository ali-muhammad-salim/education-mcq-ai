import { describe, expect, it } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

describe('Practice source normalization', () => {
  it('loads every 2025 MCQ despite nullable diagram fields in the source', () => {
    const paper = getFallbackPaper('PHY-IX-2025-P1')!;
    expect(paper.questions).toHaveLength(40);
    const questions = paper.questions.map(sourcePracticeQuestion);
    expect(questions).toHaveLength(40);
    expect(questions.every(q=>q.questionType==='MCQ_SINGLE'&&q.options.length===4)).toBe(true);
    expect(questions.every(q=>q.options.filter(o=>o.isCorrect).length===1)).toBe(true);
    expect(questions.every(q=>q.diagramUrl===undefined||typeof q.diagramUrl==='string')).toBe(true);
  });
  it('retains model-paper choices and keys while preparing scored practice', () => {
    for(const code of ['PHY-IX-P1','PHY-X-P1']) {
      const questions=getFallbackPaper(code)!.questions.map(sourcePracticeQuestion);
      expect(questions).toHaveLength(40);
      expect(questions.every(q=>q.options.some(o=>o.isCorrect))).toBe(true);
    }
  });
  it('keeps disputed official-key entries on the paper but out of single-answer grading', () => {
    for (const [code, number] of [
      ['CS-IX-2023-P1', 11], ['CS-IX-2024-P1', 9],
      ['CS-X-2019-P1', 21], ['CS-X-2023-P1', 37], ['CS-X-2024-P1', 8],
    ] as const) {
      const paper = getFallbackPaper(code)!;
      expect(paper.questions.some(q => Number(q.questionNumber) === number)).toBe(true);
      const scored = gradablePracticeQuestions(code, paper.questions);
      expect(scored).toHaveLength(paper.questions.length - 1);
      expect(scored.some(q => Number(q.questionNumber) === number)).toBe(false);
    }
  });
});
