import chapterBank from '@/data/computer-science/chapter_wise_theory_bank.json';
import type { ChapterUnitData } from '@/components/ChapterTheoryPracticeClient';
import { getFallbackPaper } from '@/lib/paperDataService';
import { sscComputerScienceOutcomes } from '@/lib/sscComputerScienceSyllabus';

const bank = chapterBank as unknown as Record<9 | 10, ChapterUnitData[]>;
const units = [...bank[9], ...bank[10]];

function reviewedItems<T extends { sourceHref: string; id: string; currentSlo?: string }>(items: T[], unitNumber: number) {
  return [...new Map(items.map(item => [item.sourceHref, item])).values()].flatMap(item => {
    const reference = /^\/past-papers\/(CS-[^#]+)#question-(\d+)/.exec(item.sourceHref);
    if (!reference) return [];
    const [, paperCode, questionNumber] = reference;
    const question = getFallbackPaper(paperCode)?.questions.find(q => String(q.questionNumber).replace(/^Q\.?/i, '') === questionNumber);
    if (!question) return [];
    const outcomes = question.sourceRegion.current_mapping ?? [];
    const previous = sscComputerScienceOutcomes.get(item.currentSlo || '');
    const outcome = (previous?.unitNumber === unitNumber && outcomes.some(entry => entry.code === previous.code) ? previous : undefined)
      ?? outcomes.map(entry => sscComputerScienceOutcomes.get(entry.code)).find(entry => entry?.unitNumber === unitNumber);
    if (!outcome) return [];
    return [{ ...item, currentSlo: outcome.code, currentSloDescription: outcome.description, currentTopic: outcome.topic, inSyllabus: true, outOfSyllabus: false }];
  });
}

export function sscComputerScienceTheory(grade: 9 | 10): ChapterUnitData[] {
  const crqs = units.flatMap(unit => unit.crqs);
  const erqs = units.flatMap(unit => unit.erqs);
  const numericals = units.flatMap(unit => unit.numericals);
  return bank[grade].map(unit => ({
    ...unit,
    crqs: reviewedItems(crqs, unit.unitNumber),
    erqs: reviewedItems(erqs, unit.unitNumber),
    numericals: reviewedItems(numericals, unit.unitNumber),
  }));
}
