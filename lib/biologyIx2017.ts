import key from '@/data/biology/ssc1_2017_official_key.json';
import { biologyIxAnnual } from './biologyIxAnnual';
import { biologyIx2017Mcqs } from './biologyIx2017Mcqs';
import { biologyIx2017Written } from './biologyIx2017Written';

export const biologyIx2017 = biologyIxAnnual(2017, key, biologyIx2017Mcqs, biologyIx2017Written, [35, 145], 40, {
  4: { note: 'The original stem describes scientific laws as impossible to reject. The digital wording asks students to identify a law. Scientific laws can be refined when new evidence changes their scope.' },
  8: { note: 'The printed clues describe two life stages. The fern sporophyte is vascular, and its gametophyte has rhizoids.' },
  10: { duplicateKey: 'akueb-biology-ix-osmosis-u-tube' },
  21: { note: 'The printed option D makes a claim specifically about carbohydrates. The table compares total energy needs. Digital option D states the inference supported by the data.' },
  23: { duplicateKey: 'akueb-biology-ix-wilted-plant-recovery' },
});
