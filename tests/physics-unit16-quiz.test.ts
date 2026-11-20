import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import McqsClient from '@/app/[board]/[class]/[subject]/mcqs/McqsClient';
import ChapterTheoryUnitPage from '@/components/ChapterTheoryUnitPage';
import Unit16ResourcePage from '@/app/resources/physics-x-unit-16-dc-circuits/page';
import modelQuestions from '@/data/physics/ssc2_model_mcqs.json';
import { CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import { physicsUnit16Resource } from '@/lib/physicsUnit16Resource';
import { physicsUnit16ChapterQuestions } from '@/lib/physicsUnit16Questions';
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
vi.mock('next/navigation', async importOriginal => ({
  ...await importOriginal<typeof import('next/navigation')>(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/TakeQuizModal', () => ({ default: () => null }));

test('Unit 16 pages render the notes questions and worked numericals', async () => {
  const props = {
    board: SUPPORTED_BOARDS.find(board => board.id === 'akueb')!,
    classDef: CLASS_DEFINITIONS.X,
    meta: getSubjectMeta('physics'),
    baseUrl: '/akueb/X/physics',
    questions: modelQuestions,
    annualQuestions: [],
    initialCategory: 'chapter_wise' as const,
  };
  const directory = renderToStaticMarkup(createElement(McqsClient, props));
  expect(directory).toMatch(/36(?:<!-- -->)? (?:<!-- -->)?from notes/);
  const chapter = renderToStaticMarkup(createElement(McqsClient, { ...props, initialChapter: 'dc-circuits' }));
  expect(chapter.match(/>D\.C\. Circuits Notes<\/a>/g)).toHaveLength(36);
  expect(chapter).not.toMatch(/>Q\d+ \(D\.C\. Circuits Notes\)/);
  expect(chapter).toContain('aria-label="D.C. Circuits Notes, original question 1"');
  expect(chapter).toContain('/past-papers/PHY-X-P1#question-18');
  const numbers = Array.from(chapter.matchAll(/>Q\.(\d+)\.</g), match => Number(match[1]));
  expect(numbers.length).toBeGreaterThan(36);
  expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  const adjacentChapter = renderToStaticMarkup(createElement(McqsClient, { ...props, initialChapter: 'electric-current' }));
  expect(adjacentChapter).not.toContain('D.C. Circuits Notes');

  const numericals = renderToStaticMarkup(await ChapterTheoryUnitPage({
    params: Promise.resolve({ board: 'akueb', class: 'X', subject: 'physics', unit: '16' }),
    mode: 'numericals',
  }));
  const notes = renderToStaticMarkup(createElement(Unit16ResourcePage));
  for (const title of ['Example 1', 'Example 2', 'Q16 worked', 'Q36 extended']) {
    expect(numericals).toContain(title);
    expect(notes).toContain(title);
  }
});

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

test('Class X chapter quizzes include notes in Unit 16 and the full bank with matching filters', async () => {
  upsert.mockImplementation(async ({ create }) => ({
    ...create,
    questions: create.questions.create,
  }));
  const cases = [
    ['PHY-X-UNIT-16-ALL-ALL', physicsUnit16ChapterQuestions],
    ['PHY-X-UNIT-0-ALL-ALL', physicsUnit16ChapterQuestions],
    ['PHY-X-UNIT-16-ALL-A', physicsUnit16ChapterQuestions.filter(q => q.cognitiveLevel === 'Application')],
    ['PHY-X-UNIT-16-PAST-ALL', []],
    ['PHY-X-UNIT-15-ALL-ALL', []],
  ] as const;
  const notesByStem = new Map(physicsUnit16ChapterQuestions.map(q => [q.stem, q]));
  for (const [code, expected] of cases) {
    const quiz = await resolveQuiz(code);
    const notes = quiz.questions.map(q => normalizeQuestion(q.questionData)).filter(q => notesByStem.has(q.stemText));
    expect(notes.map(q => q.stemText)).toEqual(expected.map(q => q.stem));
    for (const q of notes) {
      const source = notesByStem.get(q.stemText)!;
      expect(q.options.find(o => o.isCorrect)?.id).toBe(source.correctOption);
    }
    if (expected.length) expect(quiz.id).toMatch(/-NOTES-[a-f0-9]{16}$/);
  }
});
