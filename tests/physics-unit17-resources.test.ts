import { existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import McqsClient from '@/app/[board]/[class]/[subject]/mcqs/McqsClient';
import Unit17ResourcePage from '@/app/resources/physics-x-unit-17-magnetism/page';
import ChapterTheoryUnitPage from '@/components/ChapterTheoryUnitPage';
import modelQuestions from '@/data/physics/ssc2_model_mcqs.json';
import supplements from '@/data/physics/ssc2_unit17_resources.json';
import { CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { physicsUnit17ChapterQuestions } from '@/lib/physicsSupplementaryQuestions';
import { physicsUnit17Resource as resource } from '@/lib/physicsUnit17Resources';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import { gradeAnswer, normalizeQuestion } from '@/services/assessment/scoring';
import { resolveQuiz } from '@/services/assessment/service';

vi.mock('@/lib/prisma', () => ({
  default: {
    quiz: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(async ({ create }) => ({ ...create, questions: create.questions.create })),
    },
    user: { upsert: vi.fn().mockResolvedValue({ id: 'practice-library' }) },
  },
}));
vi.mock('next/navigation', async importOriginal => ({
  ...await importOriginal<typeof import('next/navigation')>(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/components/TakeQuizModal', () => ({ default: () => null }));

test('Unit 17 routes show the four source packs and link matching practice sections', async () => {
  for (const topic of resource.topics) {
    const page = renderToStaticMarkup(await Unit17ResourcePage({ searchParams: Promise.resolve({ topic: topic.id }) }));
    expect(page).toContain(`href="${topic.pdf}"`);
    expect(page).toContain(`href="${resource.mcqsHref}"`);
    expect(page).toContain('/crqs/17');
    expect(page).toContain('/numericals/17');
    expect(existsSync('public' + topic.pdf)).toBe(true);
  }

  const params = Promise.resolve({ board: 'akueb', class: 'X', subject: 'physics', unit: '17' });
  const crqs = renderToStaticMarkup(await ChapterTheoryUnitPage({ params, mode: 'crqs' }));
  expect(crqs.match(/>Show solution<\/button>/g)).toHaveLength(91);
  expect(Array.from(crqs.matchAll(/>Q\.(\d+)\.</g), match => Number(match[1])))
    .toEqual(Array.from({ length: 93 }, (_, index) => index + 1));
  for (const q of supplements.crqs) {
    expect(q.modelAnswer).toBeTruthy();
    if (q.betterResponseImage) expect(existsSync('public' + q.betterResponseImage)).toBe(true);
  }
  const numericals = renderToStaticMarkup(await ChapterTheoryUnitPage({ params, mode: 'numericals' }));
  expect(numericals.match(/>17\.2 · Magnetic Fields and Flux ↗<\/a>/g)).toHaveLength(2);
});

test('Unit 17 notes MCQs appear in chapter practice and grade from the reviewed keys', async () => {
  const chapter = renderToStaticMarkup(createElement(McqsClient, {
    board: SUPPORTED_BOARDS.find(board => board.id === 'akueb')!,
    classDef: CLASS_DEFINITIONS.X,
    meta: getSubjectMeta('physics'),
    baseUrl: resource.chapterHref,
    questions: modelQuestions,
    annualQuestions: [],
    initialCategory: 'chapter_wise',
    initialChapter: resource.mcqSlug,
  }));
  expect(chapter.match(/>Magnetic Fields and Flux · 17\.2<\/a>/g)).toHaveLength(24);
  expect(chapter).toContain('A strong magnetic field is represented by:');
  expect(chapter).not.toContain('The field is generally strongest where field lines are:');
  const quiz = await resolveQuiz('PHY-X-UNIT-17-ALL-ALL');
  // Independently reviewed answers for 17.2, in the resource's question order.
  const reviewedKey = 'BBAC ABBB BCAB BBBB ABAB BBBB'.replaceAll(' ', '');
  const notesByStem = new Map(physicsUnit17ChapterQuestions.map(q => [q.stem, q.rawQuestionNumber]));
  const content = quiz.questions.map(q => normalizeQuestion(q.questionData));
  const notes = content.filter(q => notesByStem.has(q.stemText));
  expect(notes.map(q => notesByStem.get(q.stemText))).toEqual(
    Array.from({ length: 24 }, (_, index) => index + 1).filter(number => number !== 16),
  );
  for (const [index, question] of notes.entries()) {
    const expected = reviewedKey[notesByStem.get(question.stemText)! - 1];
    expect(question.options.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    const frozen = { id: String(index + 1), orderIndex: index + 1, marks: 1, content: question };
    for (const option of question.options) {
      expect(gradeAnswer(frozen, { selectedOptionId: option.id })).toBe(option.id === expected ? 1 : 0);
    }
  }
  const past = await resolveQuiz('PHY-X-UNIT-17-PAST-ALL');
  expect(past.questions.some(q => notesByStem.has(normalizeQuestion(q.questionData).stemText))).toBe(false);
});
