import { describe, expect, it } from 'vitest';
import { groupDuplicateQuestions, uniqueQuestions } from '@/lib/uniqueQuestions';
import { physicsUnit17ChapterQuestions } from '@/lib/physicsSupplementaryQuestions';

describe('question deduplication', () => {
  it('groups the same question across papers and keeps each source', () => {
    const model = { stem: 'Which instrument measures current?', options: { A: 'Ammeter.', B: 'Voltmeter' }, paperCode: 'MODEL' };
    const annual = { questionText: 'Which instrument\nmeasures current?', sourceRegion: { choices: { A: 'Voltmeter', B: 'Ammeter' } }, paperCode: 'ANNUAL' };
    expect(groupDuplicateQuestions([model, annual], question => question)).toEqual([[model, annual]]);
  });

  it('preserves different options, figures, and scientific symbols', () => {
    const question = { stem: 'Which line is correct?', options: ['1 mA', '2 mA'], diagramUrl: '/a.png' };
    const different = [
      { ...question, options: ['1 MA', '2 mA'] },
      { ...question, options: ['1 mA', '3 mA'] },
      { ...question, diagramUrl: '/b.png' },
    ];
    expect(uniqueQuestions([question, ...different, { ...question }])).toEqual([question, ...different]);
    expect(uniqueQuestions([
      { stem: 'Which line is correct?', options: ['A', 'B'], diagramBased: true, id: 'missing-a' },
      { stem: 'Which line is correct?', options: ['A', 'B'], diagramBased: true, id: 'missing-b' },
    ])).toHaveLength(2);
  });

  it('keeps wording order and code indentation when they change the question', () => {
    const questions = [
      { stem: 'Does X act on Y?' },
      { stem: 'Does Y act on X?' },
      { stem: '```py\nif active:\n    run()\n```' },
      { stem: '```py\nif active:\n  run()\n```' },
    ];
    expect(uniqueQuestions(questions)).toEqual(questions);
  });

  it('groups the reviewed magnetism repeat while retaining both original question references', () => {
    const groups = groupDuplicateQuestions(physicsUnit17ChapterQuestions, question => question);
    expect(groups).toHaveLength(23);
    expect(groups.find(group => group.length > 1)?.map(question => question.rawQuestionNumber)).toEqual([13, 16]);
  });
});
