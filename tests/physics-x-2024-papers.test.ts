import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2024AnswerKey, physicsX2024ChapterMcqs, physicsX2024ChapterWritten, physicsX2024Marking, physicsX2024References } from '@/lib/physicsX2024Papers';
import { gradablePracticeQuestions, resolveQuiz } from '@/services/assessment/service';
import { gradeAnswer, normalizeQuestion } from '@/services/assessment/scoring';

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

test('Class X Physics 2024 preserves the printed key and independently scores all 40 questions', async () => {
  const code = 'PHY-X-2024-P1';
  const paper = getFallbackPaper(code)!;
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(gradablePracticeQuestions(code, paper.questions)).toHaveLength(40);
  expect(physicsX2024AnswerKey.map(row => row.letter).join('')).toBe('CCBBCBCBA•BAA0AA0A00C0ACCCCB00B0B0ABCBC0');
  const quiz = await resolveQuiz(code + '-MCQS-40');
  expect(quiz).toMatchObject({ totalMarks: 40, durationMin: 70 });
  expect(quiz.questions).toHaveLength(40);
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const q = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const original = physicsX2024AnswerKey[item.orderIndex - 1].letter;
    const accepted = item.orderIndex === 23 ? ['A', 'C'] : [original === '0' ? 'D' : original === '•' ? 'C' : original];
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(q, { selectedOptionId: option.id })).toBe(accepted.includes(option.id ?? '') ? 1 : 0);
    }
  }
  expect(normalizeQuestion(quiz.questions[9].questionData).options[2].text).toBe('15 cm');
  expect(normalizeQuestion(quiz.questions[30].questionData).stemText).toContain('| Input A | Input B | Output |');
  for (const option of normalizeQuestion(quiz.questions[15].questionData).options) {
    const figure = option.text.match(/\((\/paper-crops\/[^)]+)\)$/)?.[1];
    expect(figure && existsSync('public' + figure)).toBe(true);
  }
  expect(physicsX2024ChapterMcqs).toHaveLength(35);
});

test('written paper retains all alternatives and links verified chapter items and source notes', () => {
  const paper = getFallbackPaper('PHY-X-2024-P2')!;
  expect(paper).toMatchObject({ questionCount: 7, totalMarks: 25, durationMinutes: 110 });
  expect(paper.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
  expect(physicsX2024ChapterWritten).toHaveLength(6);
  const files = [paper.fileUrl, ...physicsX2024References.map(ref => ref.fileUrl),
    ...physicsX2024Marking.flatMap(note => [note.example.better, note.example.weaker])];
  expect(files.every(file => existsSync('public' + file))).toBe(true);
  for (const example of ['reflection', 'refraction']) {
    const diagram = '/paper-crops/PHY-X-2024-P2/solution-6a-' + example + '.webp';
    expect(paper.questions[5].sourceRegion.model_answer).toContain(diagram);
    expect(existsSync('public' + diagram)).toBe(true);
  }
});
