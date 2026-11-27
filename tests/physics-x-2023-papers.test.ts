import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2023AnswerKey, physicsX2023ChapterMcqs, physicsX2023ChapterWritten, physicsX2023Marking, physicsX2023References } from '@/lib/physicsX2023Papers';
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

test('Class X Physics 2023 scores all 40 questions and accepts either surface-wave component', async () => {
  const quiz = await resolveQuiz('PHY-X-2023-P1-MCQS-40');
  expect(quiz).toMatchObject({ totalMarks: 40, durationMin: 70 });
  expect(quiz.questions).toHaveLength(40);
  expect(physicsX2023AnswerKey[1].letter).toBe('C,B');
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const question = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const official = physicsX2023AnswerKey[item.orderIndex - 1];
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(question, { selectedOptionId: option.id }))
        .toBe(official.letter.split(',').includes(option.id ?? '') ? 1 : 0);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(normalizeQuestion(quiz.questions[4].questionData).options[0].text).toBe('Regularity of vibration');
  expect(normalizeQuestion(quiz.questions[38].questionData).options[3].text).toBe('I only');
  expect(physicsX2023ChapterMcqs).toHaveLength(30);
  const model = getFallbackPaper('PHY-X-P1')!.questions[30];
  const annual = getFallbackPaper('PHY-X-2023-P1')!.questions[30];
  expect(groupDuplicateQuestions([model, annual], question => question)).toHaveLength(1);
});

test('the written paper preserves both alternatives and exposes the reviewed chapter items', () => {
  const paper = getFallbackPaper('PHY-X-2023-P2')!;
  expect(paper).toMatchObject({ questionCount: 7, totalMarks: 25, durationMinutes: 110 });
  expect(paper.questions.map(question => question.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
  expect(physicsX2023ChapterWritten.map(question => question.questionNumber)).toEqual(['1', '3', '5', '6a', '6b', '7b']);
  const figures = [paper.questions[8].sourceRegion.diagramUrl, '/paper-crops/PHY-X-2023-P2/solution-1-glass-slab.webp'];
  const files = [paper.fileUrl, ...figures, ...physicsX2023References.map(ref => ref.fileUrl),
    ...physicsX2023Marking.flatMap(note => [note.example.better, note.example.weaker])];
  expect(files.every(file => file && existsSync('public' + file))).toBe(true);
  expect(paper.questions[8].sourceRegion.model_answer).toContain('11 Ω');
});
