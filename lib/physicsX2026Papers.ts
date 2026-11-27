import syllabus from '@/data/physics/ssc2_exact_syllabus.json';
import type { PaperData, QuestionData } from '@/lib/paperDataService';
import { physicsX2026Mcqs, physicsX2026Written } from './physicsX2026Items';

const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome =>
  [outcome.code, { ...outcome, topic: unit.name, unit: unit.unitNumber }] as const))));
const letters = ['A', 'B', 'C', 'D'];
const paperI = 'PHY-X-2026-P1';
const paperII = 'PHY-X-2026-P2';
const scope = { board: 'AKU-EB', grade: 10, subject: 'Physics' };
const reference = '/materials/ssc/physics/ssc-2/physics-ssc-full-syllabus-2025.pdf';
const acceptedOptions: Record<number, string[]> = { 14: ['B', 'D'], 32: ['A', 'B'], 37: ['A', 'B'] };
const duplicates: Record<number, string> = {
  18: 'physics-x-voltmeter-2-4-2-ohm',
  22: 'physics-x-motor-energy-conversion',
  27: 'physics-x-thermionic-particles',
  36: 'physics-x-alpha-ionisation',
};
const answerNotes: Record<number, string> = {
  10: 'The ratio from the printed depths is 1.667, so 1.66 is the closest printed choice. The question uses the supplied values rather than the usual index of water.',
  14: 'B names the general category and D names the specific form of energy. The quiz accepts either.',
  32: 'Sorting is data processing. Storing and organising marks are also data management. The quiz accepts either.',
  34: 'The printed question asks which method is slowest. Data rates depend on the equipment and protocol, so the digital stem asks students to identify the infrared link instead.',
  37: 'The wording of B refers to the sequence of individual decays. Both A and B describe randomness at that scale. A large sample still follows a predictable statistical decay law.',
};

function mapping(code: string | null, reason?: string) {
  const outcome = code ? outcomes.get(code) : undefined;
  if (code && !outcome) throw new Error('Unknown Class X Physics SLO ' + code);
  return {
    difficulty: outcome?.cognitiveLevel,
    topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }] : [],
    slos: outcome ? [{ slo: { code: outcome.code, description: outcome.description } }] : [],
    sourceRegion: {
      current_slo: code,
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
      mapping_scope: scope,
      mapping_review_source_url: reference,
      in_syllabus: Boolean(outcome),
      out_of_syllabus: !outcome,
      mapping_status: outcome ? undefined : 'NO_DIRECT_OUTCOME',
      mapping_reason: reason,
      cognitive_level: outcome?.cognitiveLevel,
      current_mapping: outcome ? [{ code: outcome.code, description: outcome.description, topic: outcome.topic, grade: 10 }] : [],
    },
  };
}

const mcqs = physicsX2026Mcqs.map(([pageNumber, code, answer, questionText, rawChoices, rawReasons], index): QuestionData => {
  const number = index + 1;
  const choices = rawChoices.split('|');
  const reasons = rawReasons.split('|');
  const reason = number === 3 ? 'The current syllabus covers oscillations but does not assess the restoring force on a ball in a bowl as a simple harmonic motion model.'
    : number === 14 ? 'The current syllabus covers fields and potential difference but has no direct outcome on identifying electrical potential energy in this scenario.'
    : 'Data handling and information systems are not direct outcomes of the current Class X Physics syllabus.';
  const syllabusMapping = mapping(code, code ? undefined : reason);
  return {
    ...syllabusMapping,
    id: paperI + '-q' + number, questionNumber: String(number), questionText,
    questionType: 'MULTIPLE_CHOICE', marks: 1, diagramBased: number === 18,
    sourceRegion: {
      ...syllabusMapping.sourceRegion, pageNumber,
      choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
      correct_answer: answer, answer_origin: 'PROJECT_SOLVED',
      explanation: reasons[letters.indexOf(answer)],
      option_feedback: letters.map((letter, i) => ({ key: letter, reason: reasons[i] })),
      accepted_options: acceptedOptions[number], score_accepted_options: Boolean(acceptedOptions[number]),
      answer_review_note: answerNotes[number],
      reviewed_duplicate_key: duplicates[number],
      diagramUrl: number === 18 ? '/paper-crops/' + paperI + '/q18.webp' : undefined,
    },
  };
});

const written = physicsX2026Written.map((row): QuestionData => {
  const alternative = row.number.endsWith('a') ? 'EITHER' : row.number.endsWith('b') ? 'OR' : undefined;
  const reason = row.number === '7a' ? 'Series capacitance is not assessed by a current Class X Physics outcome.'
    : 'General computer uses in education are not assessed by a current Class X Physics outcome.';
  const syllabusMapping = mapping(row.slo, row.slo ? undefined : reason);
  return {
    ...syllabusMapping, id: paperII + '-q' + row.number,
    questionNumber: row.number, questionText: row.stem, marks: row.marks,
    questionType: alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    diagramBased: Boolean(row.figure),
    sourceRegion: {
      ...syllabusMapping.sourceRegion,
      pageNumber: row.page,
      model_answer: row.solution,
      model_answer_origin: 'RiseLearner worked solution',
      choice_instruction: alternative,
      group_question_number: alternative === 'EITHER' ? parseInt(row.number, 10) : undefined,
      diagramUrl: row.figure ? '/paper-crops/' + paperII + '/q' + row.number + '.webp' : undefined,
      is_numerical: row.numerical,
    },
  };
});

const common = {
  examYear: 2026, examSession: 'Annual Examination', examType: 'ANNUAL',
  academicClass: { name: 'Class X', level: 10 },
  subject: { id: 'physics', name: 'Physics', code: 'PHY' },
};
const pdfRoot = '/materials/ssc/physics/ssc-2/physics-x-2026-paper-';

export const physicsX2026Papers = [
  {
    ...common, id: paperI, paperCode: paperI, title: 'Physics Class X Annual 2026 · Paper I',
    fileUrl: pdfRoot + 'i.pdf', totalMarks: 40, durationMinutes: 70,
    questionCount: 40, printedCode: 'S2602-1721110',
    rubricInstruction: 'Answer all 40 multiple-choice questions.', questions: mcqs,
  },
  {
    ...common, id: paperII, paperCode: paperII, title: 'Physics Class X Annual 2026 · Paper II',
    fileUrl: pdfRoot + 'ii.pdf', totalMarks: 25, durationMinutes: 110,
    questionCount: 7, printedCode: 'S2602-1721120',
    rubricInstruction: 'Answer all seven questions. Attempt one alternative each for Questions 6 and 7.', questions: written,
  },
] satisfies PaperData[];

export const physicsX2026Tabs = physicsX2026Papers.map((paper, index) => ({
  label: index === 0 ? 'Paper I · MCQs' : 'Paper II · Written responses',
  href: '/past-papers/' + paper.paperCode,
}));

export const physicsX2026ChapterMcqs = mcqs.filter(question => question.sourceRegion.in_syllabus).map(question => ({
  ...question, paperCode: paperI, sourceTitle: '2026 · Annual · Paper 1', examYear: 2026,
  rawQuestionNumber: Number(question.questionNumber), stem: question.questionText,
  options: question.sourceRegion.choices, correctOption: question.sourceRegion.correct_answer,
  diagramUrl: question.sourceRegion.diagramUrl, current_slo: question.sourceRegion.current_slo,
  unitNumber: question.topics?.[0].topic.topicNumber, cognitiveLevel: question.difficulty,
}));

export const physicsX2026ChapterWritten = written.filter(question => question.sourceRegion.in_syllabus).map(question => ({
  id: question.id, unitNumber: question.topics?.[0].topic.topicNumber, examYear: 2026,
  extended: question.questionType === 'EXTENDED_RESPONSE', numerical: question.sourceRegion.is_numerical,
  questionNumber: question.questionNumber, questionText: question.questionText, marks: question.marks,
  sourceTitle: '2026 Annual Paper II', sourceHref: '/past-papers/' + paperII + '#question-' + question.questionNumber,
  currentSlo: question.sourceRegion.current_slo ?? undefined,
  modelAnswer: question.sourceRegion.model_answer ?? '',
  solutionOrigin: question.sourceRegion.model_answer_origin,
  diagramUrl: question.sourceRegion.diagramUrl,
  choiceInstruction: question.sourceRegion.choice_instruction,
}));
