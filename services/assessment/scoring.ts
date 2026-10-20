import { z } from 'zod';
import { questionSchema, answerPayloadSchema, QuestionContent } from '@/lib/validations/assessment';
export const snapshotSchema = z.array(z.object({ id: z.string(), orderIndex: z.number(), marks: z.number().positive(), content: questionSchema }));
export type FrozenQuestion = z.infer<typeof snapshotSchema>[number];
export function normalizeQuestion(value: unknown): QuestionContent {
  const q = questionSchema.parse(value);
  return { ...q, options: q.options.map((o, i) => ({ ...o, id: o.id || String.fromCharCode(65 + i) })) };
}
export function studentQuestion(q: FrozenQuestion) {
  return { id: q.id, orderIndex: q.orderIndex, marks: q.marks, questionType: q.content.questionType, stemText: q.content.stemText,
    difficulty: q.content.difficulty, cognitiveLevel: q.content.cognitiveLevel, unit: q.content.unit, isRequired: q.content.isRequired,
    options: q.content.options.map(o => ({ id: o.id, text: o.text })), diagramUrl: q.content.diagramUrl || (q.content.drawingSvg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(q.content.drawingSvg) : undefined),
    matchingLeft: q.content.matchingPairs.map(p => p.left), matchingRight: [...q.content.matchingPairs.map(p => p.right)].sort() };
}
export function hasAnswer(q: FrozenQuestion, input: unknown): boolean {
  const parsed = answerPayloadSchema.safeParse(input);
  if (!parsed.success) return false;
  const answer = parsed.data;
  switch (q.content.questionType) {
    case 'MCQ_SINGLE': case 'TRUE_FALSE': return Boolean(answer.selectedOptionId);
    case 'MCQ_MULTIPLE': return Boolean(answer.selectedOptionIds?.length);
    case 'NUMERICAL': return Boolean(answer.numericAnswer?.trim());
    case 'MATCHING': return Boolean(answer.matchedPairs?.length);
    default: return Boolean(answer.textAnswer?.trim());
  }
}
export function gradeAnswer(q: FrozenQuestion, input: unknown): number | null {
  const parsed = answerPayloadSchema.safeParse(input);
  if (!parsed.success) return 0;
  const answer = parsed.data, content = q.content;
  if (['SHORT_ANSWER', 'LONG_ANSWER', 'CRQ'].includes(content.questionType)) return answer.textAnswer?.trim() ? null : 0;
  if (['MCQ_SINGLE', 'TRUE_FALSE'].includes(content.questionType)) return content.options.some(o => o.isCorrect && o.id === answer.selectedOptionId) ? q.marks : 0;
  if (content.questionType === 'MCQ_MULTIPLE') {
    const expected = content.options.filter(o => o.isCorrect).map(o => o.id);
    const selected = new Set(answer.selectedOptionIds || []);
    return selected.size === expected.length && expected.every(id => id !== undefined && selected.has(id)) ? q.marks : 0;
  }
  if (content.questionType === 'NUMERICAL') {
    const value = answer.numericAnswer?.trim();
    return value && Number.isFinite(Number(value)) && Math.abs(Number(value) - Number(content.correctAnswerText)) <= content.numericalTolerance ? q.marks : 0;
  }
  if (content.questionType === 'MATCHING') {
    const pairs = answer.matchedPairs || [];
    if (!content.matchingPairs.length) return 0;
    if (pairs.some(p => !content.matchingPairs.some(e => e.left === p.left) || !content.matchingPairs.some(e => e.right === p.right))) return 0;
    return q.marks * content.matchingPairs.filter(p => pairs.some(a => a.left === p.left && a.right === p.right)).length / content.matchingPairs.length;
  }
  return null;
}
