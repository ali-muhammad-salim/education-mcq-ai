import bank from '@/data/physics/chapter_wise_theory_bank.json';
import supplements from '@/data/physics/ssc2_unit17_resources.json';
import { physicsUnit17Resource } from '@/lib/physicsUnit17Resources';
import { physicsIx2026ChapterWritten } from '@/lib/physicsIx2026Papers';
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
  '10': bank['10'].map(unit => unit.unitNumber === physicsUnit17Resource.unit ? {
    ...unit,
    crqs: [...unit.crqs, ...supplements.crqs.map(question => ({
      ...question,
      solutionOrigin: 'supplied_resource',
    }))],
    numericals: [...unit.numericals, ...supplements.numericals],
  } : unit),
};
