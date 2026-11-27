import syllabus from '@/data/chemistry/ssc1_exact_syllabus.json';
import chemistryMappingReview from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
import type { PaperData, QuestionData } from './paperDataService';
import { chemistryIx2026Mcqs } from './chemistryIx2026Mcqs';
import { chemistryIx2026Written } from './chemistryIx2026Written';
import { paperQuestionNumber } from './paperPresentation';

const root = '/materials/ssc/chemistry/ssc-1/chemistry-ix-2026-';
const syllabusUrl = '/materials/ssc/chemistry/ssc-1/chemistry-ssc-full-syllabus-2025.pdf';
export const chemistryIx2026Notes = {
  year: 2026, label: 'E-marking notes', href: '/resources/chemistry-ix-2026-emarking', fileUrl: root + 'emarking.pdf',
};
export const chemistryIx2026Tabs = [
  { year: 2026, label: 'Paper I', href: '/past-papers/CHM-IX-2026-P1' },
  { year: 2026, label: 'Paper II', href: '/past-papers/CHM-IX-2026-P2' },
  chemistryIx2026Notes,
];

const repeatedQuestions: Record<string, Readonly<Record<string, number>>> = {
  'CHM-IX-2021-P1': { 3: 8, 23: 15 },
  'CHM-IX-2022-P1': { 1: 2 },
  'CHM-IX-2023-P1': { 15: 20, 23: 27 },
  'CHM-IX-2026-P1': { 2: 2, 8: 8, 15: 15, 20: 20, 27: 27 },
};

export function chemistryIx2026DuplicateKey(paperCode: string | null, number: string | number) {
  const match = paperCode && repeatedQuestions[paperCode]?.[paperQuestionNumber(number)];
  return match ? 'chemistry-ix-2026-repeat-' + match : undefined;
}

const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome =>
  [outcome.code, { ...outcome, unit: unit.unitNumber, topic: unit.name }] as const))));

function makeQuestion(part: 1 | 2, number: string, code: string, stem: string, marks: number, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = outcomes.get(code);
  if (!outcome) throw new Error('Unknown Class IX Chemistry SLO ' + code);
  const alternative = part === 2 && /^[56][ab]$/.test(number);
  return {
    id: 'chm-ix-2026-p' + part + '-q' + number, questionNumber: number, questionText: stem,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    marks, difficulty: region.cognitive_level, isDiagram: Boolean(region.diagramUrl), diagramBased: Boolean(region.diagramUrl),
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    slos: [{ slo: { code, description: outcome.description } }],
    sourceRegion: {
      ...region, current_slo: code, in_syllabus: true,
      current_mapping: [{ code, description: outcome.description, topic: outcome.topic, grade: 9 }],
      mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Chemistry' },
      current_syllabus_reviewed: true, syllabus_reviewed: true,
      mapping_review_source_sha256: chemistryMappingReview.syllabus.sha256,
      mapping_review_source_url: syllabusUrl,
      choice_instruction: alternative
        ? (number.endsWith('a') ? 'EITHER' : 'OR') + ' · Attempt one alternative for Question ' + number[0]
        : undefined,
    },
  };
}

const letters = ['A', 'B', 'C', 'D'];
const mcqs = chemistryIx2026Mcqs.map(([page, code, level, answer, stem, rawChoices, rawFeedback], index) => {
  const number = index + 1;
  const choices = rawChoices.split('|');
  const feedback = rawFeedback.split('|');
  return makeQuestion(1, String(number), code, stem, 1, {
    pageNumber: page, cognitive_level: level,
    choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
    correct_answer: answer, answer_origin: 'PROJECT_SOLVED',
    explanation: feedback[letters.indexOf(answer)],
    option_feedback: letters.map((letter, i) => ({ key: letter, reason: feedback[i] })),
    ...(number === 11 ? {
      accepted_options: ['C', 'D'], score_accepted_options: true,
      answer_review_note: 'A Pauling electronegativity difference of 0.4 lies on a commonly used classroom boundary. C and D both earn credit.',
    } : {}),
    diagramUrl: number === 30 ? '/paper-crops/CHM-IX-2026-P1/q30.webp' : undefined,
  });
});

export function chemistryIx2026ResponseImage(number: string, kind: 'stronger' | 'weaker') {
  return '/paper-crops/CHM-IX-2026-P2/q' + number + '-' + kind + '.webp';
}

const written = chemistryIx2026Written.map(row => makeQuestion(2, row.number, row.slo, row.stem, row.marks, {
  pageNumber: row.page, slo: row.originalSlo, cognitive_level: row.level,
  model_answer: row.solution, model_answer_origin: 'RiseLearner worked solution', official_marking_notes: row.hints,
  original_reference_source: chemistryIx2026Notes.fileUrl + '#page=' + row.notesPage,
  original_reference_verified: true, is_numerical: row.numerical,
  diagramUrl: row.diagram ? '/paper-crops/CHM-IX-2026-P2/q' + row.number + '.webp' : undefined,
  better_response_image: chemistryIx2026ResponseImage(row.number, 'stronger'),
  weaker_response_image: chemistryIx2026ResponseImage(row.number, 'weaker'),
}));

export const chemistryIx2026Papers: PaperData[] = ([1, 2] as const).map(part => {
  const roman = part === 1 ? 'I' : 'II';
  const paperCode = 'CHM-IX-2026-P' + part;
  return {
    id: paperCode, paperCode, title: 'Chemistry Class IX 2026 Paper ' + roman,
    examYear: 2026, examType: 'ANNUAL', examSession: 'Annual Examination 2026',
    fileUrl: root + 'paper-' + roman.toLowerCase() + '.pdf',
    totalMarks: part === 1 ? 40 : 25, durationMinutes: part === 1 ? 70 : 110,
    rubricInstruction: part === 2 ? 'Answer all six questions. Attempt one alternative each for Questions 5 and 6.' : undefined,
    academicClass: { name: 'Class IX', level: 9 },
    subject: { id: 'chemistry-ix', name: 'Chemistry', code: 'CHM' },
    questions: part === 1 ? mcqs : written,
  };
});
