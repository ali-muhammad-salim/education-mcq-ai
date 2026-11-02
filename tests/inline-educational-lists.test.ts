import { describe, expect, it } from 'vitest';
import { restoreInlineLetteredLists } from '@/lib/inlineEducationalLists';

describe('digital document list formatting', () => {
  it('restores the official syllabus lettered list without changing its words', () => {
    const source = 'explain the following types of system software: a. operating system, b. device drivers, c. utility programs, d. language processors;';
    expect(restoreInlineLetteredLists(source)).toBe('explain the following types of system software:\na. operating system,\nb. device drivers,\nc. utility programs,\nd. language processors;');
  });

  it('leaves ordinary prose, references and answer options unchanged', () => {
    for (const source of ['The answer is a. The reason is b. It follows.', 'Choose a. or b. in this question.', 'SLO 1.5.2 describes software.']) {
      expect(restoreInlineLetteredLists(source)).toBe(source);
    }
  });
});
