import { existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import McqsClient from '@/app/[board]/[class]/[subject]/mcqs/McqsClient';
import WorkshopPage from '@/app/[board]/[class]/[subject]/resources/other/workshop-mcqs/page';
import modelQuestions from '@/data/physics/ssc1_model_mcqs.json';
import annualQuestions from '@/data/physics/ssc1_2025_past_mcqs.json';
import { CLASS_DEFINITIONS, SUPPORTED_BOARDS } from '@/lib/boardCatalog';
import { getSubjectMeta } from '@/lib/subjectMetadata';
import { physicsIxWorkshop as resource, physicsIxWorkshopChapterMcqs, physicsIxWorkshopQuestions } from '@/lib/physicsIxWorkshop';
import { resolveQuiz } from '@/services/assessment/service';
import { gradeAnswer, normalizeQuestion } from '@/services/assessment/scoring';

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
  useRouter: () => ({ push: vi.fn() }),
}));

test('the workshop keeps the source labels and 50 scorable MCQs with the PDF and all diagram options', async () => {
  const page = renderToStaticMarkup(await WorkshopPage({
    params: Promise.resolve({ board: 'akueb', class: 'IX', subject: 'physics' }),
    searchParams: Promise.resolve({}),
  }));
  expect(page.includes('aria-label="Start quiz"')).toBe(true);
  expect(page).toContain('id="question-16a"');
  expect(page).not.toContain('id="question-8"');
  expect(page.includes('density 2,727 kg/m³')).toBe(true);
  expect(page.includes('density 1,000 kg/m³')).toBe(true);
  expect(page.includes('400 J/(kg·°C)')).toBe(true);
  expect(page.includes('The source skips Q8')).toBe(false);
  expect(existsSync('public' + resource.pdf)).toBe(true);
  const quiz = await resolveQuiz(resource.quizCode);
  expect(quiz).toMatchObject({ totalMarks: 50, durationMin: 55 });
  expect(quiz.questions).toHaveLength(physicsIxWorkshopQuestions.length);
  for (const [index, row] of quiz.questions.entries()) {
    const content = normalizeQuestion(row.questionData);
    expect(content.provenance).toBe('IMPORTED');
    expect(content.options).toHaveLength(4);
    const frozen = { id: String(index + 1), orderIndex: index + 1, marks: 1, content };
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(frozen, { selectedOptionId: option.id }))
        .toBe(option.id === physicsIxWorkshopQuestions[index].correctOption ? 1 : 0);
      const image = option.text.match(/\((\/paper-crops\/[^)]+)\)$/)?.[1];
      if (image) expect(existsSync('public' + image)).toBe(true);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(normalizeQuestion(quiz.questions[47].questionData).options[0].text).toBe('11.4 N');
});

test('chapter practice combines reviewed duplicates and keeps the source links', async () => {
  expect(physicsIxWorkshopChapterMcqs).toHaveLength(48);
  const chapter = renderToStaticMarkup(createElement(McqsClient, {
    board: SUPPORTED_BOARDS.find(board => board.id === 'akueb')!,
    classDef: CLASS_DEFINITIONS.IX,
    meta: getSubjectMeta('physics'),
    baseUrl: resource.subjectHref,
    questions: modelQuestions,
    annualQuestions,
    initialCategory: 'chapter_wise',
    initialChapter: 'thermal-physics',
  }));
  expect(chapter).toContain(resource.href + '#question-33');
  expect(chapter).toContain('/past-papers/PHY-IX-2022-P1#question-32');
  expect(chapter.match(/Why are expansion gaps left|Considerable gaps are left in the construction of a railway track/g)).toHaveLength(1);

  const quiz = await resolveQuiz('PHY-IX-UNIT-8-ALL-ALL');
  const questions = quiz.questions.map(q => normalizeQuestion(q.questionData));
  expect(questions.filter(q => /Why are expansion gaps left|Considerable gaps are left in the construction of a railway track/.test(q.stemText))).toHaveLength(1);
  expect(questions.some(q => q.provenance === 'IMPORTED' && /2,400 J/.test(q.stemText))).toBe(true);
  const past = await resolveQuiz('PHY-IX-UNIT-8-PAST-ALL');
  expect(past.questions.every(q => normalizeQuestion(q.questionData).provenance === 'PAST_PAPER')).toBe(true);
});
