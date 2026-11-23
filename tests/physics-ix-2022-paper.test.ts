import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsIx2022ChapterMcqs, physicsIx2022Key } from '@/lib/physicsIx2022Paper';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('Physics IX 2022 keeps all 50 questions, the published key and reviewed practice answers', () => {
  const paper = getFallbackPaper('PHY-IX-2022-P1')!;
  expect(paper).toMatchObject({ totalMarks: 50, questionCount: 50, durationMinutes: 100 });
  expect(getAllStandardPapers().some(entry => entry.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(existsSync('public' + physicsIx2022Key.fileUrl)).toBe(true);

  const scorable = uniqueQuestions(gradablePracticeQuestions(paper.paperCode, paper.questions));
  expect(scorable.map(question => Number(question.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  expect(scorable[0].sourceRegion.assessmentSection).toBe('Theory');
  expect(scorable[40].sourceRegion.assessmentSection).toBe('Alternate to Practical');
  expect(scorable.map(question => question.sourceRegion.official_answer).join('')).toBe(
    'ABCCAABCCC' + 'ACACBDAAAA' + 'BABABCABAC' + 'CABADBABCD' + 'CCCCCAACCD',
  );
  const corrected: Record<string, string> = { 14: 'B', 38: 'A', 39: 'A' };
  for (const question of scorable) {
    const options = sourcePracticeQuestion(question).options!;
    expect(options.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(options.every(option => option.feedback?.trim())).toBe(true);
    expect(options.filter(option => option.isCorrect).map(option => option.id)).toEqual([
      corrected[question.questionNumber] ?? question.sourceRegion.official_answer,
    ]);
  }
});

test('Physics IX 2022 uses typed tables, real diagram crops and current chapter mappings', () => {
  const { paperCode, questions } = getFallbackPaper('PHY-IX-2022-P1')!;
  for (const number of [6, 41, 44, 45, 46, 47, 49, 50]) {
    expect(existsSync('public' + resolveQuestionDiagram(paperCode, number, questions[number - 1]))).toBe(true);
  }
  expect(resolveQuestionDiagram(paperCode, 30, questions[29])).toBeUndefined();
  for (const { text } of sourcePracticeQuestion(questions[29]).options!) {
    const figure = /\]\((\/paper-crops\/[^)]+)\)/.exec(text)?.[1];
    expect(figure && existsSync('public' + figure)).toBe(true);
  }
  expect(questions[25].questionText).toContain('| C | Physical balance | Water | Measuring cylinder |');
  expect(sourcePracticeQuestion(questions[25]).stemText).not.toContain('| Option');
  expect(physicsIx2022ChapterMcqs.filter(q => Boolean(q.unitNumber))).toHaveLength(42);
  for (const question of physicsIx2022ChapterMcqs) {
    expect(questionSyllabus(question.sourceRegion, [], 9, 'Physics', 'AKU-EB', true).status)
      .toBe(question.unitNumber ? 'mapped' : 'outside');
  }
});
