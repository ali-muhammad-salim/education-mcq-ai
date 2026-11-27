import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsX2019AnswerKey, physicsX2019ChapterMcqs, physicsX2019ChapterWritten, physicsX2019Marking, physicsX2019References } from '@/lib/physicsX2019Papers';
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

test('the 2019 Class X Physics quiz scores all 25 questions with reviewed corrections', async () => {
  const code = 'PHY-X-2019-P1';
  expect(existsSync('public' + getFallbackPaper(code)!.fileUrl)).toBe(true);
  const quiz = await resolveQuiz(code + '-MCQS-25');
  expect(quiz).toMatchObject({ totalMarks: 25, durationMin: 40 });
  expect(quiz.questions).toHaveLength(25);
  expect(physicsX2019AnswerKey.map(row => row.letter).join('')).toBe('DCBDAABCDABBBABBDBDAACBCA');
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const q = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const keys = item.orderIndex === 8 ? ['A', 'C'] : [item.orderIndex === 5 ? 'C' : physicsX2019AnswerKey[item.orderIndex - 1].letter];
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(q, { selectedOptionId: option.id })).toBe(keys.includes(option.id ?? '') ? 1 : 0);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(physicsX2019ChapterMcqs).toHaveLength(22);
  const exam = getFallbackPaper(code)!.questions[20];
  const model = getFallbackPaper('PHY-X-P1')!.questions[35];
  expect(groupDuplicateQuestions([exam, model], q => q)).toHaveLength(1);
});

test('the written paper and marking notes include all alternatives and preserve both sources of the repeated CRQ', () => {
  const paper = getFallbackPaper('PHY-X-2019-P2')!;
  expect(paper).toMatchObject({ questionCount: 11, totalMarks: 40, durationMinutes: 140 });
  expect(paper.questions.map(q => q.questionNumber))
    .toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b', '11a', '11b']);
  expect(paper.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(40);
  expect(physicsX2019ChapterWritten).toHaveLength(13);
  expect(paper.questions[0].sourceRegion.model_answer).toContain('3.75 × 10⁶ m');
  const unit = physicsChapterBank['10'].find(unit => unit.unitNumber === 20)!;
  expect(unit.crqs.find(q => q.id === 'PHY-X-2019-P2-q8')).toMatchObject({
    additionalSources: [{ href: '/past-papers/PHY-X-2024-P2#question-5' }],
  });
  expect(unit.crqs.some(q => q.id === 'PHY-X-2024-P2-q5')).toBe(false);
  const assets = [paper.fileUrl, ...physicsX2019References.map(ref => ref.fileUrl),
    ...physicsX2019Marking.flatMap(note => [note.example.better, note.example.weaker]),
    '/paper-crops/PHY-X-2019-P2/solution-10a-telescope.webp',
    '/paper-crops/PHY-X-2019-P2/solution-10b-near-vision.webp'];
  expect(assets.every(asset => existsSync('public' + asset))).toBe(true);
});
