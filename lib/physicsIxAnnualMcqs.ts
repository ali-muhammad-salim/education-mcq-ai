import syllabus from '@/data/physics/ssc1_exact_syllabus.json';
import syllabusX from '@/data/physics/ssc2_exact_syllabus.json';
import type { QuestionData } from '@/lib/paperDataService';

interface AnnualMcq {
  stem: string;
  options: string[];
  officialSlo?: string;
  officialAnswer: string;
  key: string;
  cognitive: string;
  slo: string | null;
  reasons: string[];
  explanation?: string;
  reviewNote?: string;
  acceptedOptions?: string[];
  headings?: string[];
  diagram?: boolean;
  optionDiagrams?: boolean;
  assessmentSection?: string;
  pageNumber?: number;
  mappingReason?: string;
  reviewedDuplicateKey?: string;
}

const choices = ['A', 'B', 'C', 'D'];
const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome => [
  outcome.code, { description: outcome.description, topic: unit.name, unit: unit.unitNumber },
] as const))));
const outcomesX = new Map(syllabusX.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(outcome => [
  outcome.code, { description: outcome.description, topic: unit.name, unit: unit.unitNumber },
] as const))));

export function physicsIxSyllabusMapping(code: string | null, grade: 9 | 10 = 9) {
  const scope = { board: 'AKU-EB', grade, subject: 'Physics' };
  const reviewed = { current_syllabus_reviewed: true, mapping_scope: scope };
  if (!code) {
    return { sourceRegion: { ...reviewed, current_slo: null, out_of_syllabus: true, mapping_status: 'NO_DIRECT_OUTCOME' } };
  }

  const outcome = (grade === 10 ? outcomesX : outcomes).get(code);
  if (!outcome) throw new Error('Unknown Class ' + grade + ' Physics SLO ' + code);
  return {
    topics: [{ topic: { name: outcome.topic, topicNumber: outcome.unit } }],
    sourceRegion: {
      ...reviewed, current_slo: code,
      current_mapping: [{ code, description: outcome.description, topic: outcome.topic }],
    },
  };
}

export function physicsIxAnnualMcqs(rows: AnnualMcq[], paperCode: string, keyHref: string, grade: 9 | 10 = 9): QuestionData[] {
  const crop = (suffix: string | number) => '/paper-crops/' + paperCode + '/question-' + suffix + '.webp';
  return rows.map((row, index) => {
    const number = index + 1;
    const headings = row.headings;
    const options = row.options.map((option, i) => {
      if (row.optionDiagrams) return '![' + option + '](' + crop(number + '-' + choices[i].toLowerCase()) + ')';
      return headings ? option.split(' · ').map((cell, column) => headings[column] + ' — ' + cell).join(' · ') : option;
    });
    const table = headings ? [
      '| Option | ' + headings.join(' | ') + ' |',
      '| --- | ' + headings.map(() => '---').join(' | ') + ' |',
      ...row.options.map((option, i) => '| ' + choices[i] + ' | ' + option.split(' · ').join(' | ') + ' |'),
    ].join('\n') : undefined;
    const syllabusMapping = physicsIxSyllabusMapping(row.slo, grade);
    return {
      ...syllabusMapping, id: paperCode + '-q' + number, questionNumber: String(number),
      questionText: table ? row.stem + '\n\n' + table : row.stem,
      questionType: 'MULTIPLE_CHOICE', marks: 1, diagramBased: Boolean(row.diagram || row.optionDiagrams),
      sourceRegion: {
        ...syllabusMapping.sourceRegion,
        choices: Object.fromEntries(choices.map((letter, i) => [letter, options[i]])),
        option_feedback: choices.map((key, i) => ({ key, reason: row.reasons[i] })),
        correct_answer: row.key, official_answer: row.officialAnswer,
        explanation: row.explanation ?? row.reasons[choices.indexOf(row.key)],
        accepted_options: row.acceptedOptions,
        score_accepted_options: row.acceptedOptions ? true : undefined,
        answer_status: row.key === row.officialAnswer ? undefined : 'ANSWER_CORRECTED',
        answer_review_note: row.reviewNote,
        quiz_stem: table ? row.stem : undefined,
        slo: row.officialSlo, original_cognitive_level: row.cognitive, cognitive_level: row.cognitive,
        original_reference_verified: true, original_reference_source: keyHref,
        diagramUrl: row.diagram ? crop(number) : undefined,
        assessmentSection: row.assessmentSection,
        pageNumber: row.pageNumber,
        mapping_reason: row.mappingReason,
        reviewed_duplicate_key: row.reviewedDuplicateKey,
      },
    };
  });
}

const cognitiveLabels: Record<string, string> = { K: 'Remembering', U: 'Understanding', A: 'Application' };

export function physicsIxAnnualAnswerKey(rows: AnnualMcq[]) {
  return rows.map((row, i) => ({
    number: i + 1, letter: row.officialAnswer, slo: row.officialSlo, level: row.cognitive,
  }));
}

export function physicsIxAnnualChapterMcqs(questions: QuestionData[], paperCode: string, examYear: number) {
  return questions.map(question => ({
    ...question, paperCode, sourceTitle: examYear + ' · Annual · Paper 1', examYear,
    rawQuestionNumber: Number(question.questionNumber),
    cognitiveLevel: cognitiveLabels[question.sourceRegion.cognitive_level ?? ''],
    stem: question.sourceRegion.quiz_stem ?? question.questionText,
    options: question.sourceRegion.choices,
    correctOption: question.sourceRegion.correct_answer,
    diagramUrl: question.sourceRegion.diagramUrl,
    current_slo: question.sourceRegion.current_slo,
    unitNumber: question.topics?.[0].topic.topicNumber,
  }));
}
