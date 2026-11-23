import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('2026 Physics Paper I has 40 gradable questions, four explanations each, and original figures', () => {
  const paper = getFallbackPaper('PHY-IX-2026-P1')!;
  expect(paper).toMatchObject({ totalMarks: 40, durationMinutes: 70, questionCount: 40 });
  expect(getAllStandardPapers().some(item => item.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const questions = gradablePracticeQuestions(paper.paperCode, paper.questions);
  expect(questions).toHaveLength(40);
  for (const question of questions) {
    const options = sourcePracticeQuestion(question).options!;
    expect(options.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(options.filter(option => option.isCorrect)).toHaveLength(1);
    expect(options.every(option => Boolean(option.feedback?.trim()))).toBe(true);
    expect(questionSyllabus(question.sourceRegion, [], 9, 'Physics', 'AKU-EB', true).status).toBe('mapped');
  }
  const graphs = questions[7];
  expect(resolveQuestionDiagram(paper.paperCode, graphs.questionNumber, graphs)).toBeUndefined();
  for (const text of Object.values(graphs.sourceRegion.choices!)) {
    const path = /\]\(([^)]+)\)/.exec(text)?.[1];
    expect(path && existsSync('public' + path)).toBe(true);
  }
  for (const index of [3, 20]) expect(existsSync('public' + questions[index].sourceRegion.diagramUrl)).toBe(true);
});

test('2026 Physics Paper II keeps both alternatives and files every worked answer by its own chapter', () => {
  const paper = getFallbackPaper('PHY-IX-2026-P2')!;
  expect(paper).toMatchObject({ totalMarks: 25, durationMinutes: 110, questionCount: 7 });
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  expect(paper.questions.map(item => item.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
  expect(paper.questions.filter(item => !item.questionNumber.endsWith('b')).reduce((sum, item) => sum + item.marks, 0)).toBe(25);
  for (const item of paper.questions) {
    const chapter = physicsChapterBank['9'].find(unit => unit.unitNumber === item.topics?.[0].topic.topicNumber)!;
    expect([...chapter.crqs, ...chapter.erqs].find(question => question.id === item.id)?.modelAnswer).toBe(item.sourceRegion.model_answer);
  }
  expect(paper.questions.at(-1)?.sourceRegion.model_answer).toContain('67,000 J');
});
