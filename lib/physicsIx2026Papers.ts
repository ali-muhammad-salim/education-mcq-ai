import source from '@/data/physics/ssc1_2026_papers.json';
import syllabus from '@/data/physics/ssc1_exact_syllabus.json';
import type { PaperData, QuestionData } from '@/lib/paperDataService';

const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome => [
  outcome.code, { ...outcome, topic: unit.name, unit: unit.unitNumber },
] as const))));
const letters = ['A', 'B', 'C', 'D'];
const scope = { board: 'AKU-EB', grade: 9, subject: 'Physics' };
const paperOneCode = 'PHY-IX-2026-P1';
const paperTwoCode = 'PHY-IX-2026-P2';
const crop = (id: string) => `/paper-crops/${paperOneCode}/${id}.webp`;
const tableHeadings: Record<number, string[]> = {
  2: ['Scalar', 'Vector'],
  27: ['Atmospheric pressure at sea level', 'Atmospheric pressure at mountains'],
};

function mapping(code: string) {
  const outcome = outcomes.get(code)!;
  return {
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    sourceRegion: {
      current_slo: code,
      current_syllabus_reviewed: true,
      mapping_scope: scope,
      current_mapping: [{ code, description: outcome.description, topic: outcome.topic }],
    },
  };
}

const mcqs: QuestionData[] = source.mcqs.map((row, index) => {
  const number = index + 1;
  const headings = tableHeadings[number];
  const labels = row.options.map((text, i) => {
    if (number === 8) return `![${text}](${crop(`question-8-option-${letters[i].toLowerCase()}`)})`;
    return headings ? text.split(' · ').map((cell, col) => `${headings[col]}: ${cell}`).join(' · ') : text;
  });
  const table = headings ? [
    `| Option | ${headings.join(' | ')} |`,
    '| --- | --- | --- |',
    ...row.options.map((text, i) => `| ${letters[i]} | ${text.split(' · ').join(' | ')} |`),
  ].join('\n') : '';
  const syllabusMapping = mapping(row.slo);
  return {
    ...syllabusMapping, id: `${paperOneCode}-q${number}`, questionNumber: String(number),
    questionText: table ? `${row.stem}\n\n${table}` : row.stem,
    questionType: 'MULTIPLE_CHOICE', marks: 1, diagramBased: Boolean(row.figure) || number === 8,
    sourceRegion: {
      ...syllabusMapping.sourceRegion,
      choices: Object.fromEntries(letters.map((letter, i) => [letter, labels[i]])),
      option_feedback: letters.map((letter, i) => ({ key: letter, reason: row.reasons[i] })),
      correct_answer: row.key,
      answer_origin: 'PROJECT_SOLVED',
      explanation: row.reasons[letters.indexOf(row.key)],
      quiz_stem: table ? row.stem : undefined,
      diagramUrl: row.figure ? crop(row.figure) : undefined,
    },
  };
});

const written: QuestionData[] = source.written.map(row => {
  const syllabusMapping = mapping(row.slo);
  const alternative = row.number.endsWith('a') ? 'EITHER' : row.number.endsWith('b') ? 'OR' : undefined;
  return {
    ...syllabusMapping, id: `${paperTwoCode}-q${row.number}`,
    questionNumber: row.number, questionText: row.stem, marks: row.marks,
    questionType: alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    sourceRegion: {
      ...syllabusMapping.sourceRegion,
      model_answer: row.solution,
      model_answer_origin: 'RiseLearner worked solution',
      choice_instruction: alternative,
      group_question_number: alternative === 'EITHER' ? Number.parseInt(row.number, 10) : undefined,
    },
  };
});

const common = {
  examYear: 2026, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};
const pdfRoot = '/materials/ssc/physics/ssc-1/physics-ix-2026-paper-';

export const physicsIx2026Papers = [
  {
    ...common, id: paperOneCode, paperCode: paperOneCode,
    title: 'Physics Class IX Annual 2026 · Paper I', fileUrl: pdfRoot + 'i.pdf',
    totalMarks: 40, durationMinutes: 70, questionCount: 40, printedCode: 'S2601-1711110',
    questions: mcqs,
  },
  {
    ...common, id: paperTwoCode, paperCode: paperTwoCode,
    title: 'Physics Class IX Annual 2026 · Paper II', fileUrl: pdfRoot + 'ii.pdf',
    totalMarks: 25, durationMinutes: 110, questionCount: 7, printedCode: 'S2601-1711120',
    rubricInstruction: 'Answer all seven questions. Attempt one alternative each for Questions 6 and 7.',
    questions: written,
  },
] satisfies PaperData[];

export const physicsIx2026Tabs = physicsIx2026Papers.map((paper, index) => ({
  label: index === 0 ? 'Paper I · MCQs' : 'Paper II · Written responses',
  href: '/past-papers/' + paper.paperCode,
}));

export const physicsIx2026ChapterMcqs = mcqs.map(question => ({
  ...question,
  paperCode: paperOneCode,
  sourceTitle: '2026 · Annual · Paper 1',
  examYear: 2026,
  rawQuestionNumber: Number(question.questionNumber),
  stem: question.sourceRegion.quiz_stem ?? question.questionText,
  options: question.sourceRegion.choices,
  correctOption: question.sourceRegion.correct_answer,
  diagramUrl: question.sourceRegion.diagramUrl,
  current_slo: question.sourceRegion.current_slo,
  unitNumber: question.topics?.[0].topic.topicNumber,
}));

export const physicsIx2026ChapterWritten = written.map(question => ({
  id: question.id, unitNumber: question.topics?.[0].topic.topicNumber,
  extended: question.questionType === 'EXTENDED_RESPONSE',
  questionNumber: question.questionNumber, questionText: question.questionText, marks: question.marks,
  sourceTitle: '2026 Annual Paper II', sourceHref: `/past-papers/${paperTwoCode}#question-${question.questionNumber}`,
  examYear: 2026, currentSlo: question.sourceRegion.current_slo ?? undefined,
  modelAnswer: question.sourceRegion.model_answer ?? '',
  solutionOrigin: 'supplied_resource',
  choiceInstruction: question.sourceRegion.choice_instruction,
}));
