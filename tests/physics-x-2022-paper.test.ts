import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2022AnswerKey, physicsX2022ChapterMcqs, physicsX2022Key } from '@/lib/physicsX2022Paper';
import { groupDuplicateQuestions } from '@/lib/uniqueQuestions';
import { gradeAnswer, normalizeQuestion } from '@/services/assessment/scoring';
import { resolveQuiz } from '@/services/assessment/service';

vi.mock('@/lib/prisma', () => ({
  default: {
    quiz: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(async ({ create }) => ({ ...create, questions: create.questions.create })),
    },
    user: { upsert: vi.fn().mockResolvedValue({ id: 'practice-library' }) },
    pastPaper: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

test('the full 2022 Class X Physics quiz grades all 50 questions with reviewed corrections', async () => {
  const paper = getFallbackPaper('PHY-X-2022-P1')!;
  expect(paper).toMatchObject({ totalMarks: 50, durationMinutes: 100, printedCode: 'S2202-1721110' });
  expect(paper.questions.filter(q => q.sourceRegion.assessmentSection).map(q => q.questionNumber)).toEqual(['1', '41']);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(existsSync('public' + physicsX2022Key.fileUrl)).toBe(true);
  expect(physicsX2022AnswerKey.map(row => row.letter).join('')).toBe('ABBAACCCBACCCBAABBCAADCACBACCADBAACAADBBCADDBDAACB');

  const quiz = await resolveQuiz('PHY-X-2022-P1-MCQS-50');
  expect(quiz).toMatchObject({ totalMarks: 50, durationMin: 100 });
  expect(quiz.questions).toHaveLength(50);
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const question = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const accepted = item.orderIndex === 29 ? ['B', 'C']
      : [item.orderIndex === 30 ? 'B' : physicsX2022AnswerKey[item.orderIndex - 1].letter];
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(question, { selectedOptionId: option.id })).toBe(accepted.includes(option.id ?? '') ? 1 : 0);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(normalizeQuestion(quiz.questions[10].questionData).stemText).toContain('| Row | Focal length | Lens power |');
  for (const choice of normalizeQuestion(quiz.questions[34].questionData).options) {
    const figure = choice.text.match(/\((\/paper-crops\/[^)]+)\)$/)?.[1];
    expect(figure && existsSync('public' + figure)).toBe(true);
  }
});

test('chapter practice keeps direct syllabus matches and groups the repeated prism question', () => {
  expect(physicsX2022ChapterMcqs).toHaveLength(40);
  const repeat = getFallbackPaper('PHY-X-2024-P1')!.questions[10];
  const original = physicsX2022ChapterMcqs.find(q => q.rawQuestionNumber === 43)!;
  expect(groupDuplicateQuestions([repeat, original], q => q)).toEqual([[repeat, original]]);
});
