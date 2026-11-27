import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_2026_source_manifest.json';
import type { PaperData, QuestionData } from './paperDataService';
import { mathematicsX2026Mcqs } from './mathematicsX2026Mcqs';
import { mathematicsX2026Written } from './mathematicsX2026Written';

export const mathematicsX2026Notes = {
  year: 2026, label: 'Paper 2 E-marking', href: '/resources/mathematics-x-2026-emarking', fileUrl: manifest.sources.em.url,
};

export const mathematicsX2026Tabs = [
  { label: 'Paper I', href: '/past-papers/MTH-X-2026-P1' },
  { label: 'Paper II', href: '/past-papers/MTH-X-2026-P2' },
  mathematicsX2026Notes,
  { label: 'Formula sheet (PDF)', href: manifest.sources.p1.url + '#page=2' },
];

const outcomes = new Map(([9, 10] as const).flatMap(grade => (grade === 9 ? ix : x).flatMap(unit =>
  unit.subtopics.flatMap(topic => topic.slos.map(slo =>
    [slo.code, { code: slo.code, description: slo.description, unitNumber: unit.unitNumber, topic: unit.name, grade }] as const,
  )),
)));

const letters = ['A', 'B', 'C', 'D'];
const diagrams = new Set([4, 5, 19, 20, 22, 28, 35, 37, 38, 40, 41, 42, 43, 44, 45]);
const writtenDiagrams = new Set(['4', '7b', '8a', '8b', '9']);

function crop(part: 1 | 2, number: string, suffix = '') {
  return '/paper-crops/MTH-X-2026-P' + part + '/q' + number + suffix + '.webp';
}

function question(part: 1 | 2, number: string, code: string, stem: string, marks: number, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = code ? outcomes.get(code) : undefined;
  if (code && !outcome) throw new Error('Unknown Mathematics SLO ' + code);
  return {
    id: 'mth-x-2026-p' + part + '-q' + number, questionNumber: number, questionText: stem,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : 'CONSTRUCTED_RESPONSE', marks,
    difficulty: region.cognitive_level, diagramBased: Boolean(region.diagramUrl), isDiagram: Boolean(region.diagramUrl),
    topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unitNumber } }] : [],
    slos: outcome ? [{ slo: { code, description: outcome.description } }] : [],
    sourceRegion: {
      ...region, current_syllabus_reviewed: true, syllabus_reviewed: true,
      current_slo: outcome?.code, current_mapping: outcome ? [outcome] : [],
      mapping_scope: { board: 'AKU-EB', grade: outcome?.grade ?? 10, subject: 'Mathematics' },
      mapping_status: !outcome ? 'NO_DIRECT_OUTCOME' : outcome.grade === 9 ? 'MOVED_TO_GRADE_IX' : 'MAPPED',
      in_syllabus: outcome?.grade === 10, out_of_syllabus: outcome?.grade !== 10,
    },
  };
}

const mcqs = mathematicsX2026Mcqs.map(([page, code, level, key, stem, options, explanation], index) => {
  const number = String(index + 1);
  const choices = options.split('|');
  if (choices.length !== 4 || (key && !letters.includes(key))) throw new Error('Invalid Mathematics question ' + number);
  return question(1, number, code, stem, 1, {
    pageNumber: page, cognitive_level: level,
    choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
    correct_answer: key || undefined,
    answer_origin: key ? 'PROJECT_SOLVED' : undefined,
    single_answer_review_required: !key,
    answer_review_note: !key ? explanation : number === '13' ? 'The digital wording specifies the standard form because option B combines the two terms for the repeated linear factor.' : undefined,
    explanation,
    diagramUrl: diagrams.has(index + 1) ? crop(1, number) : undefined,
  });
});

const written = mathematicsX2026Written.map(([number, page, notesPage, marks, originalSlo, code, level, worked, stem, solution, hints]) =>
  question(2, number, code, stem, marks, {
    pageNumber: page, slo: originalSlo, cognitive_level: level, is_numerical: worked,
    model_answer: solution, model_answer_origin: 'RiseLearner worked solution',
    official_marking_notes: hints, original_reference_verified: true,
    original_reference_source: mathematicsX2026Notes.fileUrl + '#page=' + notesPage,
    choice_group: /[ab]$/.test(number) ? number[0] : undefined,
    choice_instruction: /[ab]$/.test(number) ? 'Attempt one alternative for Question ' + number[0] + '.' : undefined,
    diagramUrl: writtenDiagrams.has(number) ? crop(2, number) : undefined,
    better_response_image: crop(2, number, '-stronger'),
    weaker_response_image: crop(2, number, '-weaker'),
  }),
);

export const mathematicsX2026Papers: PaperData[] = ([1, 2] as const).map(part => {
  const paperCode = 'MTH-X-2026-P' + part;
  return {
    id: paperCode, paperCode, title: 'Mathematics Class X 2026 Paper ' + (part === 1 ? 'I' : 'II'),
    examYear: 2026, examType: 'ANNUAL', examSession: 'Annual Examination 2026',
    fileUrl: (part === 1 ? manifest.sources.p1 : manifest.sources.p2).url,
    totalMarks: part === 1 ? 45 : 30, durationMinutes: part === 1 ? 80 : 100,
    printedCode: part === 1 ? 'S2602-0721110' : 'S2602-0721120',
    rubricInstruction: part === 2 ? 'Answer all nine questions. Choose one alternative each for Questions 2, 3, 7 and 8.' : undefined,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'mathematics-x', name: 'Mathematics', code: 'MTH' },
    questions: part === 1 ? mcqs : written,
  };
});
