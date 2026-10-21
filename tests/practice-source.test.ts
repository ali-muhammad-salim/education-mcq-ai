import { describe, expect, it } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { sourcePracticeQuestion } from '@/services/assessment/service';

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
});
