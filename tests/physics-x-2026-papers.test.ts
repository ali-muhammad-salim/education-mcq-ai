import { existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
import StructuredContent from '@/components/StructuredContent';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsX2026ChapterMcqs } from '@/lib/physicsX2026Papers';
import { gradablePracticeQuestions, resolveQuiz, sourcePracticeQuestion } from '@/services/assessment/service';
import { normalizeQuestion } from '@/services/assessment/scoring';

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

test('Class X Physics 2026 serves and scores every MCQ with its published explanation and direct chapter mapping', () => {
  const paper = getFallbackPaper('PHY-X-2026-P1')!;
  expect(paper).toMatchObject({ totalMarks: 40, durationMinutes: 70, printedCode: 'S2602-1721110' });
  expect(getAllStandardPapers().some(item => item.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const gradable = gradablePracticeQuestions(paper.paperCode, paper.questions);
  expect(gradable).toHaveLength(40);
  const accepted = new Map([['14', ['B', 'D']], ['32', ['A', 'B']], ['37', ['A', 'B']]]);
  expect(gradable.map(q => q.sourceRegion.correct_answer).join('')).toBe('ADBCCDBDBBCCADCACDACDCCACDCDDBCBBBBCADBB');
  for (const question of gradable) {
    const options = sourcePracticeQuestion(question).options;
    expect(options).toHaveLength(4);
    expect(options.every(option => option.feedback)).toBe(true);
    expect(options.filter(option => option.isCorrect).map(option => option.id)).toEqual(
      accepted.get(question.questionNumber) ?? [question.sourceRegion.correct_answer],
    );
  }
  const unmapped = ['3', '14', '32', '33', '34', '35'];
  expect(gradable.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME').map(q => q.questionNumber)).toEqual(unmapped);
  expect(physicsX2026ChapterMcqs.map(q => q.id)).toEqual(gradable.filter(q => !unmapped.includes(q.questionNumber)).map(q => q.id));
  expect(existsSync('public' + gradable[17].sourceRegion.diagramUrl)).toBe(true);
});

test('Class X Physics 2026 keeps both written alternatives and only adds direct matches to chapters', () => {
  const paper = getFallbackPaper('PHY-X-2026-P2')!;
  expect(paper).toMatchObject({ totalMarks: 25, durationMinutes: 110, questionCount: 7 });
  expect(getAllStandardPapers().some(item => item.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(paper.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
  expect(paper.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(25);
  for (const q of paper.questions) {
    const sources = physicsChapterBank['10'].flatMap(unit => [...unit.crqs, ...unit.erqs]);
    expect(sources.find(source => source.id === q.id)?.modelAnswer).toBe(q.sourceRegion.in_syllabus ? q.sourceRegion.model_answer : undefined);
    if (q.sourceRegion.diagramUrl) expect(existsSync('public' + q.sourceRegion.diagramUrl)).toBe(true);
  }
  expect(paper.questions.at(-1)?.sourceRegion.model_answer).toContain('2.20 A');
  const html = renderToStaticMarkup(createElement(StructuredContent, { text: paper.questions[2].sourceRegion.model_answer! }));
  expect(html).toContain('q3-answer.webp');
  expect(html.match(/<tr\b/g)).toHaveLength(5);
});

test('the 2026 Physics paper and chapter quiz entry points use the new scorings and diagrams', async () => {
  for (const id of ['PHY-X-2026-P1', 'PHY-X-2026-P1-MCQS-40']) {
    const quiz = await resolveQuiz(id);
    expect(quiz).toMatchObject({ totalMarks: 40, durationMin: 70 });
    expect(quiz.questions).toHaveLength(40);
    expect(normalizeQuestion(quiz.questions[17].questionData).diagramUrl).toBe('/paper-crops/PHY-X-2026-P1/q18.webp');
  }
  const chapter = await resolveQuiz('PHY-X-UNIT-12-PAST-ALL');
  const sonar = chapter.questions.map(q => normalizeQuestion(q.questionData)).find(q => q.stemText.includes('echo-ranging sonar'));
  expect(sonar?.options.find(option => option.isCorrect)?.text).toBe('Ultrasound');
});
