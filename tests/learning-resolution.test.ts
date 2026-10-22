import { describe, it, expect } from 'vitest';
import { questionResolutionConflicts } from '@/services/materials/compile-paper';
import { pageExtraction } from '@/services/ingestion/trust';
describe('Verified paper enrichment', () => {
  const question = { options: [{ key: 'A', text: 'Time' }, { key: 'B', text: 'Force' }], printedAnswer: 'A', continuation: false };
  const value = { correctOption: 'A', explanation: 'Time is a base physical quantity.', optionFeedback: [{ key: 'A', reason: 'Time has an independent SI base unit.' }, { key: 'B', reason: 'Force is derived from mass and acceleration.' }], sloIds: ['current-outcome'], mappingStatus: 'IN_SCOPE' as const, mappingReason: 'This outcome distinguishes base and derived quantities.', uncertainty: '' };
  it('requires explicit evidenced outside decisions and never publishes unresolved mappings', () => {
    expect(questionResolutionConflicts(question, { ...value, mappingStatus: 'OUTSIDE', sloIds: [] }, new Set())).toEqual([]);
    expect(questionResolutionConflicts(question, { ...value, mappingStatus: 'OUTSIDE' }, new Set(['current-outcome']))).toContain('An outside-syllabus decision cannot also assign current outcomes.');
    expect(questionResolutionConflicts(question, { ...value, mappingStatus: 'UNCERTAIN' }, new Set(['current-outcome']))).toContain('The syllabus decision is unresolved.');
  });
  it('requires explanations for every distractor and permits only scoped outcome IDs', () => {
    expect(questionResolutionConflicts(question, value, new Set(['current-outcome']), 'A')).toEqual([]);
    expect(questionResolutionConflicts(question, { ...value, sloIds: ['another-class'] }, new Set(['current-outcome']))).toContain('The mapping references another class or syllabus.');
    expect(questionResolutionConflicts(question, { ...value, optionFeedback: [] }, new Set(['current-outcome']))).toContain('Every option needs an explanation.');
  });
  it('holds key conflicts, ambiguous answers and incomplete multi-page questions', () => {
    expect(questionResolutionConflicts(question, value, new Set(['current-outcome']), 'B')).toContain('Printed answer sources disagree.');
    expect(questionResolutionConflicts({ ...question, continuation: true }, value, new Set(['current-outcome']))).toContain('Question continues beyond its source page.');
    expect(questionResolutionConflicts(question, { ...value, uncertainty: 'The diagram label is unreadable.' }, new Set(['current-outcome']))).toContain('The diagram label is unreadable.');
  });
  it('retains source transcription separately from generated explanations', () => {
    const source = pageExtraction.parse({ text: 'Question 1. Which is a base quantity?', continuation: '', regions: [], learning: { outcomes: [], questions: [{ ...question, number: '1', stem: 'Which is a base quantity?', marks: 1, originalSloCode: 'old-code' }], keyEntries: [] } });
    expect(source.text).toBe('Question 1. Which is a base quantity?');
    expect(source.learning.questions[0]).not.toHaveProperty('explanation');
  });
});
