import chapterBank from '@/data/computer-science/chapter_wise_theory_bank.json';
import type { ChapterUnitData } from '@/components/ChapterTheoryPracticeClient';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperQuestionNumber } from '@/lib/paperPresentation';
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

function gradeNineWrittenItems() {
  return getAllStandardPapers()
    .filter(paper => /^CS-IX-(?:\d{4}-)?P2$/.test(paper.paperCode))
    .flatMap(reference => {
      const paper = getFallbackPaper(reference.paperCode);
      if (!paper) return [];

      return paper.questions.flatMap(question => {
        const meta = question.sourceRegion;
        const modelAnswer = meta.model_answer;
        if (!modelAnswer || !meta.current_syllabus_reviewed) return [];

        const outcomesByUnit = new Map<number, NonNullable<ReturnType<typeof sscComputerScienceOutcomes.get>>>();
        for (const entry of meta.current_mapping ?? []) {
          const outcome = sscComputerScienceOutcomes.get(entry.code);
          if (outcome?.grade === 9 && !outcomesByUnit.has(outcome.unitNumber)) {
            outcomesByUnit.set(outcome.unitNumber, outcome);
          }
        }

        return [...outcomesByUnit.values()].map(outcome => ({
          unitNumber: outcome.unitNumber,
          extended: question.questionType === 'EXTENDED_RESPONSE',
          item: {
            id: question.id,
            questionNumber: question.questionNumber,
            sourceTitle: paper.examType === 'MODEL_EXAM' ? 'Class IX Model Paper II' : `Class IX ${paper.examYear} Paper II`,
            sourceHref: `/past-papers/${paper.paperCode}#question-${paperQuestionNumber(question.questionNumber)}`,
            examYear: paper.examYear,
            questionText: question.questionText,
            marks: question.marks,
            cognitiveLevel: question.difficulty,
            originalSlo: meta.slo,
            currentSlo: outcome.code,
            currentSloDescription: outcome.description,
            currentTopic: outcome.topic,
            diagramUrl: meta.diagramUrl,
            choiceInstruction: meta.choice_instruction,
            rubric: meta.rubric,
            modelAnswer,
            betterResponse: meta.better_response,
            weakerResponse: meta.weaker_response,
            solutionOrigin: 'project_worked_solution',
          },
        }));
      });
    });
}

export function sscComputerScienceTheory(grade: 9 | 10): ChapterUnitData[] {
  const numericals = units.flatMap(unit => unit.numericals);
  if (grade === 9) {
    const writtenItems = gradeNineWrittenItems();
    return bank[9].map(unit => ({
      ...unit,
      crqs: writtenItems.filter(row => row.unitNumber === unit.unitNumber && !row.extended).map(row => row.item),
      erqs: writtenItems.filter(row => row.unitNumber === unit.unitNumber && row.extended).map(row => row.item),
      numericals: reviewedItems(numericals, unit.unitNumber),
    }));
  }

  const crqs = units.flatMap(unit => unit.crqs);
  const erqs = units.flatMap(unit => unit.erqs);
  return bank[grade].map(unit => ({
    ...unit,
    crqs: reviewedItems(crqs, unit.unitNumber),
    erqs: reviewedItems(erqs, unit.unitNumber),
    numericals: reviewedItems(numericals, unit.unitNumber),
  }));
}
