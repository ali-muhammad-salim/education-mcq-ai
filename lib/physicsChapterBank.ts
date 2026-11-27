import bank from '@/data/physics/chapter_wise_theory_bank.json';
import supplements from '@/data/physics/ssc2_unit17_resources.json';
import { physicsUnit17Resource } from '@/lib/physicsUnit17Resources';
import { physicsIx2026ChapterWritten } from '@/lib/physicsIx2026Papers';
import { physicsX2017ChapterWritten } from '@/lib/physicsX2017Papers';
import { physicsX2018ChapterWritten } from '@/lib/physicsX2018Papers';
import { physicsX2019ChapterWritten } from '@/lib/physicsX2019Papers';
import { physicsX2023ChapterWritten } from '@/lib/physicsX2023Papers';
import { physicsX2024ChapterWritten } from '@/lib/physicsX2024Papers';
import { physicsX2026ChapterWritten } from '@/lib/physicsX2026Papers';
import { physicsIx2023ChapterWritten } from '@/lib/physicsIx2023Papers';
import { physicsIx2019ChapterWritten } from '@/lib/physicsIx2019Papers';
import { physicsIx2018ChapterWritten } from '@/lib/physicsIx2018Papers';
import { physicsIx2017ChapterWritten } from '@/lib/physicsIx2017Papers';

const repeatedModelQuestions: Record<string, string[]> = {
  'PHY-IX-2019-P2-q1': ['u1-2025-class-ix-model-paper-ii-q1'],
  'PHY-IX-2019-P2-q9a': ['u2-2025-class-ix-model-paper-ii-q6(a)', 'u2-comp-erq-2'],
};

export const physicsChapterBank = {
  ...bank,
  '9': bank['9'].map(unit => {
    const questions = [...physicsIx2026ChapterWritten, ...physicsIx2023ChapterWritten, ...physicsIx2019ChapterWritten, ...physicsIx2018ChapterWritten, ...physicsIx2017ChapterWritten].filter(question => question.unitNumber === unit.unitNumber);
    const duplicateIds = new Set(questions.flatMap(question => repeatedModelQuestions[question.id] ?? []));
    const reviewedQuestions = questions.map(question => {
      const duplicates = repeatedModelQuestions[question.id];
      if (!duplicates) return question;
      const additionalSources = [...unit.crqs, ...unit.erqs]
        .filter(item => duplicates.includes(item.id) && item.sourceHref.startsWith('/past-papers/'))
        .map(item => ({ title: item.sourceTitle, href: item.sourceHref }));
      return { ...question, additionalSources };
    });
    return {
      ...unit,
      crqs: [...unit.crqs.filter(question => !duplicateIds.has(question.id)), ...reviewedQuestions.filter(question => !question.extended)],
      erqs: [...unit.erqs.filter(question => !duplicateIds.has(question.id)), ...reviewedQuestions.filter(question => question.extended)],
    };
  }),
  '10': bank['10'].map(unit => {
    const annual = [...physicsX2026ChapterWritten, ...physicsX2024ChapterWritten, ...physicsX2023ChapterWritten, ...physicsX2019ChapterWritten, ...physicsX2018ChapterWritten, ...physicsX2017ChapterWritten].filter(question => question.unitNumber === unit.unitNumber);
    const fissionCopy = annual.some(question => question.id === 'PHY-X-2019-P2-q8')
      ? annual.find(question => question.id === 'PHY-X-2024-P2-q5')
      : undefined;
    const reviewed = annual.filter(question => question !== fissionCopy).map(question =>
      fissionCopy && question.id === 'PHY-X-2019-P2-q8'
        ? { ...question, additionalSources: [{ title: fissionCopy.sourceTitle, href: fissionCopy.sourceHref }] }
        : question);
    const hasSupplement = unit.unitNumber === physicsUnit17Resource.unit;
    return {
      ...unit,
      crqs: [...unit.crqs, ...reviewed.filter(question => !question.extended), ...(hasSupplement ? supplements.crqs.map(question => ({
        ...question, solutionOrigin: 'supplied_resource',
      })) : [])],
      erqs: [...unit.erqs, ...reviewed.filter(question => question.extended)],
      numericals: [...unit.numericals, ...reviewed.filter(question => question.numerical).map(question => ({
        ...question, problem: question.questionText, solution: question.modelAnswer,
      })), ...(hasSupplement ? supplements.numericals : [])],
    };
  }),
};
