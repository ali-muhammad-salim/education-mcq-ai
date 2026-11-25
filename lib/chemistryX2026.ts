import syllabus from '@/data/chemistry/ssc2_exact_syllabus.json';
import chemistryMappingReview from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
import type { PaperData, QuestionData } from './paperDataService';
import { chemistryX2026Mcqs } from './chemistryX2026Mcqs';
import { chemistryX2026Written } from './chemistryX2026Written';

const root = '/materials/ssc/chemistry/ssc-2/chemistry-x-2026-';
export const chemistryX2026Notes = {
  year: 2026, label: 'E-marking notes', href: '/resources/chemistry-x-2026-emarking', fileUrl: root + 'emarking.pdf',
};
export const chemistryX2026Tabs = [
  { year: 2026, label: 'Paper I', href: '/past-papers/CHM-X-2026-P1' },
  { year: 2026, label: 'Paper II', href: '/past-papers/CHM-X-2026-P2' },
  chemistryX2026Notes,
];

const currentSyllabus = '/materials/ssc/chemistry/ssc-2/chemistry-ssc-full-syllabus-2025.pdf';
const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome =>
  [outcome.code, { ...outcome, unit: unit.unitNumber, topic: unit.name }] as const))));

function question(part: 1 | 2, number: string, code: string | null, stem: string, marks: number, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = code ? outcomes.get(code) : undefined;
  if (code && !outcome) throw new Error('Unknown 2026 Chemistry SLO ' + code);
  const alternative = /^[56][ab]$/.test(number);
  const level = region.cognitive_level ?? outcome?.cognitiveLevel;
  return {
    id: 'chm-x-2026-p' + part + '-q' + number, questionNumber: number, questionText: stem,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : alternative ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    marks, difficulty: level, isDiagram: Boolean(region.diagramUrl), diagramBased: Boolean(region.diagramUrl),
    topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }] : [],
    slos: outcome ? [{ slo: { code: outcome.code, description: outcome.description } }] : [],
    sourceRegion: {
      ...region,
      cognitive_level: level,
      current_syllabus_reviewed: true, syllabus_reviewed: true,
      mapping_review_source_sha256: chemistryMappingReview.syllabus.sha256,
      mapping_review_source_url: currentSyllabus,
      ...(outcome ? {
        current_slo: outcome.code,
        current_mapping: [{ code: outcome.code, description: outcome.description, topic: outcome.topic, grade: 10 }],
        mapping_scope: { board: 'AKU-EB', grade: 10, subject: 'Chemistry' },
        in_syllabus: true,
      } : { mapping_status: 'NO_DIRECT_OUTCOME' }),
      choice_instruction: alternative
        ? (number.endsWith('a') ? 'EITHER' : 'OR') + ' · Attempt one alternative for Question ' + number[0] : undefined,
    },
  };
}

const letters = ['A', 'B', 'C', 'D'];
const accepted: Record<number, string[]> = {
  23: ['A', 'C'],
  27: ['B', 'C', 'D'],
  29: ['C', 'D'],
  39: ['A', 'D'],
};
const answerNotes: Record<number, string> = {
  1: 'The digital wording compares equilibrium preference. A K꜀ value alone does not give the absolute number of product molecules.',
  5: 'This follows the aqueous states printed in the question. For solid Fe(OH)₃, the solubility product would omit the solid.',
  18: 'Formula IV is valence-invalid as printed. The digital item uses a valid branched internal alkyne. This leaves the answer unchanged.',
  23: 'Peptide bonds usually remain intact, and disulphide bonds can also survive under non-reducing conditions. Either earns credit.',
  27: 'Ozone is the standard example. Nitrogen dioxide and sulphur trioxide can also form secondarily in the atmosphere, so all three earn credit.',
  29: 'The ionosphere overlaps the altitudes of some low-Earth-orbit satellites. Both the ionosphere and exosphere earn credit.',
  34: 'This tests the origin of photosynthetic oxygen, which is covered in Class IX Biology SLO 7.2.5. There is no direct Class X Chemistry chapter SLO.',
  39: 'Roasting to form an oxide is unnecessary for an oxide ore. Bessemerisation is not a required generic extraction step either. Both earn credit.',
  40: 'The digital stem specifies the principal gaseous reducing agent. Solid carbon can participate in direct reduction in the hotter zones.',
};

const mcqs = chemistryX2026Mcqs.map(([page, code, answer, stem, rawChoices, rawReasons, figure], index) => {
  const number = index + 1;
  const choices = rawChoices.split('|');
  const reasons = rawReasons.split('|');
  return question(1, String(number), code, stem, 1, {
    pageNumber: page,
    choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
    correct_answer: answer,
    answer_origin: 'PROJECT_SOLVED',
    explanation: reasons[letters.indexOf(answer)],
    option_feedback: letters.map((letter, i) => ({ key: letter, reason: reasons[i] })),
    accepted_options: accepted[number],
    score_accepted_options: accepted[number] ? true : undefined,
    answer_review_note: answerNotes[number],
    diagramUrl: figure ? '/paper-crops/CHM-X-2026-P1/q' + number + '.webp' : undefined,
  });
});

export function chemistryX2026ResponseImage(number: string, kind: 'stronger' | 'weaker') {
  return '/paper-crops/CHM-X-2026-P2/q' + number + '-' + kind + '.webp';
}

const written = chemistryX2026Written.map(row => question(2, row.number, row.slo, row.stem, row.marks, {
  pageNumber: row.page,
  slo: row.originalSlo,
  cognitive_level: row.level,
  model_answer: row.solution,
  model_answer_origin: 'RiseLearner worked solution',
  official_marking_notes: row.hints,
  original_reference_source: chemistryX2026Notes.fileUrl + '#page=' + row.notesPage,
  original_reference_verified: true,
  mapping_reason: row.scopeNote,
  better_response_image: chemistryX2026ResponseImage(row.number, 'stronger'),
  weaker_response_image: chemistryX2026ResponseImage(row.number, 'weaker'),
}));

export const chemistryX2026Papers: PaperData[] = ([1, 2] as const).map(part => {
  const paperCode = 'CHM-X-2026-P' + part;
  const roman = part === 1 ? 'I' : 'II';
  return {
    id: paperCode, paperCode, title: 'Chemistry Class X 2026 Paper ' + roman,
    examYear: 2026, examType: 'ANNUAL', examSession: 'Annual Examination 2026',
    fileUrl: root + 'paper-' + roman.toLowerCase() + '.pdf',
    totalMarks: part === 1 ? 40 : 25, durationMinutes: part === 1 ? 70 : 110,
    rubricInstruction: part === 2 ? 'Answer all six questions. Attempt one alternative each for Questions 5 and 6.' : undefined,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'chemistry-x', name: 'Chemistry', code: 'CHM' },
    questions: part === 1 ? mcqs : written,
  };
});
