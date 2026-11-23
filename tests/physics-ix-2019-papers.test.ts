import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { resolveQuestionDiagram } from '@/lib/diagramResolver';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { physicsChapterBank } from '@/lib/physicsChapterBank';
import { physicsIx2019Marking, physicsIx2019References } from '@/lib/physicsIx2019Papers';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { uniqueQuestions } from '@/lib/uniqueQuestions';
import { gradeAnswer } from '@/services/assessment/scoring';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

test('Physics IX 2019 keeps all paper I questions scorable with the published asterisk preserved', () => {
  const paper = getFallbackPaper('PHY-IX-2019-P1')!;
  expect(paper).toMatchObject({ totalMarks: 30, durationMinutes: 45, questionCount: 30 });
  expect(getAllStandardPapers().some(entry => entry.paperCode === paper.paperCode)).toBe(true);
  const scorable = uniqueQuestions(gradablePracticeQuestions(paper.paperCode, paper.questions));
  expect(scorable.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  expect(scorable.map(q => q.sourceRegion.official_answer).join('')).toBe('ACAADACBDB' + 'BAABAADDBC' + 'ABACDDB*AC');
  for (const [index, question] of scorable.entries()) {
    const content = sourcePracticeQuestion(question);
    const correct = question.questionNumber === '28' ? 'D' : question.sourceRegion.official_answer;
    expect(content.options?.map(option => option.id)).toEqual(['A', 'B', 'C', 'D']);
    for (const option of content.options!) {
      expect(option.feedback?.trim()).toBeTruthy();
      expect(gradeAnswer({ id: question.id, orderIndex: index + 1, marks: 1, content }, {
        selectedOptionId: option.id,
      })).toBe(option.id === correct ? 1 : 0);
    }
  }
  expect(paper.questions[11].questionText).toContain('| A | 15 N | along OQ |');
  expect(sourcePracticeQuestion(paper.questions[11]).stemText).not.toContain('| Option');
  for (const number of [4, 6, 7, 8, 12]) {
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, number, paper.questions[number - 1]))).toBe(true);
  }
  expect(resolveQuestionDiagram(paper.paperCode, 28, paper.questions[27])).toBeUndefined();
  expect(scorable.filter(q => q.topics?.length)).toHaveLength(24);
  expect(existsSync('public' + paper.fileUrl)).toBe(true);
});

test('Physics IX 2019 preserves Paper II alternatives, relevant chapter entries and board examples', () => {
  const paper = getFallbackPaper('PHY-IX-2019-P2')!;
  expect(paper).toMatchObject({ totalMarks: 35, durationMinutes: 135, questionCount: 10 });
  expect(paper.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b']);
  expect(paper.questions.filter(q => q.sourceRegion.choice_instruction !== 'OR').reduce((sum, q) => sum + q.marks, 0)).toBe(35);
  for (const q of paper.questions) {
    expect(q.sourceRegion.model_answer).toBeTruthy();
    const mapping = questionSyllabus(q.sourceRegion, [], 9, 'Physics', 'AKU-EB', true);
    const chapters = physicsChapterBank['9'].filter(unit => [...unit.crqs, ...unit.erqs].some(item => item.id === q.id));
    if (['5', '10b'].includes(q.questionNumber)) {
      expect(mapping.status).toBe('outside');
      expect(chapters).toHaveLength(0);
    } else {
      expect(mapping.status).toBe('mapped');
      expect(chapters.map(unit => unit.unitNumber)).toEqual([q.topics?.[0].topic.topicNumber]);
    }
  }
  for (const n of [1, 6]) {
    expect(existsSync('public' + resolveQuestionDiagram(paper.paperCode, n, paper.questions[n - 1]))).toBe(true);
  }
  const measurement = physicsChapterBank['9'].find(unit => unit.unitNumber === 1)!;
  const kinematics = physicsChapterBank['9'].find(unit => unit.unitNumber === 2)!;
  expect(measurement.crqs.find(item => item.id === 'PHY-IX-2019-P2-q1')).toMatchObject({
    additionalSources: [{ href: '/past-papers/PHY-IX-P2#question-1' }],
  });
  expect(kinematics.erqs.filter(item => item.questionText.includes('900 m'))).toMatchObject([
    { id: 'PHY-IX-2019-P2-q9a', additionalSources: [{ href: '/past-papers/PHY-IX-P2#question-6(a)' }] },
  ]);
  for (const path of [paper.fileUrl, ...physicsIx2019References.map(resource => resource.fileUrl),
    ...physicsIx2019Marking.flatMap(note => [note.example.better, note.example.weaker])]) {
    expect(existsSync('public' + path)).toBe(true);
  }
});
