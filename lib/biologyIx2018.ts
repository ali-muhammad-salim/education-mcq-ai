import key from '@/data/biology/ssc1_2018_official_key.json';
import { biologyIxAnnual } from './biologyIxAnnual';
import { biologyIx2018Mcqs } from './biologyIx2018Mcqs';
import { biologyIx2018Written } from './biologyIx2018Written';

export const biologyIx2018 = biologyIxAnnual(2018, key, biologyIx2018Mcqs, biologyIx2018Written, [35, 145], 40, {
  8: { accepted: ['B', 'C'], note: 'The board keys C. Chloroplasts also produce ATP in the light-dependent reactions, so B earns credit in practice.' },
  10: { note: 'The percentages follow the paper’s simplified convention. Clinical 0.9% isotonic saline refers to sodium chloride, rather than a 0.9% sucrose solution.' },
  22: { duplicateKey: 'akueb-biology-ix-emulsification-diagram' },
});
