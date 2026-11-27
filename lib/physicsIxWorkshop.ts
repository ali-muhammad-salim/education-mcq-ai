import type { QuestionData } from '@/lib/paperDataService';
import { physicsIxSyllabusMapping } from '@/lib/physicsIxAnnualMcqs';
import { physicsIxWorkshopItems } from '@/lib/physicsIxWorkshopItems';

const subjectHref = '/akueb/IX/physics';
const resourcesHref = subjectHref + '/resources/other';

export const physicsIxWorkshop = {
  title: 'Workshop MCQs',
  subjectHref,
  resourcesHref,
  href: resourcesHref + '/workshop-mcqs',
  pdf: '/materials/ssc/physics/ssc-1/workshop-mcqs.pdf',
  quizCode: 'PHY-IX-WORKSHOP',
};

const pairs: Record<string, Readonly<Record<string, string>>> = {
  'PHY-IX-2018-P1': { 10: '46' },
  'PHY-IX-2022-P1': { 32: '33' },
  'PHY-IX-2024-P1': { 36: '31' },
  'PHY-IX-2025-P1': { 38: '37' },
};

export function physicsIxWorkshopDuplicateKey(paperCode: string, number: string | number) {
  const workshopNumber = paperCode === physicsIxWorkshop.quizCode ? String(number) : pairs[paperCode]?.[number];
  return workshopNumber && ['31', '33', '37', '46'].includes(workshopNumber)
    ? 'physics-ix-workshop-q' + workshopNumber
    : undefined;
}

const stemImages = new Set('2 3 5 6 7 10 11 13 14 15 16 16a 17 18 19 21 22 25 26 27 28 29 30 31 39 41 42 47'.split(' '));
const optionImages = new Set('1 4 9 15 23 24 43 44 46 50'.split(' '));
const optionColumns: Record<string, string[]> = {
  12: ['Initial acceleration (m/s²)', 'Terminal acceleration (m/s²)'],
  25: ['Main scale (cm)', 'Vernier division', 'Least count (cm)'],
  28: ['Acceleration section', 'Deceleration section'],
};
const levels = { K: 'Remembering', U: 'Understanding', A: 'Application' } as const;

export const physicsIxWorkshopQuestions = physicsIxWorkshopItems.map(([number, pageNumber, slo, level, key, stem, options, reasons]) => {
  const mapping = physicsIxSyllabusMapping(slo);
  const crop = (suffix = '') => '/paper-crops/' + physicsIxWorkshop.quizCode + '/question-' + number + suffix + '.webp';
  const headings = optionColumns[number];
  const entries = options.split('|').map((option, index) => {
    const letter = 'ABCD'[index];
    const text = optionImages.has(number) ? '![' + option + '](' + crop('-' + letter.toLowerCase()) + ')'
      : headings ? option.split(' · ').map((cell, col) => headings[col] + ' — ' + cell).join(' · ') : option;
    return [letter, text] as const;
  });
  const choices = Object.fromEntries(entries);
  const optionFeedback = reasons.split('|').map((reason, index) => ({ key: entries[index][0], reason }));
  const diagramUrl = stemImages.has(number) ? crop() : undefined;
  const sourceRegion: QuestionData['sourceRegion'] = {
    ...mapping.sourceRegion,
    choices, correct_answer: key, explanation: optionFeedback.find(option => option.key === key)?.reason,
    option_feedback: optionFeedback, cognitive_level: level, pageNumber, diagramUrl,
    answer_origin: 'RiseLearner reviewed solution',
    reviewed_duplicate_key: physicsIxWorkshopDuplicateKey(physicsIxWorkshop.quizCode, number),
    mapping_reason: slo ? undefined : 'The calculation requires the buoyancy relationship behind Archimedes’ principle, which has no direct outcome in the current Class IX syllabus.',
  };
  return {
    ...mapping, id: physicsIxWorkshop.quizCode + '-q' + number, questionNumber: number,
    questionText: stem, questionType: 'MULTIPLE_CHOICE', marks: 1,
    sourceRegion, diagramBased: Boolean(diagramUrl || optionImages.has(number)),
    paperCode: physicsIxWorkshop.quizCode, sourceTitle: physicsIxWorkshop.title,
    sourceHref: physicsIxWorkshop.href + '#question-' + number,
    rawQuestionNumber: number, stem, options: choices, correctOption: key, diagramUrl,
    cognitiveLevel: levels[level], current_slo: slo, unitNumber: mapping.topics?.[0].topic.topicNumber,
  } satisfies QuestionData & {
    paperCode: string; sourceTitle: string; sourceHref: string; rawQuestionNumber: string;
    stem: string; options: Record<string, string>; correctOption: string; diagramUrl?: string;
    cognitiveLevel: string; current_slo: string | null; unitNumber?: number;
  };
});

export const physicsIxWorkshopChapterMcqs = physicsIxWorkshopQuestions.filter(question => question.unitNumber !== undefined);
