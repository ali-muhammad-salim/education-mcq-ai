import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsIx2018Marking, physicsIx2018References } from '@/lib/physicsIx2018Papers';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { gradeAnswer } from '@/services/assessment/scoring';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('Physics IX 2018 preserves the official letters and grades all 25 MCQs', () => {
  const paper = getFallbackPaper('PHY-IX-2018-P1')!;
  expect(paper).toMatchObject({ totalMarks: 25, durationMinutes: 35, questionCount: 25 });
  expect(getAllStandardPapers().some(item => item.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const questions = uniqueQuestions(gradablePracticeQuestions(paper.paperCode, paper.questions));
  expect(questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  expect(questions.map(q => q.sourceRegion.official_answer).join('')).toBe('DCBDD' + 'CDBAA' + 'BBCDD' + 'DCCBB' + 'DDCBB');

  const practiceKeys: Record<string, string[]> = { 11: ['D'], 18: ['A'], 19: ['B', 'D'] };
  for (const [index, question] of questions.entries()) {
    const content = sourcePracticeQuestion(question);
    const accepted = practiceKeys[question.questionNumber] ?? [question.sourceRegion.official_answer];
    const frozen = { id: question.id, orderIndex: index + 1, marks: 1, content };
    expect(content.options?.map(o => o.id)).toEqual(['A', 'B', 'C', 'D']);
    for (const option of content.options!) {
      expect(option.feedback?.trim()).toBeTruthy();
      expect(gradeAnswer(frozen, { selectedOptionId: option.id })).toBe(accepted.some(letter => letter === option.id) ? 1 : 0);
    }
  }

  for (const number of [7, 10]) {
    const question = questions[number - 1];
    expect(resolveQuestionDiagram(paper.paperCode, number, question)).toBeUndefined();
    for (const { text } of sourcePracticeQuestion(question).options!) {
      const figure = /\]\((\/paper-crops\/[^)]+)\)/.exec(text)?.[1];
      expect(figure && existsSync('public' + figure)).toBe(true);
    }
  }
  for (const number of [8, 15, 16, 18]) {
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, number, questions[number - 1]))).toBe(true);
  }
  expect(questions.filter(q => q.topics?.length)).toHaveLength(20);
});

test('Physics IX 2018 keeps all Paper II alternatives, source assets and direct chapter matches', () => {
  const paper = getFallbackPaper('PHY-IX-2018-P2')!;
  expect(paper).toMatchObject({ totalMarks: 40, durationMinutes: 145, questionCount: 11 });
  expect(paper.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b', '11a', '11b']);
  expect(paper.questions.filter(q => q.sourceRegion.choice_instruction !== 'OR').reduce((marks, q) => marks + q.marks, 0)).toBe(40);
  for (const q of paper.questions) {
    expect(q.sourceRegion.model_answer).toBeTruthy();
    const mapping = questionSyllabus(q.sourceRegion, [], 9, 'Physics', 'AKU-EB', true);
    const chapters = physicsChapterBank['9'].filter(unit => [...unit.crqs, ...unit.erqs].some(item => item.id === q.id));
    if (['3', '5', '9a', '10b', '11b'].includes(q.questionNumber)) {
      expect(mapping.status).toBe('outside');
      expect(chapters).toHaveLength(0);
    } else {
      expect(mapping.status).toBe('mapped');
      expect(chapters.map(unit => unit.unitNumber)).toEqual([q.topics?.[0].topic.topicNumber]);
    }
  }
  for (const n of [2, 6, 7]) {
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, n, paper.questions[n - 1]))).toBe(true);
  }
  for (const path of [paper.fileUrl, ...physicsIx2018References.map(item => item.fileUrl),
    ...physicsIx2018Marking.flatMap(note => [note.example.better, note.example.weaker])]) {
    expect(existsSync('public' + path)).toBe(true);
  }
});
