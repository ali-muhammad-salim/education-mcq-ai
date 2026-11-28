import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { sscComputerScienceMapping, sscComputerScienceOutcomes } from '@/lib/sscComputerScienceSyllabus';
import { sscComputerScienceTheory } from '@/lib/sscComputerScienceTheory';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { paperAnswer, paperQuestionNumber } from '@/lib/paperPresentation';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';
import { guestQuestionsFrom, quizQuestionDiagram } from '@/lib/guest-attempts';
import { studentQuestion } from '@/services/assessment/scoring';
import { groupDuplicateQuestions } from '@/lib/uniqueQuestions';

describe('Computer Science IX source materials', () => {
  it('lists papers that have digital questions and original documents', () => {
    const papers = getAllStandardPapers().filter(p => p.paperCode.startsWith('CS-IX-'));
    expect(papers.length).toBe(16);
    for (const item of papers) {
      expect(item.fileUrl).toMatch(/^\/materials\/ssc\/computer-science\//);
      expect(getFallbackPaper(item.paperCode)?.questions.length).toBeGreaterThan(0);
    }
  });

  it('publishes reviewed Class IX Paper II items in their current chapters and printed sections', () => {
    const units = sscComputerScienceTheory(9);
    const references = getAllStandardPapers().filter(p => /^CS-IX-(?:\d{4}-)?P2$/.test(p.paperCode));
    expect(references).toHaveLength(8);
    let audited = 0;
    for (const reference of references) {
      const paper = getFallbackPaper(reference.paperCode)!;
      const marks = new Map(paper.questions.map(q => [paperQuestionNumber(q.questionNumber).replace(/[ab]$/, ''), q.marks]));
      expect([...marks.values()].reduce((sum, mark) => sum + mark, 0)).toBe(paper.examYear <= 2019 ? 40 : 25);
      for (const question of paper.questions) {
        audited++;
        const number = paperQuestionNumber(question.questionNumber);
        const extended = Number.parseInt(number, 10) > marks.size - 2;
        expect(question.questionType).toBe(extended ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE');
        expect(question.sourceRegion.model_answer_origin).toBe('RiseLearner worked solution');
        const source = '/past-papers/' + paper.paperCode + '#question-' + number;
        for (const unit of units) {
          const matches = question.sourceRegion.current_mapping?.some(entry => sscComputerScienceOutcomes.get(entry.code)?.unitNumber === unit.unitNumber);
          const selected = unit[extended ? 'erqs' : 'crqs'].filter(item => item.sourceHref === source);
          expect(selected).toHaveLength(matches ? 1 : 0);
          expect(unit[extended ? 'crqs' : 'erqs'].some(item => item.sourceHref === source)).toBe(false);
          if (matches) {
            expect(selected[0].questionText).toBe(question.questionText);
            expect(selected[0].modelAnswer).toBe(question.sourceRegion.model_answer);
          }
        }
      }
    }
    expect(audited).toBe(55);
    const chapterTwo = units.find(unit => unit.unitNumber === 2)!;
    expect(chapterTwo.crqs).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceHref: '/past-papers/CS-IX-P2#question-1', currentSlo: '2.3.3' }),
      expect.objectContaining({ sourceHref: '/past-papers/CS-IX-2026-P2#question-1', currentSlo: '2.2.2' }),
    ]));
    expect(existsSync(resolve('public', 'paper-crops/CS-IX-2026-P2/q4.png'))).toBe(true);
  });

  it('preserves all referenced Class IX Paper II figures and both images of 2019 question 4', () => {
    const references = getAllStandardPapers().filter(p => /^CS-IX-(?:\d{4}-)?P2$/.test(p.paperCode));
    const images = references.flatMap(paper => getFallbackPaper(paper.paperCode)!.questions.flatMap(question =>
      [...question.questionText.matchAll(/!\[[^\]]+\]\((\/paper-crops\/[^)]+)\)/g)].map(match => match[1])));
    expect(new Set(images).size).toBe(12);
    for (const image of images) expect(existsSync(resolve('public', image.slice(1)))).toBe(true);
    const q4 = getFallbackPaper('CS-IX-2019-P2')!.questions[3];
    expect(q4.questionText).toMatch(/q4a\.png[\s\S]+q4c\.png/);
    expect(getFallbackPaper('CS-IX-2017-P2')!.questions[0].sourceRegion.model_answer).not.toContain('Assembler');
    expect(getFallbackPaper('CS-IX-2019-P2')!.questions[5].sourceRegion.model_answer).not.toContain('either order');
  });

  it('preserves exceptional board-key answers without a false single key', () => {
    const q2023 = getFallbackPaper('CS-IX-2023-P1')!.questions.find(q => q.questionNumber === '11')!;
    const q2024 = getFallbackPaper('CS-IX-2024-P1')!.questions.find(q => q.questionNumber === '9')!;
    expect(q2023.sourceRegion.official_answer).toBe('*');
    expect(q2023.sourceRegion.correct_answer).toBe('');
    expect(q2024.sourceRegion.official_answer).toBe('D,A');
  });

  it('validates current mappings for all Grade IX and X model and past theory papers', () => {
    const papers = getAllStandardPapers().filter(p => /^CS-(IX|X)-/.test(p.paperCode));
    expect(papers).toHaveLength(32);
    const questions = papers.flatMap(p => getFallbackPaper(p.paperCode)!.questions);
    expect(questions).toHaveLength(712);
    for (const question of questions) {
      const meta = question.sourceRegion;
      const outcomes = meta.current_mapping!;
      expect(meta.current_syllabus_reviewed).toBe(true);
      expect(meta.current_slo).toBe(outcomes[0]?.code ?? null);
      expect(meta.out_of_syllabus).toBe(!outcomes.length);
      for (const outcome of outcomes) expect(outcome).toEqual(sscComputerScienceOutcomes.get(outcome.code));
      if (outcomes.length) {
        expect(meta.mapping_scope?.grade).toBe(outcomes[0].grade);
        expect(questionSyllabus(meta, question.slos, outcomes[0].grade!, 'Computer Science', 'AKU-EB', true).href)
          .toBe(`/akueb/${outcomes[0].grade === 9 ? 'IX' : 'X'}/computer-science/syllabus#slo-${outcomes[0].code}`);
      }
    }
  });

  it('moves detailed OS outcomes to Grade X and leaves retired topics outside the current chapters', () => {
    const quizQuestion = (paperCode: string, number: string) => getFallbackPaper(paperCode)!.questions.find(q => q.questionNumber === number)!.sourceRegion;
    expect(quizQuestion('CS-IX-2025-P1', '15')).toMatchObject({ current_slo: '8.4.2', mapping_scope: { grade: 10 } });
    expect(quizQuestion('CS-IX-2025-P1', '3')).toMatchObject({ current_slo: null, out_of_syllabus: true });
    expect(quizQuestion('CS-X-2025-P1', '34')).toMatchObject({ current_slo: null, out_of_syllabus: true });
    expect(quizQuestion('CS-X-2025-P1', '26').mapping_reason).toContain('JavaScript');
    expect(sscComputerScienceMapping('CS-IX-2025-P2', 'Q.6b', null)?.current_slo).toBe('1.9.4');
    const unitEight = sscComputerScienceTheory(10).find(unit => unit.unitNumber === 8)!;
    expect(unitEight.crqs).toEqual(expect.arrayContaining([expect.objectContaining({
      sourceHref: '/past-papers/CS-IX-2025-P2#question-1', currentSlo: '8.5.3',
    })]));
  });

  it('retains printed exceptions in both grades and excludes them from single-answer scoring', () => {
    for (const [code, number, printed, alternatives] of [
      ['CS-X-2019-P1', '21', 'A,C', ['A', 'C']],
      ['CS-X-2023-P1', '37', 'D,B', ['D', 'B']],
      ['CS-X-2024-P1', '8', 'C,D', ['C', 'D']],
      ['CS-X-2024-P1', '26', 'D', ['C']],
      ['CS-X-2024-P1', '31', 'A', ['A', 'C']],
      ['CS-IX-2024-P1', '39', '•', undefined],
      ['CS-X-P1', '14', undefined, undefined],
    ] as const) {
      const { questions } = getFallbackPaper(code)!;
      const question = questions.find(q => q.questionNumber === number)!;
      const meta = question.sourceRegion;
      expect(meta.official_answer).toBe(printed);
      expect(meta.accepted_options).toEqual(alternatives);
      expect(paperAnswer(meta, meta.choices!)).toBeUndefined();
      expect(gradablePracticeQuestions(code, questions)).not.toContain(question);
    }
  });

  it('validates every scorable Computer Science IX and X MCQ against the quiz format', () => {
    const papers = getAllStandardPapers().filter(paper => /^CS-(IX|X)(-\d{4})?-P1$/.test(paper.paperCode));
    const sources = papers.map(paper => getFallbackPaper(paper.paperCode)!);
    expect(sources).toHaveLength(16);
    expect(sources.flatMap(paper => paper.questions)).toHaveLength(600);
    for (const paper of sources) {
      for (const question of gradablePracticeQuestions(paper.paperCode, paper.questions)) {
        const content = sourcePracticeQuestion(question);
        expect(content.options).toHaveLength(4);
        expect(content.options.filter(option => option.isCorrect)).toHaveLength(1);
      }
    }
  });

  it('publishes all 40 questions from 2026 Paper I and keeps ambiguous items out of quizzes', () => {
    const paper = getFallbackPaper('CS-IX-2026-P1')!;
    const gradable = gradablePracticeQuestions(paper.paperCode, paper.questions);
    expect(paper.durationMinutes).toBe(70);
    expect(paper.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 40 }, (_, index) => index + 1));
    expect(paper.questions.filter(q => !gradable.includes(q)).map(q => q.questionNumber)).toEqual(['17', '20', '29']);
    expect(gradable.filter(q => q.sourceRegion.current_slo?.startsWith('2.')).map(q => q.questionNumber)).toEqual(['8', '9', '10', '11', '12', '13']);
    expect(paper.questions.every(q => q.sourceRegion.answer_origin === 'PROJECT_SOLVED' && !q.sourceRegion.official_answer)).toBe(true);
    for (const question of paper.questions.filter(q => q.diagramBased)) {
      expect(existsSync(resolve('public', question.sourceRegion.diagramUrl!.slice(1)))).toBe(true);
    }
  });

  it('keeps each Chapter 2 quiz diagram attached to its source question', () => {
    const annual = getFallbackPaper('CS-IX-2026-P1')!.questions;
    const model = getFallbackPaper('CS-IX-P1')!.questions;
    const quizCode = 'CS-IX-UNIT-2-ALL-ALL';
    const sources = [
      ...gradablePracticeQuestions('CS-IX-2026-P1', annual),
      ...gradablePracticeQuestions('CS-IX-P1', model),
    ].filter(q => q.sourceRegion.current_mapping?.some(outcome => outcome.code.startsWith('2.')));
    const guest = guestQuestionsFrom(quizCode, sources);
    expect(guest.find(q => q.stemText.includes('identifies a negative number'))?.orderIndex).toBe(12);
    expect(guest.map(quizQuestionDiagram)).toEqual(sources.map(q => q.sourceRegion.diagramUrl));
    expect(guest.map(quizQuestionDiagram).filter(Boolean)).toContain('/paper-crops/CS-IX-P1/q12.png');
    expect(guest.map(quizQuestionDiagram).filter(Boolean)).toContain('/paper-crops/CS-IX-P1/q13.png');
    for (const [index, source] of sources.entries()) {
      const frozen = { id: source.id, orderIndex: index + 1, marks: source.marks, content: sourcePracticeQuestion(source) };
      expect(quizQuestionDiagram(studentQuestion(frozen))).toEqual(source.sourceRegion.diagramUrl);
    }
  });

  it('groups repeated Chapter 2 questions across papers and excludes the disputed answer from scoring', () => {
    const sources = getAllStandardPapers()
      .filter(p => /^CS-(IX|X)-(?:\d{4}-)?P1$/.test(p.paperCode))
      .flatMap(({ paperCode }) => getFallbackPaper(paperCode)!.questions
        .filter(q => q.sourceRegion.current_mapping?.some(outcome => outcome.grade === 9 && outcome.code.startsWith('2.')))
        .map(question => ({ paperCode, question })));
    const study = groupDuplicateQuestions(sources, row => row.question);
    const reference = ({ paperCode, question }: typeof sources[number]) => paperCode + '/' + question.questionNumber;
    expect(study.filter(group => group.length > 1).map(group => group.map(reference))).toEqual([
      ['CS-IX-P1/8', 'CS-X-2022-P1/5'],
      ['CS-IX-P1/9', 'CS-X-2023-P1/1'],
      ['CS-IX-P1/10', 'CS-X-2025-P1/2'],
      ['CS-X-2024-P1/2', 'CS-X-2022-P1/6'],
    ]);
    const scored = sources.filter(({ paperCode, question }) => gradablePracticeQuestions(paperCode, [question]).length);
    expect(study).toHaveLength(28);
    expect(groupDuplicateQuestions(scored, row => row.question)).toHaveLength(27);
    expect(study.find(group => reference(group[0]) === 'CS-IX-P1/8')?.every(
      ({ question }) => question.sourceRegion.single_answer_review_required && question.sourceRegion.answer_review_note?.includes('credits A'),
    )).toBe(true);
  });

  it('publishes 2026 Class X papers and places written questions with transferable current outcomes', () => {
    const mcqs = getFallbackPaper('CS-X-2026-P1')!;
    const theory = getFallbackPaper('CS-X-2026-P2')!;
    expect(mcqs.questions).toHaveLength(40);
    expect(gradablePracticeQuestions(mcqs.paperCode, mcqs.questions)).toHaveLength(36);
    expect(mcqs.questions.filter(q => !q.sourceRegion.current_slo).map(q => q.questionNumber))
      .toEqual(['8', '9', '11', '16', '19', '20', '33', '34']);
    expect(theory.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5a', '5b', '6a', '6b']);
    for (const [grade, expected] of [[9, ['1', '6a', '6b']], [10, ['2', '3', '5b']]] as const) {
      const items = sscComputerScienceTheory(grade).flatMap(unit => [...unit.crqs, ...unit.erqs])
        .filter(q => q.sourceHref.startsWith('/past-papers/CS-X-2026-P2#question-'));
      expect(items.map(q => q.questionNumber)).toEqual(expected);
      expect(items.every(q => q.modelAnswer)).toBe(true);
    }
    for (const paper of [mcqs, theory]) {
      expect(existsSync(resolve('public', paper.fileUrl!.slice(1)))).toBe(true);
      for (const q of paper.questions.filter(q => q.diagramBased)) {
        expect(existsSync(resolve('public', q.sourceRegion.diagramUrl!.slice(1)))).toBe(true);
      }
    }
  });

});
