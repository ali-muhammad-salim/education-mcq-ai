import syllabus from '@/data/mathematics/ssc1_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc1_2026_source_manifest.json';
import type { PaperData, QuestionData } from './paperDataService';
import { mathematicsIx2026Mcqs } from './mathematicsIx2026Mcqs';
import { mathematicsIx2026Written } from './mathematicsIx2026Written';
import { paperQuestionNumber } from './paperPresentation';

export const mathematicsIx2026Notes = {
  year: 2026, label: 'Paper 2 E-marking', href: '/resources/mathematics-ix-2026-emarking', fileUrl: manifest.sources.em.url,
};
export const mathematicsIx2026Tabs = [
  { label: 'Paper I', href: '/past-papers/MTH-IX-2026-P1' },
  { label: 'Paper II', href: '/past-papers/MTH-IX-2026-P2' },
  mathematicsIx2026Notes,
  { label: 'Formula sheet (PDF)', href: manifest.sources.p1.url + '#page=2' },
];

const repeatedQuestions: Record<string, Readonly<Record<string, number>>> = {
  'MTH-IX-2017-P1': { 13: 8 },
  'MTH-IX-2019-P1': { 2: 3, 30: 39 },
  'MTH-IX-2021-P1': { 27: 7 },
  'MTH-IX-2026-P1': { 3: 3, 7: 7, 8: 8, 39: 39 },
};

export function mathematicsIx2026DuplicateKey(paperCode: string | null, number: string | number) {
  const match = paperCode && repeatedQuestions[paperCode]?.[paperQuestionNumber(number)];
  return match ? 'mathematics-ix-2026-repeat-' + match : undefined;
}

const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome =>
  [outcome.code, { description: outcome.description, unit: unit.unitNumber, topic: unit.name }] as const))));
const answers = ['A', 'B', 'C', 'D'];
const diagramChoices = new Set([22, 27, 33]);
const diagramStems = new Set([2, 24, 29, 34, 36, 37, 38, 39, 40, 45]);
const sourceCorrections: Record<number, string> = {
  5: 'The original omits the condition that a is nonzero. If a is zero, the function is constant and has no inverse.',
  14: 'Without the stated restriction, the principal square root is the absolute value of x² − 8. The digital item specifies the interval where the printed answer A holds.',
  15: 'The stated HCF and LCM need not be compatible, since the former should divide the latter. The digital wording assesses the intended product identity using the two given expressions.',
  19: 'When a is zero, all nonnegative real x satisfy the equation. The digital item states the nonzero condition needed for the printed answer.',
  33: 'The original does not identify the distance condition. The digital question specifies distance from a fixed centre.',
  34: 'The digital question specifies the printed 3 cm distance from PQ and limits the choices to the marked segments.',
  38: 'The digital question makes clear that the three-quarters comparison is between areas.',
};

function crop(part: 1 | 2, number: number | string, suffix = '') {
  return '/paper-crops/MTH-IX-2026-P' + part + '/q' + number + suffix + '.webp';
}

function question(part: 1 | 2, number: string, code: string, stem: string, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = outcomes.get(code);
  if (!outcome) throw new Error('Unknown Class IX Mathematics SLO ' + code);
  return {
    id: 'mth-ix-2026-p' + part + '-q' + number, questionNumber: number, questionText: stem,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : 'CONSTRUCTED_RESPONSE',
    marks: part === 1 ? 1 : 3, difficulty: region.cognitive_level,
    isDiagram: Boolean(region.diagramUrl || region.diagramBased), diagramBased: Boolean(region.diagramUrl || region.diagramBased),
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    slos: [{ slo: { code, description: outcome.description } }],
    sourceRegion: {
      ...region, in_syllabus: true, current_slo: code, current_syllabus_reviewed: true, syllabus_reviewed: true,
      current_mapping: [{ code, ...outcome, grade: 9 }],
      mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Mathematics' },
    },
  };
}

const mcqs = mathematicsIx2026Mcqs.map(([page, slo, level, key, stem, choices, reasons], index) => {
  const number = index + 1;
  const options = choices.split('|');
  const feedback = reasons.split('|');
  return question(1, String(number), slo, stem, {
    pageNumber: page, cognitive_level: level,
    choices: Object.fromEntries(answers.map((letter, i) => [letter, diagramChoices.has(number)
      ? '![' + options[i] + '](' + crop(1, number, '-' + letter.toLowerCase()) + ')' : options[i]])),
    correct_answer: key, answer_origin: 'PROJECT_SOLVED',
    explanation: feedback[answers.indexOf(key)], option_feedback: answers.map((letter, i) => ({ key: letter, reason: feedback[i] })),
    answer_review_note: sourceCorrections[number],
    diagramBased: diagramChoices.has(number),
    diagramUrl: diagramStems.has(number) ? crop(1, number) : undefined,
  });
});

const written = mathematicsIx2026Written.map(row => question(2, row.number, row.slo, row.stem, {
  pageNumber: row.page, slo: row.originalSlo, cognitive_level: row.level,
  model_answer: row.solution, model_answer_origin: 'RiseLearner worked solution',
  official_marking_notes: row.hints, original_reference_verified: true,
  original_reference_source: mathematicsIx2026Notes.fileUrl + '#page=' + row.notesPage,
  is_numerical: row.numerical,
  diagramUrl: row.diagram ? crop(2, row.number) : undefined,
  better_response_image: crop(2, row.number, '-stronger'),
  weaker_response_image: crop(2, row.number, '-weaker'),
  choice_instruction: /^9[abc]$/.test(row.number) ? 'Attempt any two parts of Question 9.'
    : /^[457][ab]$/.test(row.number) ? 'Attempt one alternative for Question ' + row.number[0] + '.' : undefined,
}));

export const mathematicsIx2026Papers: PaperData[] = ([1, 2] as const).map(part => {
  const roman = part === 1 ? 'I' : 'II';
  const paperCode = 'MTH-IX-2026-P' + part;
  return {
    id: paperCode, paperCode, title: 'Mathematics (Science Group) Class IX 2026 Paper ' + roman,
    examYear: 2026, examType: 'ANNUAL', examSession: 'Annual Examination 2026',
    fileUrl: (part === 1 ? manifest.sources.p1 : manifest.sources.p2).url,
    totalMarks: part === 1 ? 45 : 30, durationMinutes: part === 1 ? 80 : 100,
    rubricInstruction: part === 2 ? 'Answer all nine questions. Choose one alternative each for Questions 4, 5 and 7, and any two parts of Question 9.' : undefined,
    academicClass: { name: 'Class IX', level: 9 },
    subject: { id: 'mathematics-ix', name: 'Mathematics', code: 'MTH' },
    questions: part === 1 ? mcqs : written,
  };
});
