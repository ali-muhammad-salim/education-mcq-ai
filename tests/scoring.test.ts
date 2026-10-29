import { describe, expect, it } from 'vitest';
import { normalizeQuestion, studentQuestion, gradeAnswer, FrozenQuestion } from '@/services/assessment/scoring';
import { answerPayloadSchema, quizSchema } from '@/lib/validations/assessment';
const question: FrozenQuestion = { id: 'q1', marks: 3, orderIndex: 1, content: normalizeQuestion({ questionType: 'MCQ_SINGLE', stemText: 'Which unit measures force?', options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }], explanation: 'A secret explanation', rubric: 'A secret rubric' }) };
describe('Assessment boundaries', () => {
  it('never accepts browser-supplied marks or correctness', () => {
    expect(answerPayloadSchema.safeParse({ selectedOptionId: 'b', isCorrect: true, marks: 100 }).success).toBe(false);
    expect(gradeAnswer(question, { selectedOptionId: 'b' })).toBe(0);
    expect(gradeAnswer(question, { selectedOptionId: 'a' })).toBe(3);
  });
  it('student payloads contain no answer keys, explanations or rubrics', () => {
    const payload = JSON.stringify(studentQuestion(question));
    expect(payload).not.toContain('isCorrect'); expect(payload).not.toContain('secret'); expect(payload).not.toContain('rubric');
  });
  it('rejects missing answer keys and duplicated option IDs', () => {
    expect(() => normalizeQuestion({ ...question.content, options: question.content.options.map(o => ({ ...o, isCorrect: false })) })).toThrow();
    expect(() => normalizeQuestion({ ...question.content, options: question.content.options.map(o => ({ ...o, id: 'same' })) })).toThrow();
  });
  it('uses a zero numerical tolerance exactly and does not treat blank input as zero', () => {
    const q = { ...question, content: normalizeQuestion({ questionType: 'NUMERICAL', stemText: 'Calculate', correctAnswerText: '0', numericalTolerance: 0 }) };
    expect(gradeAnswer(q, { numericAnswer: '' })).toBe(0); expect(gradeAnswer(q, { numericAnswer: '0.01' })).toBe(0); expect(gradeAnswer(q, { numericAnswer: '0' })).toBe(3);
  });
  it('requires all and only the correct multiple choices', () => {
    const q = { ...question, content: normalizeQuestion({ ...question.content, questionType: 'MCQ_MULTIPLE' }) };
    expect(gradeAnswer(q, { selectedOptionIds: ['a', 'b'] })).toBe(0); expect(gradeAnswer(q, { selectedOptionIds: ['a'] })).toBe(3);
  });
  it('leaves written answers for review', () => {
    const q = { ...question, content: normalizeQuestion({ questionType: 'SHORT_ANSWER', stemText: 'Explain the law.' }) };
    expect(gradeAnswer(q, { textAnswer: 'An explanation' })).toBeNull();
  });
  it('rejects contradictory matching answers and unknown matching values', () => {
    const q = { ...question, content: normalizeQuestion({ questionType: 'MATCHING', stemText: 'Match units', matchingPairs: [{ left: 'Length', right: 'metre' }, { left: 'Mass', right: 'kilogram' }] }) };
    const ambiguous = { matchedPairs: [{ left: 'Length', right: 'metre' }, { left: 'Length', right: 'kilogram' }, { left: 'Mass', right: 'metre' }, { left: 'Mass', right: 'kilogram' }] };
    expect(answerPayloadSchema.safeParse(ambiguous).success).toBe(false);
    expect(gradeAnswer(q, ambiguous)).toBe(0);
    expect(gradeAnswer(q, { matchedPairs: [{ left: 'Other', right: 'metre' }] })).toBe(0);
    expect(gradeAnswer(q, { matchedPairs: [{ left: 'Length', right: 'metre' }] })).toBe(1.5);
  });
  it('rejects publication of an empty assessment and invalid timer bounds', () => {
    expect(quizSchema.safeParse({ title: 'Test', status: 'PUBLISHED', questions: [] }).success).toBe(false);
    expect(quizSchema.safeParse({ title: 'Test', questions: [question.content], durationMin: 0 }).success).toBe(false);
  });
});
