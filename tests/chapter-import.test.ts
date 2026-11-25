import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFallbackPaper } from '@/lib/paperDataService';
import { groupDuplicateQuestions } from '@/lib/uniqueQuestions';
const mocks = vi.hoisted(() => ({ topics: vi.fn(), topic: vi.fn(), questions: vi.fn(), document: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { topic: { findMany: mocks.topics, findFirst: mocks.topic }, pastPaperQuestion: { findMany: mocks.questions }, knowledgeDocument: { findFirst: mocks.document } } }));
import { chapterPaperIsPublished, mappedChapterGroups, mappedChapterQuestions, mappedTheoryUnits, sourceChoiceContent } from '@/services/materials/practice';

const paper = { id: 'MTH-IX-2025-P1', paperCode: 'MTH-IX-2025-P1', title: 'Mathematics IX Annual 2025', examYear: 2025, sourceDocumentId: null, sourceDocument: null, sourceHash: 'a'.repeat(64), verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES' };
const topic = { id: 'factorisation', name: 'Factorisation', topicNumber: '5', subtopics: [], syllabusVersion: { id: 'current-ix', sourceDocumentId: null, subject: { name: 'Mathematics', academicClass: { level: 9 } } } };
const row = (number: string, component = 'P1') => {
  const q = getFallbackPaper(`MTH-IX-2025-${component}`)!.questions.find(q => q.questionNumber === number)!;
  return { ...q, sourceRegion: structuredClone(q.sourceRegion), pastPaperId: paper.id, pastPaper: paper, syllabusVersionId: 'current-ix' };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.topics.mockResolvedValue([topic]);
  mocks.topic.mockResolvedValue(topic);
  mocks.questions.mockResolvedValue([]);
  mocks.document.mockResolvedValue(null);
});

describe('Automatic reviewed imports in chapter materials', () => {
  it('accepts reviewed imports but rejects raw or detached publications', () => {
    expect(chapterPaperIsPublished(paper)).toBe(true);
    expect(chapterPaperIsPublished({ ...paper, verificationStatus: 'PENDING' })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceHash: null })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceDocumentId: 'withdrawn', sourceDocument: null })).toBe(false);
    expect(chapterPaperIsPublished({ ...paper, sourceDocumentId: 'published', sourceDocument: { catalogMetadata: { compiledPaperId: paper.id } } })).toBe(true);
  });

  it('reads newly imported mapped questions without copying a chapter file', async () => {
    mocks.questions.mockResolvedValueOnce([row('18')]).mockResolvedValueOnce([row('18'), row('19')]);
    const before = await mappedChapterGroups('AKU-EB', 9, 'Mathematics');
    const after = await mappedChapterGroups('AKU-EB', 9, 'Mathematics');
    expect(before[0].questions).toHaveLength(1);
    expect(after[0].questions).toHaveLength(2);
    expect(after[0].questions[0].correctOption).toBe('D');
    expect(after[0].questions[0].rawQuestionNumber).toBe('18');
    expect(after[0].questions[0].sourceRegion.official_answer).toBe('C');
  });

  it('uses the current target grade while retaining the historical paper reference', async () => {
    const moved = row('33');
    mocks.questions.mockResolvedValue([moved]);
    expect((await mappedChapterQuestions(topic.id)).questions).toHaveLength(0);
    mocks.topic.mockResolvedValue({ ...topic, id: 'matrices', name: 'Matrices and Determinants', syllabusVersion: { ...topic.syllabusVersion, subject: { name: 'Mathematics', academicClass: { level: 10 } } } });
    const result = await mappedChapterQuestions('matrices');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].sourceRegion.out_of_syllabus).toBe(false);
    expect(result.questions[0].pastPaperId).toBe('MTH-IX-2025-P1');
    expect(moved.sourceRegion.out_of_syllabus).toBe(true);
  });

  it('carries theory solutions, diagrams, choice rules and source corrections into chapter pages', async () => {
    const q = row('8b', 'P2');
    mocks.questions.mockResolvedValue([q]);
    const units = await mappedTheoryUnits('AKU-EB', 9, 'Mathematics');
    const entry = units[0].crqs[0];
    expect(entry.modelAnswer).toContain('4.5');
    expect(entry.sourceNote).toContain('5.4');
    expect(entry.choiceInstruction).toContain('any two');
    expect(entry.diagramUrl).toContain('q8b.png');
    expect(entry.sourceHref).toContain('#question-8b');
  });

  it('uses the reviewed Chemistry model in chapter lists and accepts either valid answer', async () => {
    const stoichiometry = {
      ...topic, name: 'Stoichiometry', topicNumber: '2',
      syllabusVersion: {
        ...topic.syllabusVersion,
        fileUrl: '/materials/ssc/chemistry/ssc-1/chemistry-ssc-full-syllabus-2025.pdf',
        subject: { name: 'Chemistry', academicClass: { level: 9 } },
      },
    };
    mocks.topics.mockResolvedValue([stoichiometry]);
    mocks.topic.mockResolvedValue(stoichiometry);
    const result = await mappedChapterQuestions(topic.id);
    const modelQuestions = result.questions.filter(q => q.pastPaper.paperCode === 'CHM-IX-P1');
    expect(modelQuestions.map(q => q.questionNumber)).toEqual(['6', '7', '8', '9', '10']);
    const content = sourceChoiceContent(modelQuestions[3]);
    expect(content.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(['B', 'D']);
    expect(content.acceptAnyCorrectOption).toBe(true);
    const written = await mappedTheoryUnits('AKU-EB', 9, 'Chemistry');
    expect(written[0].erqs[0].sourceHref).toContain('/past-papers/CHM-IX-P2');
  });

  it.each([[9, 'IX'], [10, 'X']] as const)('lists every Class %i Chemistry model question in its chapter', async (grade, roman) => {
    const chemistryTopics = Array.from({ length: 8 }, (_, index) => {
      const unit = (grade === 9 ? 1 : 9) + index;
      return {
        ...topic, id: String(unit), topicNumber: String(unit),
        syllabusVersion: {
          ...topic.syllabusVersion,
          fileUrl: `/materials/ssc/chemistry/ssc-${grade - 8}/chemistry-ssc-full-syllabus-2025.pdf`,
          subject: { name: 'Chemistry', academicClass: { level: grade } },
        },
      };
    });
    mocks.topics.mockResolvedValue(chemistryTopics);
    mocks.topic.mockImplementation(async ({ where }) => chemistryTopics.find(chapter => chapter.id === where.id));

    const listed = (await mappedChapterGroups('AKU-EB', grade, 'Chemistry')).flatMap(group => group.questions);
    const paper = getFallbackPaper(`CHM-${roman}-P1`)!;
    expect(listed.filter(q => q.paperCode === paper.paperCode).map(q => [q.id, q.unitNumber]).sort()).toEqual(
      paper.questions.map(q => [q.id, q.topics?.[0]?.topic.topicNumber]).sort(),
    );
    const written = (await mappedTheoryUnits('AKU-EB', grade, 'Chemistry')).flatMap(unit => [...unit.crqs, ...unit.erqs]);
    const combined2021 = getFallbackPaper('CHM-X-2021-P1')!;
    expect(combined2021.questions).toHaveLength(50);
    expect(combined2021.questions.filter(q => q.sourceRegion.assessmentSection === 'Alternate to Practical')).toHaveLength(10);
    expect(combined2021.questions.every(q => q.sourceRegion.option_feedback?.length === 4 && q.sourceRegion.official_answer)).toBe(true);
    expect(combined2021.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME').map(q => q.questionNumber)).toEqual(['10', '18', '35']);
    const listed2021 = listed.filter(q => q.paperCode === combined2021.paperCode);
    expect(listed2021.map(q => q.id).sort()).toEqual(
      combined2021.questions.filter(q => q.sourceRegion.mapping_scope?.grade === grade).map(q => q.id).sort(),
    );
    if (grade === 9) expect(listed2021.map(q => [q.rawQuestionNumber, q.sourceGrade, q.unitNumber])).toEqual([['26', 10, 6], ['42', 10, 7]]);
    if (grade === 10) expect(listed2021).toHaveLength(45);
    expect(sourceChoiceContent(combined2021.questions[9]).options.every(option => option.text.includes('q10-') && option.feedback)).toBe(true);
    const arrhenius = sourceChoiceContent(combined2021.questions[4]);
    expect(arrhenius.acceptAnyCorrectOption).toBe(true);
    expect(arrhenius.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(['B', 'C', 'D']);
    const combined2022 = getFallbackPaper('CHM-X-2022-P1')!;
    expect(combined2022.questions).toHaveLength(50);
    expect(combined2022.questions.filter(q => q.sourceRegion.assessmentSection === 'Alternate to Practical')).toHaveLength(10);
    expect(combined2022.questions.every(q => q.sourceRegion.option_feedback?.length === 4 && q.sourceRegion.official_answer)).toBe(true);
    const listed2022 = listed.filter(q => q.paperCode === combined2022.paperCode);
    expect(listed2022.map(q => q.id).sort()).toEqual(
      combined2022.questions.filter(q => q.sourceRegion.mapping_scope?.grade === grade).map(q => q.id).sort(),
    );
    if (grade === 9) expect(listed2022.map(q => [q.rawQuestionNumber, q.sourceGrade, q.unitNumber])).toEqual([['50', 10, 2]]);
    if (grade === 10) {
      expect(listed2022).toHaveLength(49);
      const structures = sourceChoiceContent(combined2022.questions[45]);
      expect(structures.options.every(option => option.text.includes('q46-') && option.feedback)).toBe(true);
      for (const [number, letters] of [[1, 'BC'], [3, 'AD'], [49, 'BD']] as const) {
        const content = sourceChoiceContent(combined2022.questions[number - 1]);
        expect(content.acceptAnyCorrectOption).toBe(true);
        expect(content.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(letters.split(''));
      }
    }
    const model = getFallbackPaper(`CHM-${roman}-P2`)!;
    expect(written.filter(q => q.sourceHref.startsWith('/past-papers/' + model.paperCode + '#')).map(q => q.id).sort()).toEqual(model.questions.map(q => q.id).sort());
    if (grade === 9) {
      expect(listed.find(q => q.rawQuestionNumber === '24')?.correctOption).toBeUndefined();
      expect((await mappedChapterQuestions('4')).questions.some(q => q.questionNumber === '24')).toBe(false);
    }
    if (grade === 10) {
      const paper2017 = getFallbackPaper('CHM-X-2017-P1')!;
      const written2017 = getFallbackPaper('CHM-X-2017-P2')!;
      expect([paper2017.totalMarks, paper2017.durationMinutes]).toEqual([25, 35]);
      expect([written2017.totalMarks, written2017.durationMinutes]).toEqual([40, 145]);
      expect(paper2017.questions.map(q => q.sourceRegion.official_answer).join('')).toBe('CABDACBBCCBADDBAACDACBCAA');
      for (const question of paper2017.questions) {
        const { options } = sourceChoiceContent(question);
        expect(options).toHaveLength(4);
        expect(options.every(option => option.feedback)).toBe(true);
        expect(options.filter(option => option.isCorrect).map(option => option.id)).toEqual([question.sourceRegion.official_answer]);
      }
      for (const number of [3, 11]) {
        expect(sourceChoiceContent(paper2017.questions[number - 1]).options.every(option => option.text.includes('/CHM-X-2017-P1/q' + number + '-'))).toBe(true);
      }
      expect(listed.filter(q => q.paperCode === paper2017.paperCode).map(q => q.id).sort()).toEqual(paper2017.questions.map(q => q.id).sort());
      expect(written2017.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3a', '3b', '4', '5', '6', '7a', '7b', '8', '9a', '9b', '10a', '10b']);
      expect(written.filter(q => q.id.startsWith('chm-x-2017-')).map(q => q.id).sort()).toEqual(written2017.questions.map(q => q.id).sort());
      const modelP1 = getFallbackPaper('CHM-X-P1')!;
      for (const [otherPaper, pairs] of [[modelP1, [[4, 6], [10, 17]]], [combined2022, [[5, 8], [15, 16], [17, 25], [20, 35]]]] as const) {
        for (const [number2017, otherNumber] of pairs) {
          const repeated = [paper2017.questions[number2017 - 1], otherPaper.questions[otherNumber - 1]];
          expect(groupDuplicateQuestions(repeated, q => q)).toEqual([repeated]);
        }
      }
      const paper2018 = getFallbackPaper('CHM-X-2018-P1')!;
      const written2018 = getFallbackPaper('CHM-X-2018-P2')!;
      expect([paper2018.totalMarks, paper2018.durationMinutes]).toEqual([25, 35]);
      expect([written2018.totalMarks, written2018.durationMinutes]).toEqual([40, 145]);
      expect(paper2018.questions).toHaveLength(25);
      expect(paper2018.questions.map(q => q.sourceRegion.official_answer).join('')).toBe('ADBCBDDCDDCCBBBADCCDBCCBB');
      for (const question of paper2018.questions) {
        const { options } = sourceChoiceContent(question);
        expect(options).toHaveLength(4);
        expect(options.every(option => option.feedback)).toBe(true);
        expect(options.filter(option => option.isCorrect).map(option => option.id)).toEqual([question.sourceRegion.official_answer]);
      }
      expect(sourceChoiceContent(paper2018.questions[11]).options.every(option => option.text.includes('/CHM-X-2018-P1/q12-'))).toBe(true);
      expect(listed.filter(q => q.paperCode === paper2018.paperCode).map(q => q.id).sort()).toEqual(
        paper2018.questions.filter(q => q.questionNumber !== '22').map(q => q.id).sort(),
      );
      expect(written2018.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9a', '9b', '10a', '10b']);
      expect(written.filter(q => q.id.startsWith('chm-x-2018-')).map(q => q.id).sort()).toEqual(written2018.questions.map(q => q.id).sort());
      for (const [year, question2018, laterQuestion] of [[2021, 7, 12], [2022, 13, 17], [2021, 14, 22], [2021, 21, 32], [2022, 23, 39]]) {
        const laterPaper = year === 2021 ? combined2021 : combined2022;
        const repeated = [paper2018.questions[question2018 - 1], laterPaper.questions[laterQuestion - 1]];
        expect(groupDuplicateQuestions(repeated, q => q)).toEqual([repeated]);
      }
      const paper2019 = getFallbackPaper('CHM-X-2019-P1')!;
      const written2019 = getFallbackPaper('CHM-X-2019-P2')!;
      expect(paper2019.questions).toHaveLength(25);
      expect(paper2019.durationMinutes).toBe(40);
      expect(paper2019.questions.every(q => q.sourceRegion.option_feedback?.length === 4 && q.sourceRegion.option_feedback.every(option => option.reason) && q.sourceRegion.official_answer)).toBe(true);
      expect(listed.filter(q => q.paperCode === paper2019.paperCode).map(q => q.id).sort()).toEqual(
        paper2019.questions.filter(q => q.questionNumber !== '15').map(q => q.id).sort(),
      );
      expect(written2019.durationMinutes).toBe(140);
      expect(written2019.totalMarks).toBe(40);
      expect(written2019.questions.filter(q => q.questionType === 'EXTENDED_RESPONSE').map(q => q.questionNumber)).toEqual(['9a', '9b', '10a', '10b']);
      expect(written.filter(q => q.id.startsWith('chm-x-2019-')).map(q => q.id).sort()).toEqual(written2019.questions.map(q => q.id).sort());
      const annual = getFallbackPaper('CHM-X-2026-P1')!;
      const annualWritten = getFallbackPaper('CHM-X-2026-P2')!;
      expect(annual.questions).toHaveLength(40);
      expect(annual.questions.every(q => q.sourceRegion.option_feedback?.length === 4 && q.sourceRegion.answer_origin === 'PROJECT_SOLVED')).toBe(true);
      expect(listed.filter(q => q.paperCode === annual.paperCode).map(q => q.id).sort()).toEqual(
        annual.questions.filter(q => q.questionNumber !== '34').map(q => q.id).sort(),
      );
      expect(written.filter(q => q.id.startsWith('chm-x-2026-')).map(q => q.id).sort()).toEqual(
        annualWritten.questions.filter(q => q.questionNumber !== '4').map(q => q.id).sort(),
      );
      for (const [number, letters] of [[23, 'AC'], [27, 'BCD'], [29, 'CD'], [39, 'AD']] as const) {
        const content = sourceChoiceContent(annual.questions[number - 1]);
        expect(content.acceptAnyCorrectOption).toBe(true);
        expect(content.options.filter(option => option.isCorrect).map(option => option.id)).toEqual(letters.split(''));
      }
    }
  });

  it('includes reviewed Class IX Biology papers in their current syllabus chapters', async () => {
    const topics = Array.from({ length: 9 }, (_, index) => ({
      ...topic, id: String(index + 1), topicNumber: String(index + 1),
      syllabusVersion: {
        ...topic.syllabusVersion,
        fileUrl: '/materials/ssc/biology/biology-ssc-syllabus-2025.pdf',
        subject: { name: 'Biology', academicClass: { level: 9 } },
      },
    }));
    mocks.topics.mockResolvedValue(topics);
    mocks.topic.mockImplementation(async ({ where }) => topics.find(chapter => chapter.id === where.id));
    const listed = (await mappedChapterGroups('AKU-EB', 9, 'Biology')).flatMap(group => group.questions);
    const mcqs = listed.filter(q => q.paperCode === 'BIO-IX-2026-P1');
    expect(mcqs).toHaveLength(40);
    expect(new Set(mcqs.map(q => q.id)).size).toBe(40);
    const glucose = mcqs.find(q => q.rawQuestionNumber === '11')!;
    expect(glucose.unitNumber).toBe(4);
    expect(glucose.options.A).toContain('q11-a.webp');
    expect(glucose.correctOption).toBe('A');
    const older = listed.filter(q => q.paperCode === 'BIO-IX-2021-P1');
    expect(older).toHaveLength(50);
    expect(new Set(older.map(q => q.id)).size).toBe(50);
    const paper2021 = getFallbackPaper('BIO-IX-2021-P1')!;
    expect(paper2021.questions.filter(q => q.sourceRegion.assessmentSection === 'Alternate to Practical')).toHaveLength(10);
    expect(paper2021.questions.every(q => q.sourceRegion.option_feedback?.length === 4)).toBe(true);
    for (const [index, answers] of [[28, ['C', 'D']], [38, ['A', 'D']]] as const) {
      const content = sourceChoiceContent(paper2021.questions[index]);
      expect(content.acceptAnyCorrectOption).toBe(true);
      expect(content.options?.filter(option => option.isCorrect).map(option => option.id)).toEqual(answers);
      expect(content.options?.every(option => option.feedback)).toBe(true);
    }
    const theory = await mappedTheoryUnits('AKU-EB', 9, 'Biology');
    expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2026)).toHaveLength(6);
    expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2026)).toHaveLength(4);
    expect(theory.find(unit => unit.unitNumber === 9)?.erqs.find(q => q.examYear === 2026)?.sourceHref).toContain('#question-8b');
    const mcqs2019 = listed.filter(q => q.paperCode === 'BIO-IX-2019-P1');
    expect(mcqs2019).toHaveLength(30);
    expect(new Set(mcqs2019.map(q => q.id)).size).toBe(30);
    expect(mcqs2019.every(q => q.option_feedback?.length === 4)).toBe(true);
    const paper2019 = getFallbackPaper('BIO-IX-2019-P1')!;
    for (const [index, answers] of [[5, ['A', 'C']], [27, ['C', 'D']]] as const) {
      const content = sourceChoiceContent(paper2019.questions[index]);
      expect(content.acceptAnyCorrectOption).toBe(true);
      expect(content.options?.filter(option => option.isCorrect).map(option => option.id)).toEqual(answers);
    }
    expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2019)).toHaveLength(6);
    expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2019)).toHaveLength(4);
    expect(listed.filter(q => q.paperCode === 'BIO-IX-2018-P1')).toHaveLength(21);
    expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2018)).toHaveLength(8);
    expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2018)).toHaveLength(4);
    const paper2018 = getFallbackPaper('BIO-IX-2018-P1')!;
    expect(paper2018.questions).toHaveLength(25);
    const energy = sourceChoiceContent(paper2018.questions[7]);
    expect(energy.acceptAnyCorrectOption).toBe(true);
    expect(energy.options?.filter(option => option.isCorrect).map(option => option.id)).toEqual(['B', 'C']);
    const graphs = sourceChoiceContent(paper2018.questions[16]);
    expect(graphs.options?.map(option => option.text)).toEqual(['a', 'b', 'c', 'd'].map(letter => expect.stringContaining('q17-' + letter + '.webp')));
    expect(graphs.options?.every(option => option.feedback)).toBe(true);
    const emulsification = listed.filter(q => ['bio-ix-2018-p1-q22', 'bio-ix-2021-p1-q31'].includes(q.id));
    expect(emulsification).toHaveLength(2);
    expect(groupDuplicateQuestions(emulsification, q => q)).toEqual([emulsification]);
    expect(listed.filter(q => q.paperCode === 'BIO-IX-2017-P1')).toHaveLength(21);
    expect(theory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2017)).toHaveLength(7);
    expect(theory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2017)).toHaveLength(2);
    const paper2017 = getFallbackPaper('BIO-IX-2017-P1')!;
    expect(paper2017.questions).toHaveLength(25);
    expect(paper2017.questions.every(q => q.sourceRegion.option_feedback?.length === 4)).toBe(true);
    const prophase = sourceChoiceContent(paper2017.questions[12]);
    expect(prophase.options.map(option => option.text)).toEqual(['a', 'b', 'c', 'd'].map(letter => expect.stringContaining('q13-' + letter + '.webp')));
    const written2017 = getFallbackPaper('BIO-IX-2017-P2')!;
    expect(written2017.questions).toHaveLength(14);
    expect(written2017.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME').map(q => q.questionNumber)).toEqual(['2a', '5']);
    for (const numbers of [['bio-ix-2017-p1-q10', 'bio-ix-2019-p1-q8'], ['bio-ix-2017-p1-q23', 'bio-ix-2021-p1-q35']]) {
      const repeated = listed.filter(q => numbers.includes(q.id));
      expect(repeated).toHaveLength(2);
      expect(groupDuplicateQuestions(repeated, q => q)).toEqual([repeated]);
    }

    const gradeTenTopics = [11, 15, 17].map(unit => ({
      ...topics[0], id: String(unit), topicNumber: String(unit),
      syllabusVersion: { ...topics[0].syllabusVersion, subject: { name: 'Biology', academicClass: { level: 10 } } },
    }));
    mocks.topics.mockResolvedValue(gradeTenTopics);
    mocks.topic.mockImplementation(async ({ where }) => gradeTenTopics.find(chapter => chapter.id === where.id));
    const gradeTenTheory = await mappedTheoryUnits('AKU-EB', 10, 'Biology');
    expect(gradeTenTheory.map(unit => [unit.unitNumber, unit.crqs.filter(q => q.examYear !== 2017).map(q => q.questionNumber)])).toEqual([[11, ['3']], [15, ['2']], [17, ['3']]]);
    expect(gradeTenTheory.flatMap(unit => unit.crqs).filter(q => q.examYear === 2017).map(q => q.questionNumber)).toEqual(['3']);
    expect(gradeTenTheory.flatMap(unit => unit.erqs).filter(q => q.examYear === 2017).map(q => q.questionNumber)).toEqual(['8a', '9a']);
    const gradeTenMcqs = (await mappedChapterGroups('AKU-EB', 10, 'Biology')).flatMap(group => group.questions);
    for (const paperCode of ['BIO-IX-2017-P1', 'BIO-IX-2018-P1']) {
      expect(gradeTenMcqs.filter(q => q.paperCode === paperCode).map(q => q.rawQuestionNumber)).toEqual(['12', '13', '14', '15']);
    }
    expect(gradeTenMcqs.every(q => q.sourceGrade === 9)).toBe(true);
  });
});
