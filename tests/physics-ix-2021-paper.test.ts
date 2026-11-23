import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsIx2021ChapterMcqs, physicsIx2021Key } from '@/lib/physicsIx2021Paper';
import { physicsIx2023ChapterMcqs } from '@/lib/physicsIx2023Papers';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { gradeAnswer } from '@/services/assessment/scoring';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('Physics IX 2021 preserves the original key and scores all 50 questions', () => {
  const paper = getFallbackPaper('PHY-IX-2021-P1')!;
  expect(paper).toMatchObject({ totalMarks: 50, questionCount: 50, durationMinutes: 100 });
  expect(getAllStandardPapers().some(entry => entry.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(existsSync('public' + physicsIx2021Key.fileUrl)).toBe(true);
  const scorable = uniqueQuestions(gradablePracticeQuestions(paper.paperCode, paper.questions));
  expect(scorable.map(question => Number(question.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  expect(scorable[0].sourceRegion.assessmentSection).toBe('Theory');
  expect(scorable[40].sourceRegion.assessmentSection).toBe('Alternate to Practical');
  expect(scorable.map(question => question.sourceRegion.official_answer).join('')).toBe(
    'DCCDACBAAA' + 'CBCCCBACBD' + 'CCCBBBDDDC' + 'CBDBBBBABD' + 'DBACBDBCDC',
  );
  const practiceKeys: Record<number, string> = { 22: 'BC', 28: 'ABCD', 36: 'AB', 37: 'BD' };
  for (const [index, question] of scorable.entries()) {
    const content = sourcePracticeQuestion(question);
    const frozen = { id: question.id, orderIndex: index + 1, marks: 1, content };
    expect(content.options?.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    const keys = practiceKeys[index + 1] ?? question.sourceRegion.official_answer ?? '';
    for (const option of content.options!) {
      expect(option.feedback?.trim()).toBeTruthy();
      expect(gradeAnswer(frozen, { selectedOptionId: option.id })).toBe([...keys].some(key => key === option.id) ? 1 : 0);
    }
  }
});

test('Physics IX 2021 keeps typed tables and cropped diagrams and groups repeated items in chapter practice', () => {
  const paper = getFallbackPaper('PHY-IX-2021-P1')!;
  for (const n of [11, 12, 42, 44, 45, 46, 47, 49, 50]) {
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, n, paper.questions[n - 1]))).toBe(true);
  }
  expect(resolveQuestionDiagram(paper.paperCode, 8, paper.questions[7])).toBeUndefined();
  expect(sourcePracticeQuestion(paper.questions[7]).stemText).toContain('| IV | 36–49 |');
  expect(paper.questions[13].questionText).toContain('| C | decrease | remain the same |');
  expect(sourcePracticeQuestion(paper.questions[13]).stemText).not.toContain('| Option');
  expect(physicsIx2021ChapterMcqs.filter(q => Boolean(q.unitNumber))).toHaveLength(42);
  for (const question of physicsIx2021ChapterMcqs) {
    expect(questionSyllabus(question.sourceRegion, [], 9, 'Physics', 'AKU-EB', true).status)
      .toBe(question.unitNumber ? 'mapped' : 'outside');
  }
  expect(uniqueQuestions([physicsIx2023ChapterMcqs[7], physicsIx2021ChapterMcqs[7]])).toHaveLength(1);
});
