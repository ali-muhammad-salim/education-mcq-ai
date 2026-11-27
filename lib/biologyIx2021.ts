import key from '@/data/biology/ssc1_2021_official_key.json';
import type { PaperData, QuestionData } from './paperDataService';
import { biologyIx2021Items } from './biologyIx2021Items';
import { sscBiologySyllabus } from './sscBiologySyllabus';

const code = 'BIO-IX-2021-P1';
const root = '/materials/ssc/biology/ssc-1/biology-ix-2021-';
const figures = '/paper-crops/BIO-IX-2021-P1/';
const letters = ['A', 'B', 'C', 'D'];
export const biologyIx2021Key = key;
export const biologyIx2021Tabs = [
  { year: 2021, label: 'Paper 1', href: '/past-papers/' + code },
  { year: 2021, label: 'Paper 1 keys', href: '/resources/biology-ix-2021-key' },
];

const syllabus = sscBiologySyllabus('akueb', 9, 'biology')!;
const outcomes = new Map(syllabus.units.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(slo =>
  [slo.code, { ...slo, unit: unit.unitNumber, topic: unit.name }] as const))));

const questions = biologyIx2021Items.map(([page, outcomeCode, stem, choices, reasons, figure], index): QuestionData => {
  const row = key[index];
  const num = row.number;
  const outcome = outcomes.get(outcomeCode);
  if (!outcome) throw new Error('Unknown 2021 Biology outcome: ' + outcomeCode);
  const imageChoices = !choices;
  const options = imageChoices
    ? letters.map(letter => `![Diagram ${letter}](${figures}q${num}-${letter.toLowerCase()}.webp)`)
    : choices.split('|');
  const feedback = reasons.split('|');
  const accepted = row.alternate ? [row.answer, row.alternate].sort() : num === 29 ? ['C', 'D'] : undefined;
  return {
    id: `bio-ix-2021-p1-q${num}`,
    questionNumber: String(num),
    questionText: stem,
    questionType: 'MULTIPLE_CHOICE',
    marks: 1,
    difficulty: row.level === 'K' ? 'R' : row.level,
    isDiagram: Boolean(figure || imageChoices),
    diagramBased: Boolean(figure || imageChoices),
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    slos: [{ slo: { code: outcomeCode, description: outcome.description } }],
    sourceRegion: {
      pageNumber: page,
      choices: Object.fromEntries(letters.map((letter, i) => [letter, options[i]])),
      correct_answer: row.answer,
      official_answer: row.alternate ? [row.answer, row.alternate].join(',') : row.answer,
      official_alternate_answer: row.alternate ?? undefined,
      accepted_options: accepted,
      score_accepted_options: accepted ? true : undefined,
      answer_origin: 'OFFICIAL_KEY_VERIFIED',
      answer_review_note: num === 29 ? 'The board key lists C. The quiz also accepts D because the small intestine physically emulsifies fat as well as chemically digesting food.'
        : num === 39 ? 'AKU-EB published D as the main answer and A as the alternate. Either earns credit.' : undefined,
      explanation: feedback[letters.indexOf(row.answer)],
      option_feedback: letters.map((letter, i) => ({ key: letter, reason: feedback[i] })),
      original_reference_verified: true,
      original_reference_source: root + 'keys.pdf',
      assessmentSection: num <= 40 ? 'Theory' : 'Alternate to Practical',
      slo: row.originalSlo,
      original_cognitive_level: row.level,
      current_slo: outcomeCode,
      current_mapping: [{ code: outcomeCode, topic: outcome.topic, description: outcome.description, grade: 9 }],
      mapping_scope: { board: 'AKU-EB', grade: 9, subject: 'Biology' },
      current_syllabus_reviewed: true,
      reviewed_duplicate_key: num === 31 ? 'akueb-biology-ix-emulsification-diagram'
        : num === 35 ? 'akueb-biology-ix-wilted-plant-recovery' : undefined,
      syllabus_reviewed: true,
      in_syllabus: true,
      cognitive_level: row.level === 'K' ? 'R' : row.level,
      diagramBased: Boolean(figure || imageChoices),
      diagramUrl: figure ? `${figures}q${num}.webp` : undefined,
    },
  };
});

export const biologyIx2021Paper: PaperData = {
  id: code,
  paperCode: code,
  title: 'Biology Class IX 2021 Paper I',
  examYear: 2021,
  examType: 'ANNUAL',
  examSession: 'Annual Examination 2021',
  totalMarks: 50,
  durationMinutes: 100,
  fileUrl: root + 'paper-i.pdf',
  academicClass: { name: 'Class IX', level: 9 },
  subject: { id: 'biology-ix', name: 'Biology', code: 'BIO' },
  questions,
};
