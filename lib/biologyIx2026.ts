import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import type { PaperData, QuestionData } from './paperDataService';
import { biologyIx2026Mcqs } from './biologyIx2026Mcqs';
import { biologyIx2026Written } from './biologyIx2026Written';

const root = '/materials/ssc/biology/ssc-1/biology-ix-2026-';
export const biologyIx2026Notes = {
  year: 2026,
  label: 'E-marking notes',
  href: '/resources/biology-ix-2026-emarking',
  fileUrl: root + 'emarking.pdf',
};
export const biologyIx2026Tabs = [
  { year: 2026, label: 'Paper 1', href: '/past-papers/BIO-IX-2026-P1' },
  { year: 2026, label: 'Paper 2', href: '/past-papers/BIO-IX-2026-P2' },
  biologyIx2026Notes,
];

const outcomes = new Map(syllabus[9].flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(slo =>
  [slo.code, { ...slo, unit: unit.unitNumber, topic: unit.name }] as const))));

function question(part: 1 | 2, number: string, questionText: string, marks: number, code: string,
  sourceRegion: QuestionData['sourceRegion']): QuestionData {
  const outcome = outcomes.get(code);
  if (!outcome) throw new Error('Unknown Class IX Biology outcome ' + code);
  const alternative = /[ab]$/.test(number);
  return {
    id: `bio-ix-2026-p${part}-q${number}`, questionNumber: number, questionText, marks,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    difficulty: outcome.cognitiveLevel,
    isDiagram: Boolean(sourceRegion.diagramUrl),
    diagramBased: Boolean(sourceRegion.diagramUrl),
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    slos: [{ slo: { code, description: outcome.description } }],
    sourceRegion: {
      ...sourceRegion,
      current_slo: code,
      current_mapping: [{ code, description: outcome.description, topic: outcome.topic, grade: 9 }],
      mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Biology' },
      cognitive_level: outcome.cognitiveLevel,
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
      in_syllabus: true,
      choice_instruction: alternative ? `${number.endsWith('a') ? 'EITHER' : 'OR'} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
    },
  };
}

const letters = ['A', 'B', 'C', 'D'];
const mcqs = biologyIx2026Mcqs.map(([page, code, stem, options, answer, reasons, figure], index) =>
  question(1, String(index + 1), stem, 1, code, {
    pageNumber: page,
    choices: Object.fromEntries(options.map((option, optionIndex) => [letters[optionIndex], option])),
    correct_answer: answer,
    answer_origin: 'PROJECT_SOLVED',
    explanation: reasons[letters.indexOf(answer)],
    option_feedback: reasons.map((reason, optionIndex) => ({ key: letters[optionIndex], reason })),
    diagramUrl: figure ? `/paper-crops/BIO-IX-2026-P1/${figure}.webp` : undefined,
  }));

export function biologyIx2026ResponseImage(questionNumber: string, kind: 'stronger' | 'weaker') {
  return `/paper-crops/BIO-IX-2026-P2/q${questionNumber}-${kind}.webp`;
}

const written = biologyIx2026Written.map(row =>
  question(2, row.number, row.stem, row.marks, row.code, {
    pageNumber: row.page,
    slo: row.boardCode ?? row.code,
    model_answer: row.solution,
    model_answer_origin: 'RiseLearner worked solution',
    official_marking_notes: row.hints,
    original_reference_source: biologyIx2026Notes.fileUrl + '#page=' + row.notesPage,
    original_reference_verified: true,
    better_response_image: biologyIx2026ResponseImage(row.number, 'stronger'),
    weaker_response_image: biologyIx2026ResponseImage(row.number, 'weaker'),
    diagramUrl: row.figure ? `/paper-crops/BIO-IX-2026-P2/q${row.number}.webp` : undefined,
  }));

export const biologyIx2026Papers: PaperData[] = ([1, 2] as const).map(part => {
  const code = `BIO-IX-2026-P${part}`;
  const roman = part === 1 ? 'I' : 'II';
  return {
    id: code, paperCode: code, title: `Biology Class IX 2026 Paper ${roman}`,
    examYear: 2026, examSession: 'Annual Examination 2026', examType: 'ANNUAL',
    fileUrl: root + 'paper-' + roman.toLowerCase() + '.pdf',
    totalMarks: part === 1 ? 40 : 25,
    durationMinutes: part === 1 ? 70 : 110,
    rubricInstruction: part === 2 ? 'Answer all eight questions. Attempt one alternative each for Questions 7 and 8.' : undefined,
    academicClass: { name: 'Class IX', level: 9 },
    subject: { id: 'biology-ix', name: 'Biology', code: 'BIO' },
    questions: part === 1 ? mcqs : written,
  };
});
