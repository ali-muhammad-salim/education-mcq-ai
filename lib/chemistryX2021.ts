import key from '@/data/chemistry/ssc2_2021_official_key.json';
import { combinedChemistryPaper } from './combinedChemistryPaper';
import { chemistryX2021Items } from './chemistryX2021Items';

export const chemistryX2021 = combinedChemistryPaper(2021, key, chemistryX2021Items, {
  5: 'The board lists C. Under the definition that an Arrhenius base increases hydroxide concentration in water, B and D also qualify in practice.',
  10: 'The 2025 Chemistry syllabus discusses safety in its practical guidance on PDF page 44. It has no numbered chapter SLO for choosing this hazard pictogram.',
  18: 'The 2025 Class X Chemistry syllabus has no direct outcome on identifying dietary zinc from its functions. The digital question adds the role of zinc in taste to make the original clues more specific.',
  26: 'The current syllabus covers the definition of allotropy in Class IX States of Matter.',
  31: 'The original paper says water dissolves all ionic compounds. The digital question says many, since some ionic solids are only sparingly soluble.',
  35: 'This question tests transpiration, covered by Class IX Biology SLO 9.2.5. There is no direct Chemistry chapter SLO for it.',
  37: 'The digital question covers products of the refining chain. Grease and petroleum wax generally require processing beyond the distillation tower.',
  40: 'Petroleum-derived feedstocks can supply hydrogen. The original item lists oil, but natural gas and other hydrogen sources also exist.',
  42: 'The current syllabus covers conversion to molarity in Class IX Solutions.',
}, { 5: ['B', 'C', 'D'] });
