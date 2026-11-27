import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import manifest from '@/data/mathematics/ssc2_model_source_manifest.json';
import { mathematicsXModelMcqs } from './mathematicsXModelMcqs';
import { mathematicsXModelWritten } from './mathematicsXModelWritten';
import type { PaperData, QuestionData } from './paperDataService';

export const mathematicsXModelTabs = [
  { label: 'Model Paper I', href: '/past-papers/MTH-X-P1' },
  { label: 'Model Paper II', href: '/past-papers/MTH-X-P2' },
  { label: 'Formula sheet (PDF)', href: manifest.sources.p1.url + '#page=2' },
];

const outcomes = new Map(([9, 10] as const).flatMap(grade =>
  (grade === 9 ? ix : x).flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(slo =>
    [slo.code, { code: slo.code, description: slo.description, topic: unit.name, unitNumber: unit.unitNumber, grade }] as const,
  ))),
));

const cropPaths = new Set(manifest.crops.map(crop => crop.url));
const labels = ['A', 'B', 'C', 'D'];
const reviewNotes: Record<number, string> = {
  3: 'The digital question specifies the missing condition that a is nonzero.',
  6: 'The printed paper calls the given equation quadratic, but it is linear. The digital question preserves the equation and asks for the same rearrangement.',
  12: 'The digital version specifies that b is nonnegative so the square root is real.',
  31: 'The digital question asks for the strict comparison because “greater than or equal to” would overlap with “greater than” if option D is read as an inclusive inequality.',
  39: 'More than one option is possible, so the question is excluded from scored practice.',
};

function question(part: 1 | 2, number: string, marks: number, slo: string, stem: string, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = outcomes.get(slo);
  if (!outcome) throw new Error('Unknown model-paper SLO ' + slo);
  const crop = '/paper-crops/MTH-X-P' + part + '/q' + number + '.webp';
  const diagramUrl = cropPaths.has(crop) ? crop : undefined;
  return {
    id: 'mth-x-p' + part + '-q' + number, questionNumber: number, questionText: stem, marks,
    questionType: part === 1 ? 'MULTIPLE_CHOICE' : 'CONSTRUCTED_RESPONSE',
    difficulty: region.cognitive_level, diagramBased: Boolean(diagramUrl), isDiagram: Boolean(diagramUrl),
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unitNumber } }],
    slos: [{ slo: { code: slo, description: outcome.description } }],
    sourceRegion: {
      ...region, diagramUrl, current_slo: slo, current_mapping: [outcome],
      current_syllabus_reviewed: true, syllabus_reviewed: true,
      mapping_scope: { board: 'AKU-EB', subject: 'Mathematics', grade: outcome.grade },
      in_syllabus: outcome.grade === 10, out_of_syllabus: outcome.grade !== 10,
      mapping_status: outcome.grade === 10 ? 'MAPPED' : 'MOVED_TO_GRADE_IX',
    },
  };
}

const mcqs = mathematicsXModelMcqs.map(([page, slo, level, key, stem, options, explanation], index) => {
  const choices = options.split('|');
  const number = index + 1;
  if (choices.length !== 4 || (key && !labels.includes(key))) throw new Error('Invalid model-paper question ' + number);
  return question(1, String(number), 1, slo, stem, {
    pageNumber: page, cognitive_level: level,
    choices: Object.fromEntries(labels.map((letter, index) => [letter, choices[index]])),
    correct_answer: key || undefined, answer_origin: key ? 'PROJECT_SOLVED' : undefined,
    single_answer_review_required: !key, answer_review_note: reviewNotes[number], explanation,
  });
});

const written = mathematicsXModelWritten.map(([number, page, marks, slo, worked, stem, solution]) => {
  const alternative = /[ab]$/.test(number);
  return question(2, number, marks, slo, stem, {
    pageNumber: page, cognitive_level: 'A', model_answer: solution,
    model_answer_origin: 'RiseLearner worked solution', is_numerical: worked,
    choice_group: alternative ? number[0] : undefined,
    choice_instruction: alternative ? 'Attempt one alternative for Question ' + number[0] + '.' : undefined,
  });
});

export const mathematicsXModelPapers: PaperData[] = ([1, 2] as const).map(part => {
  const paperCode = 'MTH-X-P' + part;
  return {
    id: paperCode, paperCode, title: 'Mathematics (Science Group) Class X Model Paper ' + (part === 1 ? 'I' : 'II') + ' (2027 onwards)',
    examYear: 2027, examType: 'MODEL_EXAM', examSession: 'Model Examination 2027 and onwards',
    fileUrl: (part === 1 ? manifest.sources.p1 : manifest.sources.p2).url,
    printedCode: 'Mathematics (Science Group) Model Paper X',
    totalMarks: part === 1 ? 45 : 30, durationMinutes: part === 1 ? 80 : 100,
    rubricInstruction: part === 2 ? 'Answer all nine questions. Choose one alternative each for Questions 4, 5 and 8.' : undefined,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'mathematics-x', name: 'Mathematics', code: 'MTH' },
    questions: part === 1 ? mcqs : written,
  };
});
