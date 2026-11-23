import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { guestQuestionsFrom } from '@/lib/guest-attempts';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsIx2023AnswerKey, physicsIx2023Marking, physicsIx2023References } from '@/lib/physicsIx2023Papers';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';
import { uniqueQuestions } from '@/lib/uniqueQuestions';

test('Physics IX 2023 preserves the board key and all 40 scorable MCQs', () => {
  const { paperCode, questions, fileUrl, durationMinutes } = getFallbackPaper('PHY-IX-2023-P1')!;
  expect(durationMinutes).toBe(70);
  expect(getAllStandardPapers().some(paper => paper.paperCode === paperCode)).toBe(true);
  const scorable = uniqueQuestions(gradablePracticeQuestions(paperCode, questions));
  expect(scorable.map(q => Number(q.questionNumber))).toEqual(physicsIx2023AnswerKey.map(row => row.number));
  expect(questions.map(q => q.sourceRegion.official_answer).join('')).toBe(
    'CAADDBBABA' + 'CBCCABBDCD' + 'DDCCADABCC' + 'DDBCDDBBBD',
  );
  for (const question of scorable) {
    const options = sourcePracticeQuestion(question).options!;
    expect(options.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(options.every(option => option.feedback?.trim())).toBe(true);
    expect(options.filter(option => option.isCorrect).map(option => option.id)).toEqual([
      question.questionNumber === '30' ? 'A' : question.sourceRegion.official_answer,
    ]);
  }
  expect(sourcePracticeQuestion(questions[7]).stemText).toContain('| IV | 36–49 |');
  expect(sourcePracticeQuestion(questions[29]).stemText).not.toContain('| Option');
  expect(guestQuestionsFrom(paperCode, [questions[29]])[0]).toMatchObject({
    stemText: questions[29].sourceRegion.quiz_stem,
    options: sourcePracticeQuestion(questions[29]).options!.map(({ id, text }) => ({ id, text })),
  });
  expect(existsSync('public' + resolveQuestionDiagram(paperCode, 23, questions[22]))).toBe(true);
  expect(resolveQuestionDiagram(paperCode, 22, questions[21])).toBeUndefined();
  expect(existsSync('public' + fileUrl)).toBe(true);
});

test('Physics IX 2023 lists directly mapped written questions and retains the original documents', () => {
  const paper = getFallbackPaper('PHY-IX-2023-P2')!;
  expect(paper.questions.map(question => question.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
  expect(paper.questions.filter(q => q.sourceRegion.choice_instruction !== 'OR').reduce((marks, q) => marks + q.marks, 0)).toBe(25);
  const chapters = physicsChapterBank['9'];
  for (const question of paper.questions) {
    const mapping = questionSyllabus(question.sourceRegion, [], 9, 'Physics', 'AKU-EB', true);
    const matchingChapters = chapters.filter(unit => [...unit.crqs, ...unit.erqs].some(item => item.id === question.id));
    if (question.questionNumber === '3') {
      expect(mapping.status).toBe('outside');
      expect(matchingChapters).toEqual([]);
    } else {
      expect(mapping.status).toBe('mapped');
      expect(matchingChapters.map(unit => unit.unitNumber)).toEqual([question.topics?.[0].topic.topicNumber]);
    }
  }
  for (const path of [paper.fileUrl, paper.questions[4].sourceRegion.diagramUrl, ...physicsIx2023References.map(ref => ref.fileUrl), ...physicsIx2023Marking.flatMap(note => [note.example.better, note.example.weaker])]) {
    expect(existsSync('public' + path)).toBe(true);
  }
});
