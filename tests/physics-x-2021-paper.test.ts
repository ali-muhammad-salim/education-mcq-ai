import { existsSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { physicsX2021AnswerKey, physicsX2021ChapterMcqs, physicsX2021Key, physicsX2021ModelDuplicateKeys } from '@/lib/physicsX2021Paper';
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

test('the Class X Physics 2021 quiz includes both parts and independently grades all 50 items', async () => {
  const code = 'PHY-X-2021-P1';
  const paper = getFallbackPaper(code)!;
  expect(paper).toMatchObject({ totalMarks: 50, durationMinutes: 100, printedCode: 'S2102-1721110' });
  expect(paper.questions.filter(q => q.sourceRegion.assessmentSection).map(q => q.questionNumber)).toEqual(['1', '41']);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(existsSync('public' + physicsX2021Key.fileUrl)).toBe(true);
  expect(physicsX2021AnswerKey.map(row => row.letter).join('')).toBe('CBACDCAABCCCBDACBABCACDCCABBDADDACABCCBCCCBBDBBDCC');
  const quiz = await resolveQuiz(code + '-MCQS-50');
  expect(quiz).toMatchObject({ totalMarks: 50, durationMin: 100 });
  expect(quiz.questions).toHaveLength(50);
  for (const item of quiz.questions) {
    const content = normalizeQuestion(item.questionData);
    const q = { id: String(item.orderIndex), orderIndex: item.orderIndex, marks: 1, content };
    const correct = item.orderIndex === 12 ? 'A' : item.orderIndex === 25 ? 'B' : physicsX2021AnswerKey[item.orderIndex - 1].letter;
    expect(content.options).toHaveLength(4);
    for (const option of content.options) {
      expect(option.feedback).toBeTruthy();
      expect(gradeAnswer(q, { selectedOptionId: option.id })).toBe(option.id === correct ? 1 : 0);
    }
    if (content.diagramUrl) expect(existsSync('public' + content.diagramUrl)).toBe(true);
  }
  expect(normalizeQuestion(quiz.questions[4].questionData).options[3].text).toBe('90 cm/s');
  expect(normalizeQuestion(quiz.questions[49].questionData).stemText).toContain('| Row | Input P | Input Q | Output R |');
  for (const item of [quiz.questions[35], quiz.questions[43]]) {
    for (const option of normalizeQuestion(item.questionData).options) {
      const figure = option.text.match(/\((\/paper-crops\/[^)]+)\)$/)?.[1];
      expect(figure && existsSync('public' + figure)).toBe(true);
    }
  }
});

test('chapter practice keeps direct syllabus matches and groups reviewed copies across the archive', () => {
  expect(physicsX2021ChapterMcqs).toHaveLength(41);
  const model = getFallbackPaper('PHY-X-P1')!;
  for (const [number, duplicateKey] of Object.entries(physicsX2021ModelDuplicateKeys)) {
    const annual = physicsX2021ChapterMcqs.find(q => q.sourceRegion.reviewed_duplicate_key === duplicateKey)!;
    expect(groupDuplicateQuestions([model.questions[Number(number) - 1], annual], q => q)).toHaveLength(1);
  }
  const thermionicCopies = ['PHY-X-2021-P1', 'PHY-X-2024-P1', 'PHY-X-2026-P1'].map(
    code => getFallbackPaper(code)!.questions.find(q => q.sourceRegion.reviewed_duplicate_key === 'physics-x-thermionic-particles')!,
  );
  expect(groupDuplicateQuestions(thermionicCopies, q => q)).toHaveLength(1);
});
