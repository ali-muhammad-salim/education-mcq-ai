import syllabusIX from '@/data/chemistry/ssc1_exact_syllabus.json';
import syllabusX from '@/data/chemistry/ssc2_exact_syllabus.json';
import chemistryReview from '@/data/chemistry/reviewed_syllabus_mappings_2025.json';
import type { PaperData, QuestionData } from './paperDataService';

export type CombinedChemistryItem = [page: number, slo: string | null, stem: string, options: string, reasons: string, figure?: string];
type OfficialKey = { sourceUrl: string; entries: { questionNumber: number; answer: string; slo?: string; cognitiveLevel: string }[] };
const root = '/materials/ssc/chemistry/ssc-2/';
const letters = ['A', 'B', 'C', 'D'];
const reviewedDuplicates: Record<string, Record<number, string>> = {
  'CHM-X-P1': { 6: 'silver-chloride-precipitation', 17: 'pentadiene-name' },
  'CHM-X-2017-P1': { 4: 'silver-chloride-precipitation', 5: 'basic-lead-salt', 10: 'pentadiene-name', 15: 'dextrose-use', 17: 'lightning-nitric-oxide', 20: 'dental-fluorosis' },
  'CHM-X-2018-P1': { 7: 'carboxyl-structure', 13: 'protein-elements', 14: 'sugar-hydrolysis', 21: 'agricultural-runoff', 23: 'solvay-brine' },
  'CHM-X-2021-P1': { 12: 'carboxyl-structure', 22: 'sugar-hydrolysis', 32: 'agricultural-runoff' },
  'CHM-X-2022-P1': { 8: 'basic-lead-salt', 16: 'dextrose-use', 17: 'protein-elements', 25: 'lightning-nitric-oxide', 35: 'dental-fluorosis', 39: 'solvay-brine' },
};

export function chemistryXDuplicateKey(paperCode: string, questionNumber: string | number) {
  const key = reviewedDuplicates[paperCode]?.[Number(questionNumber)];
  return key ? 'chemistry-x-' + key : undefined;
}

export const chemistryOutcomes = new Map([syllabusIX, syllabusX].flatMap((units, index) =>
  units.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome =>
    [outcome.code, { ...outcome, grade: index + 9, unit: unit.unitNumber, topic: unit.name }] as const)))));

export function combinedChemistryPaper(
  year: number, key: OfficialKey, items: CombinedChemistryItem[],
  answerNotes: Record<number, string>, accepted: Record<number, string[]> = {}, durationMinutes = 100,
) {
  const paperCode = 'CHM-X-' + year + '-P1';
  const crops = '/paper-crops/' + paperCode + '/';
  const tabs = [
    { year, label: 'Paper I', href: '/past-papers/' + paperCode },
    { year, label: 'Official answer key', href: '/resources/chemistry-x-' + year + '-key' },
  ];

  const questions = items.map(([page, code, stem, rawChoices, rawReasons, figure], index): QuestionData => {
    const { questionNumber, answer, slo, cognitiveLevel } = key.entries[index];
    const outcome = code ? chemistryOutcomes.get(code) : undefined;
    if (code && !outcome) throw new Error('Unknown ' + year + ' Chemistry SLO ' + code);
    const descriptions = rawChoices.split('|');
    const choices = figure === 'choices'
      ? letters.map((letter, i) => '![' + (descriptions[i] || 'Choice ' + letter) + '](' + crops + 'q' + questionNumber + '-' + letter.toLowerCase() + '.webp)')
      : descriptions;
    const reasons = rawReasons.split('|');
    const difficulty = cognitiveLevel === 'K' ? 'R' : cognitiveLevel;
    return {
      id: paperCode.toLowerCase() + '-q' + questionNumber, questionNumber: String(questionNumber), questionText: stem,
      questionType: 'MULTIPLE_CHOICE', marks: 1, difficulty, diagramBased: Boolean(figure), isDiagram: Boolean(figure),
      topics: outcome ? [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }] : [],
      slos: outcome ? [{ slo: { code: outcome.code, description: outcome.description } }] : [],
      sourceRegion: {
        pageNumber: page,
        assessmentSection: items.length > 40 ? (questionNumber <= 40 ? 'Theory' : 'Alternate to Practical') : undefined,
        choices: Object.fromEntries(letters.map((letter, i) => [letter, choices[i]])),
        correct_answer: answer, official_answer: answer, answer_origin: 'OFFICIAL_KEY_VERIFIED',
        accepted_options: accepted[questionNumber],
        score_accepted_options: accepted[questionNumber] ? true : undefined,
        answer_review_note: answerNotes[questionNumber],
        explanation: reasons[letters.indexOf(answer)],
        option_feedback: letters.map((letter, i) => ({ key: letter, reason: reasons[i] })),
        slo, original_cognitive_level: cognitiveLevel, cognitive_level: difficulty,
        original_reference_verified: true, original_reference_source: key.sourceUrl,
        current_syllabus_reviewed: true, syllabus_reviewed: true,
        reviewed_duplicate_key: chemistryXDuplicateKey(paperCode, questionNumber),
        ...(outcome ? {
          current_slo: outcome.code,
          current_mapping: [{ code: outcome.code, description: outcome.description, topic: outcome.topic, grade: outcome.grade }],
          mapping_scope: { board: 'AKU-EB', grade: outcome.grade, subject: 'Chemistry' },
          in_syllabus: true,
          mapping_review_source_sha256: chemistryReview.syllabus.sha256,
          mapping_review_source_url: '/materials/ssc/chemistry/ssc-' + (outcome.grade - 8) + '/chemistry-ssc-full-syllabus-2025.pdf',
        } : { mapping_status: 'NO_DIRECT_OUTCOME', mapping_reason: answerNotes[questionNumber] }),
        diagramBased: Boolean(figure),
        diagramUrl: figure && figure !== 'choices' ? crops + figure + '.webp' : undefined,
      },
    };
  });

  const paper: PaperData = {
    id: paperCode, paperCode, title: 'Chemistry Class X ' + year + ' Paper I',
    examYear: year, examType: 'ANNUAL', examSession: 'Annual Examination ' + year,
    fileUrl: root + 'chemistry-x-' + year + '-paper-i.pdf',
    totalMarks: questions.length, durationMinutes,
    academicClass: { name: 'Class X', level: 10 },
    subject: { id: 'chemistry-x', name: 'Chemistry', code: 'CHM' },
    questions,
  };

  return { key, tabs, paper };
}
