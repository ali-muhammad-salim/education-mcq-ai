import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2017AnswerKey, physicsX2017ChapterMcqs, physicsX2017ChapterWritten, physicsX2017Marking, physicsX2017References } from '@/lib/physicsX2017Papers';
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

test('2017 Paper I loads a 35-minute quiz with all 25 MCQs and their reviewed feedback', async () => {
  const code = 'PHY-X-2017-P1';
  const paper = getFallbackPaper(code)!;
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const quiz = await resolveQuiz(code + '-MCQS-25');
  expect(quiz).toMatchObject({ totalMarks: 25, durationMin: 35 });
  expect(quiz.questions).toHaveLength(25);
  expect(physicsX2017AnswerKey.map(row => row.letter).join('')).toBe('AADDDCABDDCAACCDCDAACBAAB');
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const q = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const key = physicsX2017AnswerKey[item.orderIndex - 1].letter;
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(q, { selectedOptionId: option.id })).toBe(option.id === key ? 1 : 0);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(normalizeQuestion(quiz.questions[2].questionData).options[3].text).toBe('45 cm/s');
  expect(physicsX2017ChapterMcqs).toHaveLength(21);
  const repeat = getFallbackPaper('PHY-X-2024-P1')!.questions[11];
  expect(groupDuplicateQuestions([paper.questions[6], repeat], q => q)).toHaveLength(1);
  const differentWaveFigure = getFallbackPaper('PHY-X-2021-P1')!.questions[4];
  expect(groupDuplicateQuestions([paper.questions[2], differentWaveFigure], q => q)).toHaveLength(2);
});

test('2017 Paper II keeps 11 numbered questions, all six alternatives and the marking examples', () => {
  const paper = getFallbackPaper('PHY-X-2017-P2')!;
  expect(paper).toMatchObject({ questionCount: 11, totalMarks: 40, durationMinutes: 145 });
  expect(paper.questions.map(q => q.questionNumber))
    .toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b', '11a', '11b']);
  expect(paper.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(40);
  expect(physicsX2017ChapterWritten).toHaveLength(13);
  expect(paper.questions[3].sourceRegion.model_answer).toContain('Electrostatic induction');
  expect(paper.questions[4].sourceRegion.model_answer).toContain('2,880 W');
  expect(paper.questions[7].sourceRegion.model_answer).toContain('214 ≠ 208 + 4');
  const solutionImages = paper.questions.flatMap(q =>
    [...(q.sourceRegion.model_answer ?? '').matchAll(/\]\((\/paper-crops\/[^)]+)\)/g)].map(match => match[1]));
  expect(solutionImages).toHaveLength(3);
  const assets = [paper.fileUrl, ...physicsX2017References.map(ref => ref.fileUrl), ...solutionImages,
    ...physicsX2017Marking.flatMap(note => [note.example.better, note.example.weaker])];
  expect(assets.every(asset => existsSync('public' + asset))).toBe(true);
});
