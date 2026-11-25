import key from '@/data/biology/ssc1_2019_official_key.json';
import { biologyIxAnnual } from './biologyIxAnnual';
import { biologyIx2019Mcqs } from './biologyIx2019Mcqs';
import { biologyIx2019Written } from './biologyIx2019Written';

export const biologyIx2019 = biologyIxAnnual(2019, key, biologyIx2019Mcqs, biologyIx2019Written, [45, 135], 35, {
  6: { accepted: ['A', 'C'], note: 'The board keys C. A also fits because yeasts can be unicellular fungi with cell walls.' },
  8: { duplicateKey: 'akueb-biology-ix-osmosis-u-tube' },
  27: { note: 'The printed choice B says molecules. Emulsification disperses fat droplets without splitting their molecules.' },
  28: { accepted: ['C', 'D'], note: 'The board keys C. D also fits the wording because xylem vessels conduct water drawn up by transpiration pull.' },
});
