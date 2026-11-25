import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import type { PaperData, QuestionData } from './paperDataService';

export type BiologyIxMcq = [page: number, slo: string, stem: string, choices: string, reasons: string, diagram?: true | 'choices'];
export type BiologyIxWritten = {
  number: string; page: number; notesPage: number; code: string | null; marks: number;
  stem: string; solution: string; hints: string; figure?: true; scopeNote?: string;
};

const outcomes = new Map(([9, 10] as const).flatMap(grade => syllabus[grade].flatMap(unit =>
  unit.subtopics.flatMap(topic => topic.slos.map(slo =>
    [slo.code, { ...slo, grade, unit: unit.unitNumber, topic: unit.name }] as const)))));

function mappedQuestion(year: number, part: 1 | 2, number: string, code: string | null, questionText: string, marks: number, region: QuestionData['sourceRegion']): QuestionData {
  const outcome = code ? outcomes.get(code) : undefined;
  if (code && !outcome) throw new Error('Unknown Class IX Biology SLO ' + code);
  const questionType = part === 1 ? 'MULTIPLE_CHOICE' : /^[89]/.test(number) ? 'EXTENDED_RESPONSE' : 'CONSTRUCTED_RESPONSE';
  return {
    id: 'bio-ix-' + year + '-p' + part + '-q' + number,
    questionNumber: number,
    questionText,
    questionType,
    marks,
    difficulty: region.cognitive_level ?? outcome?.cognitiveLevel,
    isDiagram: Boolean(region.diagramUrl || region.diagramBased),
    diagramBased: Boolean(region.diagramUrl || region.diagramBased),
    topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }] : [],
    slos: outcome ? [{ slo: { code: outcome.code, description: outcome.description } }] : [],
    sourceRegion: {
      cognitive_level: outcome?.cognitiveLevel,
      ...region,
      ...(outcome ? {
        current_slo: outcome.code,
        current_mapping: [{ code: outcome.code, description: outcome.description, topic: outcome.topic, grade: outcome.grade }],
        mapping_scope: { board: 'AKU-EB', grade: outcome.grade, subject: 'Biology' },
        in_syllabus: true,
      } : { mapping_status: 'NO_DIRECT_OUTCOME' }),
      current_syllabus_reviewed: true,
      syllabus_reviewed: true,
    },
  };
}

export function biologyIxAnnual(
  year: number, key: { number: number; answer: string; level: string }[], items: BiologyIxMcq[],
  writtenItems: BiologyIxWritten[], minutes: [number, number], writtenMarks: number,
  reviews: Record<number, { note?: string; accepted?: string[]; duplicateKey?: string }>,
) {
  const root = '/materials/ssc/biology/ssc-1/biology-ix-' + year + '-';
  const crops = (part: 1 | 2) => '/paper-crops/BIO-IX-' + year + '-P' + part + '/';
  const notes = { year, label: 'E-marking notes', href: '/resources/biology-ix-' + year + '-emarking', fileUrl: root + 'emarking.pdf' };
  const tabs = [
    { year, label: 'Paper 1', href: '/past-papers/BIO-IX-' + year + '-P1' },
    { year, label: 'Paper 2', href: '/past-papers/BIO-IX-' + year + '-P2' },
    { year, label: 'Paper 1 keys', href: '/resources/biology-ix-' + year + '-key' },
    notes,
  ];

  const letters = ['A', 'B', 'C', 'D'];
  const mcqs = items.map(([page, code, stem, rawChoices, rawReasons, figure], index) => {
    const { number, answer, level } = key[index];
    const choices = figure === 'choices'
      ? letters.map(letter => '![Diagram ' + letter + '](' + crops(1) + 'q' + number + '-' + letter.toLowerCase() + '.webp)')
      : rawChoices.split('|');
    const reasons = rawReasons.split('|');
    const review = reviews[number];
    const accepted = review?.accepted;
    return mappedQuestion(year, 1, String(number), code, stem, 1, {
      pageNumber: page,
      choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
      correct_answer: answer,
      official_answer: answer,
      accepted_options: accepted,
      score_accepted_options: accepted ? true : undefined,
      answer_origin: 'OFFICIAL_KEY_VERIFIED',
      original_reference_verified: true,
      original_reference_source: root + 'keys.pdf',
      original_cognitive_level: level,
      cognitive_level: level === 'K' ? 'R' : level,
      explanation: reasons[letters.indexOf(answer)],
      option_feedback: letters.map((letter, i) => ({ key: letter, reason: reasons[i] })),
      answer_review_note: review?.note,
      reviewed_duplicate_key: review?.duplicateKey,
      diagramBased: Boolean(figure),
      diagramUrl: figure === true ? crops(1) + 'q' + number + '.webp' : undefined,
    });
  });

  const responseImage = (number: string, kind: 'stronger' | 'weaker') => crops(2) + 'q' + number + '-' + kind + '.webp';

  const written = writtenItems.map(row => mappedQuestion(year, 2, row.number, row.code, row.stem, row.marks, {
    pageNumber: row.page,
    model_answer: row.solution,
    model_answer_origin: 'RiseLearner worked solution',
    official_marking_notes: row.hints,
    mapping_reason: row.scopeNote,
    original_reference_source: notes.fileUrl + '#page=' + row.notesPage,
    original_reference_verified: true,
    better_response_image: responseImage(row.number, 'stronger'),
    weaker_response_image: responseImage(row.number, 'weaker'),
    diagramUrl: row.figure ? crops(2) + 'q' + row.number + '.webp' : undefined,
    choice_instruction: /^[89]/.test(row.number)
      ? (row.number.endsWith('a') ? 'EITHER' : 'OR') + ' Â· Attempt one alternative for Question ' + row.number[0] : undefined,
  }));

  const papers: PaperData[] = ([1, 2] as const).map(part => {
    const paperCode = 'BIO-IX-' + year + '-P' + part;
    return {
      id: paperCode, paperCode, title: 'Biology Class IX ' + year + ' Paper ' + (part === 1 ? 'I' : 'II'),
      examYear: year, examType: 'ANNUAL', examSession: 'April / May ' + year,
      fileUrl: root + (part === 1 ? 'paper-i.pdf' : 'paper-ii.pdf'),
      totalMarks: part === 1 ? mcqs.length : writtenMarks,
      durationMinutes: minutes[part - 1],
      rubricInstruction: part === 2 ? 'Answer all nine questions. Attempt one alternative each for Questions 8 and 9.' : undefined,
      academicClass: { name: 'Class IX', level: 9 },
      subject: { id: 'biology-ix', name: 'Biology', code: 'BIO' },
      questions: part === 1 ? mcqs : written,
    };
  });

  return { key, notes, tabs, responseImage, papers, writtenItems };
}
