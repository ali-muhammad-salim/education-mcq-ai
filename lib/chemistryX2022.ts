import key from '@/data/chemistry/ssc2_2022_official_key.json';
import { combinedChemistryPaper } from './combinedChemistryPaper';
import { chemistryX2022Items } from './chemistryX2022Items';

const accepted: Record<number, string[]> = { 1: ['B', 'C'], 3: ['A', 'D'], 49: ['B', 'D'] };
const answerNotes: Record<number, string> = {
  1: 'The board lists B. C also acts as a Lewis acid when it accepts a lone pair from hydroxide to form aluminate.',
  3: 'The board lists A. Both acetic acid and hydrochloric acid are monoprotic, so D also earns credit.',
  10: 'The digital question names sodium zeolite. Some other softening methods do use organic ion-exchange resins.',
  12: 'The digital question says to remove an end hydrogen. Adding a substituent to propane would produce a substituted molecule.',
  27: 'The digital question distinguishes oxygen available to tissues from a general decrease in oxygen concentration.',
  33: 'Sedimentation is the settling step. Flocculation typically makes particles stick together before they reach the sedimentation tank.',
  36: 'The board lists C for the idealised extraction chemistry. Oxygen is generally treated as an intermediate in the school model and is consumed by the carbon anode.',
  45: 'The digital question asks specifically why platinum does not interfere with the observed colour. Platinum also resists corrosion.',
  46: 'The simplified structure in choice B represents binding of iron through phenolate oxygen. The colour-producing species are not confined to one formula under all conditions.',
  49: 'The board lists B for lime softening. Sodium carbonate can also precipitate calcium carbonate from the sample, so D earns credit.',
  50: 'The current syllabus covers evidence of chemical reactions in Class IX Stoichiometry.',
};

export const chemistryX2022 = combinedChemistryPaper(2022, key, chemistryX2022Items, answerNotes, accepted);
