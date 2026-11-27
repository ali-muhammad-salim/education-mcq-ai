import ix from '@/data/mathematics/ssc1_exact_syllabus.json';
import x from '@/data/mathematics/ssc2_exact_syllabus.json';
import { mathematicsIx2026DuplicateKey } from './mathematicsIx2026';
import { reviewedMathematicsPapers } from './mathematicsPapers';
import type { PaperData } from './paperDataService';
import { paperChoices, paperScoringAnswers } from './paperPresentation';
import { syllabusLevel } from './syllabusPresentation';

export const mathematicsChapterSyllabus = { 9: ix, 10: x };
const modelCodes = ['MTH-IX-P1', 'MTH-IX-P2'];
export const bundledMathematicsPaperCodes = new Set([...modelCodes, ...reviewedMathematicsPapers.map(paper => paper.paperCode)]);

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
    unit.subtopics.flatMap(topic => topic.slos.map(slo => [slo.code, unit.unitNumber] as const)),
  ));
  return papers.flatMap(paper => paper.questions.flatMap(original => {
    const region = original.sourceRegion;
    if (!region.current_syllabus_reviewed || region.mapping_scope?.grade !== grade) return [];
    // A question moved to another grade can be out of its original syllabus and still have a reviewed current outcome.
    const mappings = (region.current_mapping ?? []).filter(mapping => unitByOutcome.has(mapping.code));
    const units = [...new Set(mappings.map(mapping => unitByOutcome.get(mapping.code)!))];
    const duplicate = mathematicsIx2026DuplicateKey(paper.paperCode, original.questionNumber);
    const question = duplicate ? { ...original, sourceRegion: { ...region, reviewed_duplicate_key: duplicate } } : original;
    const options = paperChoices(region.choices);
    const answers = paperScoringAnswers(region, options);
    return units.map(unit => ({
      paper, question, unit, options, answers,
      mapping: mappings.find(mapping => unitByOutcome.get(mapping.code) === unit)!,
    }));
  }));
}

export const mathematicsChapterSourcesFor = (model: (code: string) => PaperData | null | undefined, grade: 9 | 10) =>
  mathematicsChapterSources([
    ...modelCodes.flatMap(code => model(code) ?? []),
    ...reviewedMathematicsPapers,
  ], grade);
