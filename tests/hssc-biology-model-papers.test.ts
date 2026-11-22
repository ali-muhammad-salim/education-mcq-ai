import { existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import StructuredContent from '@/components/StructuredContent';
import { hsscBiologyChapterMcqs, hsscBiologyChapterTheory } from '@/lib/hsscBiologyChapterQuestions';
import { hsscBiologyModelPapers, hsscBiologyModelQuizPaper } from '@/lib/hsscBiologyModelPapers';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import { hsscBiologyStudyResources } from '@/lib/hsscBiologyStudyResources';
import { paperScoringAnswers } from '@/lib/paperPresentation';
import { gradeAnswer, studentQuestion } from '@/services/assessment/scoring';
import { sourcePracticeQuestion } from '@/services/assessment/service';
import { decryptQuestionReveal } from '@/lib/quiz-crypto';
import { biologyXi2022VerificationReport, biologyXiAnnualArchives } from '@/lib/hsscXiAnnualBiology';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';

test('Class XI Biology study resources link original assets, canonical papers and direct chapter questions', () => {
  const syllabus = hsscBiologySyllabus('akueb', 11, 'biology')!;
  const mcqs = hsscBiologyChapterMcqs('akueb', 11, 'biology', '/biology')!;
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  for (const resource of hsscBiologyStudyResources) {
    expect(existsSync('public' + resource.pdf)).toBe(true);
    const bank = mcqs.papers.find(paper => paper.code === resource.slug)!;
    for (const question of [...resource.mcqs, ...resource.written]) {
      const unitNumber = Number(question.slo.split('.')[0]);
      const unit = syllabus.units.find(unit => unit.unitNumber === unitNumber);
      expect(question.page).toBeGreaterThan(0);
      expect(question.page).toBeLessThanOrEqual(resource.pages);
      for (const [, path] of question.stem.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        expect(existsSync('public' + path)).toBe(true);
      }
      const id = `${resource.slug}-${question.id}`;
      if ('options' in question) {
        expect(question.options).toHaveLength(4);
        for (const option of question.options) {
          for (const [, path] of option.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
            expect(existsSync('public' + path)).toBe(true);
          }
        }
        const entry = bank.questions.find(item => item.id === id);
        if (!question.answers.length) {
          expect(entry).toBeUndefined();
          continue;
        }
        expect(paperScoringAnswers(entry!.sourceRegion, entry!.sourceRegion.choices as Record<string, string>)).toEqual(question.answers);
        expect(mcqs.units.filter(unit => unit.groups.some(group => group.questionIds.includes(id))).map(unit => unit.unitNumber)).toEqual([unitNumber]);
      } else {
        const chapter = theory.find(unit => unit.unitNumber === unitNumber)!;
        expect(chapter[question.extended ? 'erqs' : 'crqs']).toEqual(expect.arrayContaining([expect.objectContaining({ id, currentSlo: question.slo })]));
      }
      expect(unit?.subtopics.some(topic => topic.slos.some(outcome => outcome.code === question.slo))).toBe(true);
    }
    for (const reference of resource.references) {
      const match = /^\/past-papers\/([^#]+)#question-(.*)$/.exec(reference.href);
      if (match) {
        expect(getFallbackPaper(match[1])?.questions.some(question => String(question.questionNumber) === match[2])).toBe(true);
      }
    }
  }
});

test.each([11, 12])('Grade %i model questions are listed in the class that teaches their content', grade => {
  const syllabus = hsscBiologySyllabus('akueb', grade, 'biology')!;
  const mcqs = hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!;
  const theory = hsscBiologyChapterTheory('akueb', grade, 'biology')!;
  const questionIds = mcqs.units.map(unit => unit.groups.filter(group => group.paperCode.includes('-MODEL-')).flatMap(group => group.questionIds));
  expect(questionIds.map(ids => ids.length)).toEqual(syllabus.chapters.map(chapter =>
    chapter.mcqs + (chapter.number === 1 ? -1 : chapter.number === 20 ? 1 : 0)));
  expect(new Set(questionIds.flat()).size).toBe(grade === 11 ? 49 : 51);
  const modelTheory = theory.map(unit => ({
    crqs: unit.crqs.filter(q => q.sourceTitle.includes('Model')),
    erqs: unit.erqs.filter(q => q.sourceTitle.includes('Model')),
    unitNumber: unit.unitNumber,
  }));
  expect(modelTheory.map(unit => unit.crqs.reduce((marks, q) => marks + (q.marks ?? 0), 0)))
    .toEqual(syllabus.chapters.map(chapter => chapter.crqMarks));
  expect(modelTheory.filter(unit => unit.erqs.length).map(unit => unit.unitNumber))
    .toEqual(syllabus.erqPairs.flat().sort((a, b) => a - b));
  expect(modelTheory.flatMap(unit => unit.erqs).map(q => q.sourceHref)).toHaveLength(4);
  for (const paper of hsscBiologyModelPapers('AKU-EB', grade, 'biology')) {
    for (const question of paper.questions) {
      expect(question.figures.every(path => /-(?:diagram-\d+|option-[a-d])\.webp$/.test(path) && existsSync('public' + path))).toBe(true);
    }
  }
});

test.each([11, 12])('Grade %i Biology MCQs show all four printed choices', grade => {
  const [paper] = hsscBiologyModelPapers('akueb', grade, 'biology');
  const [chapterPaper] = hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!.papers;
  expect(paper.questions).toHaveLength(50);
  for (const question of paper.questions) {
    if (!('choices' in question) || !question.stem) throw new Error(`Incomplete MCQ ${question.number}`);
    const expected = ['A', 'B', 'C', 'D'];
    const letters = question.choices.length
      ? Object.keys(chapterPaper.questions.find(item => item.questionNumber === String(question.number))?.sourceRegion.choices ?? {})
      : Array.from(question.stem.matchAll(/^\| ([A-D]) \|/gm), match => match[1]);
    expect(letters, `Grade ${grade} question ${question.number}`).toEqual(expected);
    expect(question.choices.every(choice => choice.trim().length > 0)).toBe(true);
  }
});

test.each([11, 12])('Grade %i chapter-wise MCQs can all be scored in a quiz', grade => {
  const data = hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!;
  const questions = new Map(data.papers.flatMap(paper => paper.questions.map(question => [question.id, question] as const)));
  const indexed = [...new Set(data.units.flatMap(unit => unit.groups.flatMap(group => group.questionIds)))];
  expect(indexed.length).toBeGreaterThan(0);
  for (const id of indexed) {
    const question = questions.get(id);
    expect(question, id).toBeDefined();
    const { sourceRegion } = question!;
    const choices = sourceRegion.choices as Record<string, string>;
    expect(Object.keys(choices ?? {})).toEqual(['A', 'B', 'C', 'D']);
    expect(paperScoringAnswers(sourceRegion, choices), id).not.toHaveLength(0);
  }
});

test('Class XI Biology Q4 renders each chemical structure as its own option', () => {
  const [paper] = hsscBiologyModelPapers('akueb', 11, 'biology');
  const q4 = paper.questions.find(question => question.number === 4);
  if (!q4 || !('choices' in q4)) throw new Error('Expected Q4 to be a multiple-choice question');
  expect(q4.stem).toBe('An example of an acidic amino acid is');
  expect(q4.choices).toHaveLength(4);
  for (const [index, option] of q4.choices.entries()) {
    const letter = 'ABCD'[index];
    const html = renderToStaticMarkup(createElement(StructuredContent, { text: option }));
    expect(html).toContain(`alt="Diagram for question 4, option ${letter}"`);
    expect(html).toContain(`q4-option-${letter.toLowerCase()}.webp`);
  }
});

test.each([
  ['BIO-XI-MODEL-2026-P1', { 7: ['A', 'C'], 9: ['C'], 20: ['C'], 28: ['A', 'D'] }],
  ['BIO-XII-MODEL-2027-P1', { 17: ['C'], 20: ['C'] }],
] as const)('%s can score all 50 questions', (code, restored) => {
  const paper = hsscBiologyModelQuizPaper(code)!;
  expect(paper.durationMinutes).toBe(90);
  expect(paper.questions).toHaveLength(50);
  for (const question of paper.questions) {
    const { sourceRegion } = question;
    expect(Object.keys(sourceRegion.choices)).toEqual(['A', 'B', 'C', 'D']);
    const keys = paperScoringAnswers(sourceRegion, sourceRegion.choices);
    const expected = (restored as Record<string, readonly string[]>)[question.questionNumber];
    if (expected) expect(keys).toEqual(expected);
    else expect(keys).toHaveLength(1);
    const frozen = { id: question.id, orderIndex: Number(question.questionNumber), marks: 1, content: sourcePracticeQuestion(question) };
    for (const selectedOptionId of ['A', 'B', 'C', 'D']) {
      expect(gradeAnswer(frozen, { selectedOptionId })).toBe(keys.includes(selectedOptionId) ? 1 : 0);
    }
    if (keys.length > 1) expect(decryptQuestionReveal(frozen.id, studentQuestion(frozen).encryptedReveal)?.correctLetters).toEqual(keys);
  }
  if (code.startsWith('BIO-XI-')) {
    expect(paper.questions[0].sourceRegion.choices.B).toContain('α-helix');
    expect(paper.questions[0].questionText).not.toContain('| Option |');
    expect(paper.questions[3].sourceRegion.correct_answer).toBe('B');
  }
});

test('Class XI 2025 annual papers preserve the originals, marking examples and board scoring', () => {
  const { papers: biologyXi2025Papers, resources: biologyXi2025Resources, key: biologyXi2025Key, marking: biologyXi2025Marking } = biologyXiAnnualArchives.find(archive => archive.year === 2025)!;
  const [mcq, written] = biologyXi2025Papers;
  expect(biologyXi2025Resources).toHaveLength(4);
  expect(getFallbackPaper(mcq.paperCode)?.questions).toHaveLength(50);
  expect(getAllStandardPapers().find(paper => paper.paperCode === written.paperCode)?._count.questions).toBe(13);
  expect(written.questionCount).toBe(11);
  expect(written.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((sum, q) => sum + q.marks, 0)).toBe(35);
  expect(biologyXi2025Key[47].answer).toEqual(['D', 'A']);
  expect(mcq.questions[0].sourceRegion).toMatchObject({ slo: '1.2.1', current_slo: '25.1.1', mapping_scope: { grade: 12 } });
  expect(mcq.questions[0].sourceRegion.current_mapping?.map(outcome => outcome.code)).toEqual(['25.1.1']);
  expect(mcq.questions[26].sourceRegion.current_mapping?.map(outcome => outcome.code)).toEqual(['7.1.3']);
  expect(mcq.questions[31].sourceRegion).toMatchObject({ mapping_status: 'NO_DIRECT_OUTCOME' });
  expect(mcq.questions[31].sourceRegion.current_slo).toBeUndefined();
  expect(mcq.questions[47].sourceRegion.current_mapping?.map(outcome => outcome.code)).toEqual(['13.2.3']);
  expect(mcq.questions[48].sourceRegion.current_mapping?.map(outcome => outcome.code)).toEqual(['14.3.2']);
  expect(written.questions[8].sourceRegion.current_mapping?.map(outcome => outcome.code)).toEqual(['13.2.6']);
  expect(mcq.questions[1].sourceRegion).toMatchObject({ mapping_status: 'NO_DIRECT_OUTCOME' });
  expect(mcq.questions[1].sourceRegion.chapter_href).toBeUndefined();
  expect(mcq.questions[1].sourceRegion.current_slo).toBeUndefined();
  expect(mcq.questions[38].sourceRegion).toMatchObject({ slo: '12.3.2', current_slo: '9.3.3' });
  for (const question of mcq.questions) {
    const content = sourcePracticeQuestion(question);
    expect(content.options).toHaveLength(4);
    expect(content.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(
      question.questionNumber === '48' ? ['A', 'D'] : [question.sourceRegion.official_answer],
    );
  }
  expect(biologyXi2025Marking).toHaveLength(13);
  for (const note of biologyXi2025Marking) {
    expect(note.hints).toBeTruthy();
    for (const image of [note.images.better, note.images.weaker]) {
      expect(image && existsSync('public' + image), `question ${note.number}`).toBe(true);
    }
  }
  const chapterXi = hsscBiologyChapterMcqs('akueb', 11, 'biology', '/akueb/XI/biology')!;
  const chapterXii = hsscBiologyChapterMcqs('akueb', 12, 'biology', '/akueb/XII/biology')!;
  expect(chapterXi.units.flatMap(unit => unit.groups).filter(group => group.paperCode === mcq.paperCode).flatMap(group => group.questionIds)).toHaveLength(46);
  expect(chapterXii.units.find(unit => unit.unitNumber === 25)?.groups.find(group => group.paperCode === mcq.paperCode)?.questionIds).toEqual(['BIO-XI-2025-P1-q1']);
  expect(chapterXii.units.find(unit => unit.unitNumber === 21)?.groups.find(group => group.paperCode === mcq.paperCode)?.questionIds).toEqual([]);
  expect(chapterXii.units.find(unit => unit.unitNumber === 20)?.groups.find(group => group.paperCode === 'BIO-XI-MODEL-2026-P1')?.questionIds).toContain('biology-XI-3');
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2025)).toHaveLength(9);
  expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2025)).toHaveLength(4);
});

test.each([
  { year: 2024, multi: 9, official: ['C', 'D'], graded: ['C', 'D'], illustrated: true, unmapped: ['1', '2', '15', '26'] },
  { year: 2023, multi: 13, official: ['A'], graded: ['A', 'C'], illustrated: false, unmapped: ['1', '2', '23'] },
])('Class XI $year archive includes the complete papers, official key, marking and chapter links', ({ year, multi, official, graded, illustrated, unmapped }) => {
  const { papers: [mcq, written], resources, key, marking, root } = biologyXiAnnualArchives.find(archive => archive.year === year)!;
  expect(resources).toHaveLength(4);
  for (const suffix of ['paper-i.pdf', 'paper-ii.pdf', 'key.pdf', 'emarking.pdf']) expect(existsSync('public' + root + suffix)).toBe(true);
  expect(getFallbackPaper(mcq.paperCode)?.questions).toHaveLength(50);
  expect(written.questionCount).toBe(11);
  expect(written.questions).toHaveLength(13);
  expect(written.questions.filter(question => !question.questionNumber.endsWith('b')).reduce((sum, question) => sum + question.marks, 0)).toBe(35);
  expect(key[multi - 1].answer).toEqual(official);
  for (const [index, question] of mcq.questions.entries()) {
    const content = sourcePracticeQuestion(question);
    expect(content.options).toHaveLength(4);
    expect(content.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(index === multi - 1 ? graded : key[index].answer);
    for (const option of content.options) {
      const image = /\]\((\/paper-crops\/[^)]+)\)/.exec(option.text)?.[1];
      if (image) expect(existsSync('public' + image)).toBe(true);
    }
    if (index === multi - 1) {
      expect(content.options.every(option => option.text.startsWith('!['))).toBe(illustrated);
      const frozen = { id: question.id, orderIndex: multi, marks: 1, content };
      for (const selectedOptionId of graded) expect(gradeAnswer(frozen, { selectedOptionId })).toBe(1);
    }
  }
  expect(marking).toHaveLength(13);
  for (const note of marking) {
    expect(note.hints).toBeTruthy();
    expect(note.better).toBeTruthy();
    expect(note.weaker).toBeTruthy();
    for (const image of [note.images.better, note.images.weaker]) expect(image && existsSync('public' + image)).toBe(true);
  }
  const chapterIds = [11, 12].flatMap(grade => hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!.units)
    .flatMap(unit => unit.groups.filter(group => group.paperCode === mcq.paperCode).flatMap(group => group.questionIds));
  expect(chapterIds.toSorted()).toEqual(mcq.questions.filter(question => !unmapped.includes(question.questionNumber)).map(question => question.id).toSorted());
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  expect(theory.flatMap(unit => unit.crqs).filter(question => question.examYear === year)).toHaveLength(9);
  expect(theory.flatMap(unit => unit.erqs).filter(question => question.examYear === year)).toHaveLength(year === 2024 ? 3 : 4);
});

test('Class XI 2022 keeps Theory and Alternate to Practical together in the paper, quiz and chapter bank', () => {
  const { papers, resources, key, root } = biologyXiAnnualArchives.find(archive => archive.year === 2022)!;
  expect(papers).toHaveLength(1);
  expect(resources).toHaveLength(2);
  for (const suffix of ['paper-i.pdf', 'key.pdf']) expect(existsSync('public' + root + suffix)).toBe(true);
  const [paper] = papers;
  expect(paper).toMatchObject({ durationMinutes: 130, totalMarks: 65, questionCount: 65 });
  expect(getFallbackPaper(paper.paperCode)?.questions).toHaveLength(65);
  expect(key.slice(50).map(row => row.answer[0]).join('')).toBe('CDDDACDABCAABBA');
  for (const [index, question] of paper.questions.entries()) {
    const practical = index >= 50;
    expect(question.questionNumber).toBe(String(index + 1));
    expect(question.sourceRegion.assessmentSection).toBe(practical ? 'Alternate to Practical' : 'Theory');
    expect(question.sourceRegion.original_reference_source).toBe(practical ? biologyXi2022VerificationReport : root + 'key.pdf');
    const content = sourcePracticeQuestion(question);
    expect(content.options).toHaveLength(4);
    const [selectedOptionId] = key[index].answer;
    expect(gradeAnswer({ id: question.id, orderIndex: index + 1, marks: 1, content }, { selectedOptionId })).toBe(1);
  }
  for (const number of [54, 55, 61, 62]) expect(paper.questions[number - 1].questionText).toContain('|');
  const chapterIds = [11, 12].flatMap(grade => hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!.units)
    .flatMap(unit => unit.groups.filter(group => group.paperCode === paper.paperCode).flatMap(group => group.questionIds));
  expect(chapterIds.toSorted()).toEqual(paper.questions.filter(question => question.questionNumber !== '4').map(question => question.id).toSorted());
});

test('Class XI 2021 scores all 65 questions and preserves board and practice credit', () => {
  const { papers: [paper], resources, key } = biologyXiAnnualArchives.find(archive => archive.year === 2021)!;
  expect(resources).toHaveLength(2);
  expect(paper).toMatchObject({ durationMinutes: 130, totalMarks: 65, questionCount: 65 });
  expect(getFallbackPaper(paper.paperCode)?.questions).toHaveLength(65);
  expect(key[0].answer).toEqual(['B']);
  expect(key[46].answer).toEqual(['A']);
  expect(key[63]).toMatchObject({ number: '64', answer: ['C'], universal: true });
  for (const [index, question] of paper.questions.entries()) {
    expect(question.questionNumber).toBe(String(index + 1));
    expect(question.sourceRegion.assessmentSection).toBe(index < 50 ? 'Theory' : 'Alternate to Practical');
    const content = sourcePracticeQuestion(question);
    const frozen = { id: question.id, orderIndex: index + 1, marks: 1, content };
    expect(content.options).toHaveLength(4);
    const accepted = index === 63 ? ['A', 'B', 'C', 'D'] : index === 0 || index === 46 ? ['A', 'B'] : key[index].answer;
    for (const { id: selectedOptionId } of content.options) {
      expect(gradeAnswer(frozen, { selectedOptionId })).toBe(selectedOptionId && accepted.includes(selectedOptionId) ? 1 : 0);
    }
    for (const match of question.questionText.matchAll(/\]\((\/paper-crops\/[^)]+)\)/g)) expect(existsSync('public' + match[1])).toBe(true);
  }
  expect(paper.questions[63].questionText).toContain('questions-64-65.png');
  expect(paper.questions[64].questionText).toContain('questions-64-65.png');
  const chapterIds = hsscBiologyChapterMcqs('akueb', 11, 'biology', '/biology')!.units
    .flatMap(unit => unit.groups.filter(group => group.paperCode === paper.paperCode).flatMap(group => group.questionIds));
  expect(chapterIds.toSorted()).toEqual(paper.questions.filter(question => question.questionNumber !== '18').map(question => question.id).toSorted());
  expect(paper.questions[63].sourceRegion).toMatchObject({
    chapter_mapping_verified: true, chapter_href: '/akueb/XI/biology/syllabus#practical-25',
  });
});

test('Class XI 2019 preserves the source papers, key, marking examples and direct chapter matches', () => {
  const { papers: [mcq, written], resources, key, marking, root } = biologyXiAnnualArchives.find(archive => archive.year === 2019)!;
  expect(resources).toHaveLength(4);
  for (const suffix of ['paper-i.pdf', 'paper-ii.pdf', 'key.pdf', 'emarking.pdf']) expect(existsSync('public' + root + suffix)).toBe(true);
  expect(getFallbackPaper(mcq.paperCode)).toMatchObject({ questionCount: 35, durationMinutes: 50, totalMarks: 35 });
  expect(getFallbackPaper(written.paperCode)).toMatchObject({ questionCount: 11, durationMinutes: 130, totalMarks: 50 });
  expect(written.questions).toHaveLength(13);
  expect(written.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((sum, q) => sum + q.marks, 0)).toBe(50);
  expect(key.map(row => row.answer[0]).join('')).toBe('BBACDDBBAADBAABBBCDDBAAABBCCDCACABC');
  for (const [index, question] of mcq.questions.entries()) {
    const item = sourcePracticeQuestion(question);
    expect(item.options).toHaveLength(4);
    expect(item.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(key[index].answer);
  }
  expect(mcq.questions[6].sourceRegion.choices?.B).toContain('question-7-option-b.png');
  expect(mcq.questions[32].questionText).toContain('| I: K⁺ ions |');
  expect(marking).toHaveLength(13);
  for (const note of marking) {
    expect(note.originalSlo).toBeUndefined();
    expect(note.better && note.weaker).toBeTruthy();
    for (const image of [note.images.better, note.images.weaker]) expect(image && existsSync('public' + image)).toBe(true);
  }
  const chapters = hsscBiologyChapterMcqs('akueb', 11, 'biology', '/biology')!.units;
  const groups = chapters.flatMap(unit => unit.groups.filter(group => group.paperCode === mcq.paperCode));
  const mapped = mcq.questions.filter(q => !['1', '2', '8', '19', '34'].includes(q.questionNumber));
  expect(groups.flatMap(group => group.questionIds).toSorted()).toEqual(mapped.map(q => q.id).toSorted());
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2019)).toHaveLength(8);
  expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2019)).toHaveLength(4);
});

test('Class XI 2018 keeps the original scoring, the continued written question and direct syllabus links', () => {
  const { papers: [mcq, written], resources, key, marking, root } = biologyXiAnnualArchives.find(archive => archive.year === 2018)!;
  expect(resources).toHaveLength(4);
  for (const suffix of ['paper-i.pdf', 'paper-ii.pdf', 'key.pdf', 'emarking.pdf']) expect(existsSync('public' + root + suffix)).toBe(true);
  expect(getFallbackPaper(mcq.paperCode)).toMatchObject({ questionCount: 30, durationMinutes: 40, totalMarks: 30 });
  expect(getFallbackPaper(written.paperCode)).toMatchObject({ questionCount: 11, durationMinutes: 140, totalMarks: 55 });
  expect(written.questions).toHaveLength(13);
  expect(written.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((sum, q) => sum + q.marks, 0)).toBe(55);
  expect(written.questions[8].questionText).toContain('question-9b.png');
  expect(written.questions[8].questionText).toContain('recurrent infection');
  expect(key.map(row => row.answer[0]).join('')).toBe('CBBDBCDCDCCABDDCADCACCCBBCBDBA');
  for (const [index, question] of mcq.questions.entries()) {
    const item = sourcePracticeQuestion(question);
    expect(item.options).toHaveLength(4);
    expect(item.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(index === 17 ? ['B', 'D'] : key[index].answer);
  }
  expect(marking).toHaveLength(13);
  for (const note of marking) {
    expect(note.better && note.weaker).toBeTruthy();
    for (const image of [note.images.better, note.images.weaker]) expect(image && existsSync('public' + image)).toBe(true);
  }
  const byGrade = [11, 12].map(grade => hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!.units
    .flatMap(unit => unit.groups.filter(group => group.paperCode === mcq.paperCode).flatMap(group => group.questionIds)));
  expect(byGrade[1]).toEqual(['BIO-XI-2018-P1-q5']);
  expect(byGrade.flat().toSorted()).toEqual(mcq.questions.filter(q => !['1', '29'].includes(q.questionNumber)).map(q => q.id).toSorted());
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2018)).toHaveLength(5);
  expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2018)).toHaveLength(4);
});

test('Class XI 2017 keeps the board scoring, written tables and direct syllabus matches', () => {
  const { papers: [mcq, written], resources, key, marking, root } = biologyXiAnnualArchives.find(archive => archive.year === 2017)!;
  expect(resources).toHaveLength(4);
  for (const suffix of ['paper-i.pdf', 'paper-ii.pdf', 'key.pdf', 'emarking.pdf']) expect(existsSync('public' + root + suffix)).toBe(true);
  expect(getFallbackPaper(mcq.paperCode)).toMatchObject({ questionCount: 30, durationMinutes: 40, totalMarks: 30 });
  expect(getFallbackPaper(written.paperCode)).toMatchObject({ questionCount: 11, durationMinutes: 140, totalMarks: 55 });
  expect(written.questions).toHaveLength(13);
  expect(written.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((sum, q) => sum + q.marks, 0)).toBe(55);
  expect(written.questions[8].questionText).toContain('| Description of phenomenon | Name of phenomenon |');
  expect(key.map(row => row.answer[0]).join('')).toBe('BBABCBCBAADAADABCAABAABAAACCAA');
  for (const [index, question] of mcq.questions.entries()) {
    const item = sourcePracticeQuestion(question);
    expect(new Set(item.options.map(option => option.text)).size).toBe(4);
    expect(item.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(key[index].answer);
  }
  expect(mcq.questions[8].sourceRegion.choices?.A).toBe('<u>Chaetodon</u> <u>ocellata</u>.');
  expect(renderToStaticMarkup(createElement(StructuredContent, { text: mcq.questions[8].sourceRegion.choices!.A })))
    .toContain('<u>Chaetodon</u> <u>ocellata</u>.');
  expect(marking).toHaveLength(13);
  for (const note of marking) {
    expect(note.better && note.weaker).toBeTruthy();
    for (const image of [note.images.better, note.images.weaker]) expect(image && existsSync('public' + image)).toBe(true);
  }
  const byGrade = [11, 12].map(grade => hsscBiologyChapterMcqs('akueb', grade, 'biology', '/biology')!.units
    .flatMap(unit => unit.groups.filter(group => group.paperCode === mcq.paperCode).flatMap(group => group.questionIds)));
  expect(byGrade[1]).toEqual(['BIO-XI-2017-P1-q2']);
  expect(byGrade.flat().toSorted()).toEqual(mcq.questions.filter(q => !['1', '21'].includes(q.questionNumber)).map(q => q.id).toSorted());
  const theory = hsscBiologyChapterTheory('akueb', 11, 'biology')!;
  expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2017)).toHaveLength(3);
  expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2017)).toHaveLength(4);
});

test('mixed digital questions render selectable text, figures and a real table', () => {
  const [paper] = hsscBiologyModelPapers('akueb', 11, 'biology');
  const question = paper.questions[0];
  if (!('stem' in question) || typeof question.stem !== 'string') throw new Error('Expected an MCQ');
  const html = renderToStaticMarkup(createElement(StructuredContent, { text: question.stem }));
  expect(html).toContain('The given diagram shows the structure of a protein.');
  expect(html).toContain('q1-diagram-1.webp');
  expect(html).toContain('<table');
  expect(html).toContain('Type of secondary structure');
});
