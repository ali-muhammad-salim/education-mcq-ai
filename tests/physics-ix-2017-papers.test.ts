import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsIx2017ChapterMcqs, physicsIx2017Marking, physicsIx2017References } from '@/lib/physicsIx2017Papers';
import { physicsIx2021ChapterMcqs } from '@/lib/physicsIx2021Paper';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { gradeAnswer } from '@/services/assessment/scoring';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('Physics IX 2017 keeps all 25 MCQs scorable with original keys, tables, and diagram choices', () => {
  const paper = getFallbackPaper('PHY-IX-2017-P1')!;
  expect(paper).toMatchObject({ totalMarks: 25, durationMinutes: 35, questionCount: 25 });
  expect(getAllStandardPapers().some(item => item.paperCode === paper.paperCode)).toBe(true);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
  const questions = uniqueQuestions(gradablePracticeQuestions(paper.paperCode, paper.questions));
  expect(questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  expect(questions.map(q => q.sourceRegion.official_answer).join('')).toBe('CCCAB' + 'BCCBA' + 'CDBDC' + 'CDCBC' + 'BCBDD');
  for (const [index, question] of questions.entries()) {
    const content = sourcePracticeQuestion(question);
    const accepted = question.questionNumber === '24' ? 'C' : question.sourceRegion.official_answer;
    const frozen = { id: question.id, orderIndex: index + 1, marks: 1, content };
    expect(content.options?.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    for (const option of content.options!) {
      expect(option.feedback?.trim()).toBeTruthy();
      expect(gradeAnswer(frozen, { selectedOptionId: option.id })).toBe(accepted === option.id ? 1 : 0);
    }
  }

  const instrument = questions[2];
  expect(resolveQuestionDiagram(paper.paperCode, 3, instrument)).toBeUndefined();
  for (const { text } of sourcePracticeQuestion(instrument).options!) {
    const crop = /\]\((\/paper-crops\/[^)]+)\)/.exec(text)?.[1];
    expect(crop && existsSync('public' + crop)).toBe(true);
  }
  expect(questions[22].questionText).toContain('| B | Carbon | 121 |');
  expect(sourcePracticeQuestion(questions[22]).stemText).not.toContain('| Option');
  expect(questions.filter(q => q.topics?.length)).toHaveLength(21);
  expect(uniqueQuestions([physicsIx2017ChapterMcqs[23], physicsIx2021ChapterMcqs[29]])).toHaveLength(1);
});

test('Physics IX 2017 preserves Paper II alternatives, examples, direct mappings and corrected units', () => {
  const paper = getFallbackPaper('PHY-IX-2017-P2')!;
  expect(paper).toMatchObject({ totalMarks: 40, durationMinutes: 145, questionCount: 11 });
  expect(paper.questions.map(q => q.questionNumber)).toEqual([
    '1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b', '11a', '11b',
  ]);
  expect(paper.questions.filter(q => q.sourceRegion.choice_instruction !== 'OR').reduce((marks, q) => marks + q.marks, 0)).toBe(40);
  for (const q of paper.questions) {
    expect(q.sourceRegion.model_answer).toBeTruthy();
    const mapping = questionSyllabus(q.sourceRegion, [], 9, 'Physics', 'AKU-EB', true);
    const chapters = physicsChapterBank['9'].filter(unit => [...unit.crqs, ...unit.erqs].some(item => item.id === q.id));
    if (q.questionNumber === '5') {
      expect(mapping.status).toBe('outside');
      expect(chapters).toHaveLength(0);
    } else {
      expect(mapping.status).toBe('mapped');
      expect(chapters.map(unit => unit.unitNumber)).toEqual([q.topics?.[0].topic.topicNumber]);
    }
  }
  for (const n of ['2', '4', '5', '6', '9b']) {
    const q = paper.questions.find(item => item.questionNumber === n);
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, n, q))).toBe(true);
  }
  expect(paper.questions[7].sourceRegion.model_answer).toContain('212,500 J/s');
  expect(paper.questions[8].sourceRegion.model_answer).toContain('solution-9a.webp');
  for (const path of [paper.fileUrl, '/paper-crops/PHY-IX-2017-P2/solution-9a.webp',
    ...physicsIx2017References.map(item => item.fileUrl),
    ...physicsIx2017Marking.flatMap(note => [note.example.better, note.example.weaker])]) {
    expect(existsSync('public' + path)).toBe(true);
  }
});
