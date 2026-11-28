import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import { mathematicsIx2026DuplicateKey } from './mathematicsIx2026';
import { reviewedMathematicsPapers } from './mathematicsPapers';
import { mathematicsSupplementaryPapers } from './mathematicsSupplementary';
import type { PaperData } from './paperDataService';
import { paperChoices, paperScoringAnswers } from './paperPresentation';
import { syllabusLevel } from './syllabusPresentation';
import { classXChapterReview, mathematicsChapterRepeats, removedClassXChapterMappings } from './mathematicsChapterReview';

export const mathematicsChapterSyllabus = { 9: ix, 10: x };
const modelCodes = ['MTH-IX-P1', 'MTH-IX-P2'];
export const bundledMathematicsPaperCodes = new Set([...modelCodes, ...[...reviewedMathematicsPapers, ...mathematicsSupplementaryPapers].map(paper => paper.paperCode)]);

// Paper II questions with a calculation or worked procedure. Identifiers are
// from the printed papers and include alternatives and mixed calculation parts.
const workedQuestions: Record<string, string[]> = {
  IX: ['Q.1', 'Q.2', 'Q.3', 'Q.4a', 'Q.5a', 'Q.5b', 'Q.6', 'Q.7b', 'Q.8', 'Q.9a', 'Q.9b'],
  'IX-2017': ['1a', '1b', '3', '4b', '5a', '5b', '7', '8'],
  'IX-2018': ['1a', '1b', '3', '4a', '4b', '5a', '5b', '6a', '7', '9', '10a', '10b'],
  'IX-2019': ['2', '3', '5a', '6', '7', '9a', '9b', '9c'],
  'IX-2023': ['2', '4a', '4b', '6', '8b'],
  'IX-2024': ['2', '3a', '3b', '4a', '4b', '6', '8a', '8b'],
  'IX-2025': ['2', '3a', '3b', '4a', '4b', '6', '8b'],
  'IX-2026': ['1', '2', '4a', '4b', '5a', '6', '7a', '7b', '8'],
  'X-2017': ['1a', '1b', '2', '3a', '3b', '4', '5', '6a', '6b', '7a', '8a', '8b', '9', '10'],
  'X-2018': ['1a', '1b', '2a', '3a', '3b_i', '3b_ii', '4', '5', '6b', '7b', '8a', '8b', '9', '10'],
  'X-2019': ['1a', '1b', '2', '3a', '3b', '4', '5', '6a', '7a', '8b', '9', '10'],
  'X-2023': ['1', '2a', '2b', '3a', '3b', '4', '5', '6', '7a', '7b', '8a', '8b'],
  'X-2024': ['1', '2a', '2b', '3a', '3b', '4', '5', '7a', '7b', '8a', '8b'],
  'X-2025': ['1', '2a', '2b', '3a', '3b', '4', '5', '8a'],
};

export function isMathematicsWorkedQuestion(paperCode: string, question: PaperData['questions'][number]) {
  const paper = /^MTH-((?:IX|X)(?:-\d{4})?)-P2$/.exec(paperCode)?.[1];
  return question.sourceRegion.is_numerical === true
    || (paper !== undefined && workedQuestions[paper]?.includes(question.questionNumber) === true);
}

export function mathematicsChapterCognitiveLevel(question: PaperData['questions'][number]) {
  return syllabusLevel(question.sourceRegion.cognitive_level || question.difficulty || '');
}

export function mathematicsChapterSources(papers: PaperData[], grade: 9 | 10) {
  const unitByOutcome = new Map(mathematicsChapterSyllabus[grade].flatMap(unit =>
    unit.subtopics.flatMap(topic => topic.slos.map(slo => [slo.code, {
      code: slo.code, description: slo.description, unitNumber: unit.unitNumber, topic: unit.name, grade,
    }] as const)),
  ));
  return papers.flatMap(paper => paper.questions.flatMap(original => {
    const region = original.sourceRegion;
    if (!region.current_syllabus_reviewed) return [];
    const reference = paper.paperCode + '/' + original.questionNumber;
    if (grade === 10 && removedClassXChapterMappings.has(reference)) return [];
    const primary = region.mapping_scope?.grade === grade ? region.current_mapping ?? [] : [];
    const extraCode = grade === 10 ? classXChapterReview[paper.paperCode]?.[original.questionNumber] : undefined;
    const codes = [...primary.map(mapping => mapping.code), ...(extraCode ? [extraCode] : [])];
    const mappings = new Map<number, NonNullable<ReturnType<typeof unitByOutcome.get>>>();
    for (const code of codes) {
      const outcome = unitByOutcome.get(code);
      if (outcome && !mappings.has(outcome.unitNumber)) mappings.set(outcome.unitNumber, outcome);
    }
    if (!mappings.size) return [];
    const duplicate = mathematicsChapterRepeats.get(reference) ?? mathematicsIx2026DuplicateKey(paper.paperCode, original.questionNumber);
    const question = duplicate ? { ...original, sourceRegion: { ...region, reviewed_duplicate_key: duplicate } } : original;
    const options = paperChoices(region.choices);
    const answers = paperScoringAnswers(region, options);
    return [...mappings].map(([unit, mapping]) => ({ paper, question, unit, options, answers, mapping }));
  }));
}

export const mathematicsChapterSourcesFor = (model: (code: string) => PaperData | null | undefined, grade: 9 | 10) =>
  mathematicsChapterSources([
    ...modelCodes.flatMap(code => model(code) ?? []),
    ...reviewedMathematicsPapers,
    ...mathematicsSupplementaryPapers,
  ], grade);
