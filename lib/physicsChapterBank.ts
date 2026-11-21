import bank from '@/data/physics/chapter_wise_theory_bank.json';
import supplements from '@/data/physics/ssc2_unit17_resources.json';
import { physicsUnit17Resource } from '@/lib/physicsUnit17Resources';

export const physicsChapterBank = {
  ...bank,
  '10': bank['10'].map(unit => unit.unitNumber === physicsUnit17Resource.unit ? {
    ...unit,
    crqs: [...unit.crqs, ...supplements.crqs.map(question => ({
      ...question,
      solutionOrigin: 'supplied_resource',
    }))],
    numericals: [...unit.numericals, ...supplements.numericals],
  } : unit),
};
