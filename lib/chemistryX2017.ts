import key from '@/data/chemistry/ssc2_2017_official_key.json';
import { combinedChemistryPaper } from './combinedChemistryPaper';
import { chemistryX2017Items } from './chemistryX2017Items';
import { chemistryX2017Written } from './chemistryX2017Written';
import { chemistryXWrittenPaper } from './chemistryXWrittenPaper';

export const chemistryX2017 = combinedChemistryPaper(2017, key, chemistryX2017Items, {
  2: 'The board uses powers of molar concentration to report K꜀ units. The thermodynamic equilibrium constant uses dimensionless activities.',
  6: 'The printed chart simplifies the indicator transition ranges. The intended sulphur dioxide solution is acidic enough for both indicators to appear red.',
  9: 'The digital wording specifies molecular organic compounds that do not ionise. Some organic compounds form ions and can conduct in solution.',
  20: 'The board keyed A as weakening of teeth. The digital choice describes dental fluorosis more precisely: changes in enamel appearance, with pitting possible in severe cases.',
  23: 'The printed key gives C. The digital stem asks for the initial preparation step. Gravity separation, flotation and magnetic separation are chosen according to the ore and have no universal sequence.',
  25: 'The digital wording specifies sulphide impurities, the reactants intended by the question.',
}, {}, 35);

export const {
  paper: chemistryX2017PaperII, notes: chemistryX2017Notes,
  tabs: chemistryX2017Tabs, responseImage: chemistryX2017ResponseImage,
} = chemistryXWrittenPaper(chemistryX2017, chemistryX2017Written, 145);
