import type { PaperData, QuestionData } from './paperDataService';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import ix2022 from '@/data/biology/ssc1_2022_past_mcqs.json';
import ix2024 from '@/data/biology/ssc1_2024_past_mcqs.json';
import ix2024Written from '@/data/biology/ssc1_2024_written.json';
import x2022 from '@/data/biology/ssc2_2022_past_mcqs.json';
import x2023 from '@/data/biology/ssc2_2023_past_mcqs.json';
import x2023Written from '@/data/biology/ssc2_2023_written.json';
import x2025 from '@/data/biology/ssc2_2025_past_mcqs.json';
import x2025Written from '@/data/biology/ssc2_2025_written.json';
import modelMcqs from '@/data/biology/ssc_model_mcqs.json';
import modelWritten from '@/data/biology/ssc_model_written.json';
import { biology2022PdfRoot, biology2024PdfRoot, biologyX2022PdfRoot, biologyX2023PdfRoot, biologyX2025PdfRoot } from './biology2024Resources';

// Mirror the reviewed annual/model import contracts without importing their DB entry points.
const outcomes = ([9, 10] as const).flatMap(grade => syllabus[grade].flatMap(unit =>
  unit.subtopics.flatMap(st => st.slos.map(slo => ({ ...slo, grade, topic: unit.name, unitNumber: unit.unitNumber })))));

type Mcq = {
  number: string; page: number; stem: string; choices: string[]; code: string;
  answer: string | null; explanation: string; feedback: string[]; diagramUrl?: string | null;
  diagram?: boolean; originalSlo?: string; originalLevel?: string; officialAnswer?: string;
  answerStatus?: string; answerOrigin?: string; answerReviewNote?: string | null;
};
type Written = [string, number, number, string, string, number, string, string, string];
type ModelWritten = [string, number, number, string[], string, string, number[]?];
type Spec = { roman: 'IX' | 'X'; year: number; root: string; mcqs: Mcq[]; written: Written[]; figures: string[]; alternativeQuestions?: string[] };

function mapping(codes: string[], grade?: number, basePairing = false) {
  return codes.map(code => {
    // The published syllabus repeats 16.2.4. The 2022 Q49 calculation uses the E outcome.
    const matches = outcomes.filter(o => o.code === code && (!grade || o.grade === grade) && (!basePairing || o.cognitiveLevel === 'E'));
    if (matches.length !== 1) throw new Error(`Missing or ambiguous Biology mapping: ${code}`);
    return matches[0];
  });
}

function question(paperCode: string, number: string, text: string, marks: number,
  linked: ReturnType<typeof mapping>, meta: QuestionData['sourceRegion'], mcq: boolean, extended: boolean): QuestionData {
  const first = linked[0];
  return {
    id: `${paperCode.toLowerCase()}-q${number}`, questionNumber: number, questionText: text, marks,
    questionType: mcq ? 'MULTIPLE_CHOICE' : extended ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE',
    difficulty: meta.cognitive_level, isDiagram: Boolean(meta.diagramUrl), diagramBased: Boolean(meta.diagramUrl),
    sourceRegion: {
      ...meta, current_slo: first.code, current_mapping: linked.map(o => ({
        code: o.code, description: o.description, topic: o.topic, grade: o.grade,
      })),
      current_syllabus_reviewed: true, syllabus_reviewed: true, in_syllabus: true,
      mapping_scope: { board: 'AKU-EB', grade: first.grade, subject: 'Biology' },
    },
    topics: linked.map(o => ({ topic: { name: o.topic, topicNumber: o.unitNumber } })),
    slos: linked.map(o => ({ slo: { code: o.code, description: o.description } })),
  };
}

function mcqMeta(row: Mcq, model: boolean): QuestionData['sourceRegion'] {
  return {
    choices: Object.fromEntries(row.choices.map((choice, i) => ['ABCD'[i], choice])),
    correct_answer: row.answer || undefined, solved_correct_option: row.answer,
    explanation: row.explanation, option_feedback: row.feedback.map((reason, i) => ({ key: 'ABCD'[i], reason })),
    answer_status: row.answerStatus ?? (row.answer ? model ? 'PROJECT_SOLVED' : 'OFFICIAL_CONFIRMED' : 'KEY_CONFLICT'),
    answer_origin: row.answerOrigin ?? (row.answer ? model ? 'PROJECT_SOLVED' : 'OFFICIAL_KEY_VERIFIED' : undefined),
    answer_review_note: row.answerReviewNote ?? (row.answer ? undefined : row.explanation),
    pageNumber: row.page,
  };
}

function paper(roman: 'IX' | 'X', year: number, model: boolean, part: number, fileUrl: string, questions: QuestionData[]): PaperData {
  const code = `BIO-${roman}-${model ? 'MODEL-' : ''}${year}-P${part}`;
  return {
    id: code, paperCode: code, title: `Biology Class ${roman} ${model ? 'Model' : year} Paper ${part === 1 ? 'I' : 'II'}`,
    examYear: year, examSession: model ? 'Model Examination' : 'Annual Examination',
    examType: model ? 'MODEL_EXAM' : 'ANNUAL', fileUrl,
    academicClass: { name: `Class ${roman}`, level: roman === 'IX' ? 9 : 10 },
    subject: { id: `biology-${roman.toLowerCase()}`, name: 'Biology', code: 'BIO' }, questions,
  };
}

const annualSpecs: Spec[] = [
  { roman: 'IX', year: 2022, root: biology2022PdfRoot, mcqs: ix2022, written: [], figures: [] },
  { roman: 'IX', year: 2024, root: biology2024PdfRoot, mcqs: ix2024, written: ix2024Written as Written[], figures: ['4', '6b', '7b'], alternativeQuestions: ['6a', '6b', '7a', '7b'] },
  { roman: 'X', year: 2022, root: biologyX2022PdfRoot, mcqs: x2022, written: [], figures: [] },
  { roman: 'X', year: 2023, root: biologyX2023PdfRoot, mcqs: x2023, written: x2023Written as Written[], figures: ['1', '3', '5b'], alternativeQuestions: ['5a', '5b', '6a', '6b'] },
  { roman: 'X', year: 2025, root: biologyX2025PdfRoot, mcqs: x2025, written: x2025Written as Written[], figures: ['3'], alternativeQuestions: ['5a', '5b', '6a', '6b'] },
];

const annualPapers = annualSpecs.flatMap(spec => {
  const { roman, year, root } = spec;
  const prefix = `BIO-${roman}-${year}`;
  const mcqs = spec.mcqs.map(row => question(`${prefix}-P1`, row.number, row.stem, 1,
    mapping([row.code], undefined, roman === 'X' && year === 2022 && row.number === '49'), {
      ...mcqMeta(row, false), official_answer: row.officialAnswer, slo: row.originalSlo,
      original_cognitive_level: row.originalLevel,
      cognitive_level: row.originalLevel === 'K' ? 'R' : row.originalLevel,
      original_reference_source: root + 'keys.pdf', original_reference_verified: true,
      diagramUrl: row.diagramUrl || undefined,
      assessmentSection: year === 2022 ? Number(row.number) <= 40 ? 'Theory' : 'Alternate to Practical' : undefined,
      mapping_reason: roman === 'X' && ((year === 2023 && row.number === '23') || (year === 2022 && row.number === '24'))
        ? 'Plant tropisms apply the broader stimulus-and-response outcome. The current syllabus has no separately named tropism outcome.' : undefined,
    }, true, false));
  const written = spec.written.map(([number, page, marks, code, originalSlo, notesPage, text, answer, notes]) =>
    question(`${prefix}-P2`, number, text, marks, mapping([code]), {
      pageNumber: page, model_answer: answer, model_answer_origin: 'Project worked solution',
      official_marking_notes: notes, slo: originalSlo,
      cognitive_level: year === 2023 ? number === '4' ? 'A' : 'U' : year === 2025 ? ({ '1': 'R', '4': 'A' } as Record<string, string>)[number] ?? 'U' : number === '2' ? 'A' : 'U',
      original_cognitive_level: year === 2023 ? ({ '1': 'U*', '4': 'A' } as Record<string, string>)[number] ?? 'U' : year === 2025 ? ({ '1': 'K*', '2a': 'U*', '4': 'A*' } as Record<string, string>)[number] ?? 'U' : number === '1' ? 'U*' : number === '2' ? 'A' : 'U',
      original_reference_source: root + 'emarking.pdf#page=' + notesPage, original_reference_verified: true,
      better_response_image: root + `emarking-q${number}-stronger.png`,
      weaker_response_image: root + `emarking-q${number}-weaker.png`,
      diagramUrl: spec.figures.includes(number) ? root + `paper-ii-q${number}.png` : undefined,
      choice_instruction: spec.alternativeQuestions?.includes(number) ? `${number.endsWith('a') ? 'EITHER' : 'OR'} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
    }, false, spec.alternativeQuestions?.includes(number) ?? false));
  return [paper(roman, year, false, 1, root + 'paper-i.pdf', mcqs),
    ...(written.length ? [paper(roman, year, false, 2, root + 'paper-ii.pdf', written)] : [])];
});

const modelPapers = (['IX', 'X'] as const).flatMap(roman => {
  const grade = roman === 'IX' ? 9 : 10;
  const year = grade === 9 ? 2026 : 2027;
  return [1, 2].map(part => {
    const code = `BIO-${roman}-MODEL-${year}-P${part}`;
    const stem = `/materials/ssc/biology/biology-model-paper-${roman.toLowerCase()}-paper-${part === 1 ? 'i' : 'ii'}`;
    const questions = part === 1 ? modelMcqs[roman].map(row => {
      const linked = mapping([row.code], grade);
      return question(code, row.number, row.stem, 1, linked, {
        ...mcqMeta(row, true), cognitive_level: linked[0].cognitiveLevel,
        diagramUrl: row.diagram ? stem + '-q' + row.number + '.png' : undefined,
      }, true, false);
    }) : (modelWritten[roman] as ModelWritten[]).map(([number, page, marks, codes, text, answer, crop]) => {
      const linked = mapping(codes, grade);
      const alternative = /[ab]$/.test(number);
      return question(code, number, text, marks, linked, {
        pageNumber: page, model_answer: answer, model_answer_origin: 'Project worked solution',
        cognitive_level: linked[0].cognitiveLevel,
        diagramUrl: crop ? stem + '-q' + number + '.png' : undefined,
        choice_instruction: alternative ? `${number.endsWith('a') ? 'EITHER' : 'OR'} · Attempt one alternative for Question ${parseInt(number, 10)}` : undefined,
      }, false, alternative);
    });
    return paper(roman, year, true, part, stem + '.pdf', questions);
  });
});

export const additionalBiologyPapers: PaperData[] = [...annualPapers, ...modelPapers];
