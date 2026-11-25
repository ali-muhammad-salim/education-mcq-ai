import key from '@/data/chemistry/ssc2_2018_official_key.json';
import { combinedChemistryPaper } from './combinedChemistryPaper';
import { chemistryX2018Items } from './chemistryX2018Items';
import { chemistryX2018Written } from './chemistryX2018Written';
import { chemistryXWrittenPaper } from './chemistryXWrittenPaper';

export const chemistryX2018 = combinedChemistryPaper(2018, key, chemistryX2018Items, {
  3: 'The board uses powers of molar concentration for K꜀ units. The thermodynamic equilibrium constant instead uses dimensionless activities.',
  4: 'The board assumes the excess carbonate consumes the hydrochloric acid and that the gas has escaped before the litmus test.',
  22: 'The current Chemistry syllabus specifies dehydrohalogenation of 1,2-dihalides and dehalogenation of tetrahalides. It does not include the calcium carbide route to ethyne.',
  25: 'The board key gives B. The original option refers to ammonium carbamate, which is involved in urea synthesis. The digital option describes the evaporator, where heat removes water from the urea solution.',
}, {}, 35);

export const {
  paper: chemistryX2018PaperII, notes: chemistryX2018Notes,
  tabs: chemistryX2018Tabs, responseImage: chemistryX2018ResponseImage,
} = chemistryXWrittenPaper(chemistryX2018, chemistryX2018Written, 145);
