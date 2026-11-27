import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2018AnswerKey, physicsX2018ChapterMcqs, physicsX2018ChapterWritten, physicsX2018Marking, physicsX2018References } from '@/lib/physicsX2018Papers';
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

test('2018 Paper I grades all 25 questions with reviewed alternates and diagram options', async () => {
  const code = 'PHY-X-2018-P1';
  const paper = getFallbackPaper(code)!;
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const quiz = await resolveQuiz(code + '-MCQS-25');
  expect(quiz).toMatchObject({ totalMarks: 25, durationMin: 35 });
  expect(quiz.questions).toHaveLength(25);
  expect(physicsX2018AnswerKey.map(row => row.letter).join('')).toBe('CCBBADCAAABABCCABBACABCCA');
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const q = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const keys = item.orderIndex === 9 || item.orderIndex === 16 ? ['A', 'C'] : [physicsX2018AnswerKey[item.orderIndex - 1].letter];
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(q, { selectedOptionId: option.id })).toBe(keys.includes(option.id ?? '') ? 1 : 0);
      if (item.orderIndex === 11 || item.orderIndex === 18) {
        const figure = option.text.match(/\((\/paper-crops\/[^)]+)\)$/)?.[1];
        expect(figure && existsSync('public' + figure)).toBe(true);
      }
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(physicsX2018ChapterMcqs).toHaveLength(23);
  const duplicate = getFallbackPaper('PHY-X-2024-P1')!.questions[22];
  expect(groupDuplicateQuestions([paper.questions[15], duplicate], q => q)).toHaveLength(1);
});

test('2018 Paper II preserves all three pairs of alternatives and source evidence', () => {
  const paper = getFallbackPaper('PHY-X-2018-P2')!;
  expect(paper).toMatchObject({ questionCount: 11, totalMarks: 40, durationMinutes: 145 });
  expect(paper.questions.map(q => q.questionNumber))
    .toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b', '11a', '11b']);
  expect(paper.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(40);
  expect(physicsX2018ChapterWritten).toHaveLength(12);
  expect(paper.questions.find(q => q.questionNumber === '10b')?.sourceRegion.model_answer).toContain('3.2 cm');
  const assets = [paper.fileUrl, ...physicsX2018References.map(ref => ref.fileUrl),
    ...physicsX2018Marking.flatMap(note => [note.example.better, note.example.weaker]),
    '/paper-crops/PHY-X-2018-P2/solution-10a-concave-mirror.webp',
    '/paper-crops/PHY-X-2018-P2/solution-11a-parallel-capacitors.webp'];
  expect(assets.every(asset => existsSync('public' + asset))).toBe(true);
});
