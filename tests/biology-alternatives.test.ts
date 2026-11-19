import { describe, expect, it } from 'vitest';
import { getFallbackPaper } from '../lib/paperDataService';

describe('Biology annual written choices and provenance', () => {
  it.each([
    ['BIO-IX-2024-P2', ['6a', '6b', '7a', '7b']],
    ['BIO-X-2023-P2', ['5a', '5b', '6a', '6b']],
    ['BIO-X-2025-P2', ['5a', '5b', '6a', '6b']],
  ] as const)('marks six-mark alternatives in %s as choose-one ERQs', (code, numbers) => {
    const paper = getFallbackPaper(code)!;
    for (const number of numbers) {
      const question = paper.questions.find(q => q.questionNumber === number)!;
      expect(question.marks).toBe(6);
      expect(question.questionType).toBe('EXTENDED_RESPONSE');
      expect(question.sourceRegion.choice_instruction).toBe(`${number.endsWith('a') ? 'EITHER' : 'OR'} · Attempt one alternative for Question ${number[0]}`);
    }
  });

  it('keeps the two compulsory subparts of X 2025 Q2 separate from alternatives', () => {
    const paper = getFallbackPaper('BIO-X-2025-P2')!;
    for (const number of ['2a', '2b']) {
      const question = paper.questions.find(q => q.questionNumber === number)!;
      expect(question.questionType).toBe('CONSTRUCTED_RESPONSE');
      expect(question.sourceRegion.choice_instruction).toBeUndefined();
    }
  });

  it.each([
    ['BIO-IX-2024-P2', '1', 'U*'],
    ['BIO-X-2023-P2', '1', 'U*'],
    ['BIO-X-2025-P2', '1', 'K*'],
    ['BIO-X-2025-P2', '2a', 'U*'],
    ['BIO-X-2025-P2', '4', 'A*'],
  ])('preserves the original cognitive classification for %s Q%s', (code, number, original) => {
    expect(getFallbackPaper(code)!.questions.find(q => q.questionNumber === number)!.sourceRegion.original_cognitive_level).toBe(original);
  });
});
