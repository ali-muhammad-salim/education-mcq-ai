import { expect, test, vi } from 'vitest';
import { physicsUnit16Resource } from '@/lib/physicsUnit16Resource';
import { resolveQuiz } from '@/services/assessment/service';
import { gradeAnswer, normalizeQuestion } from '@/services/assessment/scoring';

const { findFirst, upsert } = vi.hoisted(() => ({
  findFirst: vi.fn().mockResolvedValue(null),
  upsert: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  default: {
    quiz: { findFirst, upsert },
    user: { upsert: vi.fn().mockResolvedValue({ id: 'practice-library' }) },
  },
}));

test('Unit 16 resolves to a reusable 36-mark quiz with a single gradable answer per question', async () => {
  upsert.mockImplementation(async ({ create }) => ({
    ...create,
    questions: create.questions.create,
  }));
  const quiz = await resolveQuiz(physicsUnit16Resource.quizCode);
  const again = await resolveQuiz(physicsUnit16Resource.quizCode.toLowerCase());
  expect(again.id).toBe(quiz.id);
  expect(quiz.status).toBe('PUBLISHED');
  expect(quiz.totalMarks).toBe(36);
  expect(quiz.questions.map(q => q.orderIndex)).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
  const key = 'BCCBCBCBCBCCCDCB' + 'BBBBBBBCBBABBBABBCDC';
  for (const question of quiz.questions) {
    const content = normalizeQuestion(question.questionData);
    expect(content.options).toHaveLength(4);
    expect(content.explanation).toBeTruthy();
    const frozen = { ...question, id: String(question.orderIndex), content };
    for (const option of content.options) {
      expect(gradeAnswer(frozen, { selectedOptionId: option.id }))
        .toBe(option.id === key[question.orderIndex - 1] ? 1 : 0);
    }
  }
  expect(normalizeQuestion(quiz.questions[15].questionData).options.find(o => o.isCorrect)?.text).toBe('4 Ω');
  expect(normalizeQuestion(quiz.questions[29].questionData).options.find(o => o.isCorrect)?.text).toBe('Zero resistance');
});
