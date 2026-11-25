import key from '@/data/chemistry/ssc2_2019_official_key.json';
import { combinedChemistryPaper } from './combinedChemistryPaper';
import { chemistryX2019Items } from './chemistryX2019Items';
import { chemistryX2019Written } from './chemistryX2019Written';
import { chemistryXWrittenPaper } from './chemistryXWrittenPaper';

export const chemistryX2019 = combinedChemistryPaper(2019, key, chemistryX2019Items, {
  3: 'The question uses the school convention for powers of molar concentration. A thermodynamic equilibrium constant uses dimensionless activities.',
  11: 'The digital question asks which statement about alkanes is false. The original phrasing treated several properties as explanations for the same observation.',
  13: 'The printed comparison could imply that mitochondria lack RNA. The digital wording asks about DNA itself. Both DNA and RNA occur in mitochondria.',
  15: 'The current Class X Chemistry syllabus has no direct chapter SLO on distinguishing dietary trace minerals from major minerals.',
  16: 'The digital question distinguishes saturation of the fatty-acid chains from partial hydrogenation, which can leave some double bonds.',
  17: 'The digital question asks for the toxic product favoured by incomplete combustion. Carbon dioxide can also be present in an actual exhaust mixture.',
}, {}, 40);

export const {
  paper: chemistryX2019PaperII, notes: chemistryX2019Notes,
  tabs: chemistryX2019Tabs, responseImage: chemistryX2019ResponseImage,
} = chemistryXWrittenPaper(chemistryX2019, chemistryX2019Written, 140);
