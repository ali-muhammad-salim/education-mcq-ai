type Item = {
  number: string; page: number; notesPage: number; code: string; marks: number;
  stem: string; solution: string; hints: string; figure?: true;
};

export const biologyIx2019Written: Item[] = [
  {
    number: '1a', page: 2, notesPage: 2, code: '1.6.2', marks: 1,
    stem: 'Differentiate between micromolecules and macromolecules.',
    solution: 'Micromolecules have low molecular masses. Macromolecules have high molecular masses.',
    hints: 'Distinguish these groups by molecular mass. The quantity the body needs is a separate issue.',
  },
  {
    number: '1b', page: 2, notesPage: 3, code: '1.6.2', marks: 2,
    stem: 'Classify starch, water, oxygen and haemoglobin as micromolecules or macromolecules.',
    solution: '| Micromolecules | Macromolecules |\n| --- | --- |\n| Water and oxygen | Starch and haemoglobin |',
    hints: 'Water and oxygen have low molecular masses. Starch is a polysaccharide and haemoglobin is a protein.',
  },
  {
    number: '2', page: 3, notesPage: 4, code: '15.4.4', marks: 3, figure: true,
    stem: 'The figure shows three test tubes used to investigate seed germination. Seeds in tube I are expected to germinate. Explain why the seeds in (a) tube I germinate, (b) tube II fail to germinate and (c) tube III fail to germinate. Each part is worth 1 mark.',
    solution: '**a.** Tube I supplies moisture, oxygen and a suitable temperature for these seeds.\n\n**b.** At 2°C, enzyme activity and metabolism are too slow for germination under the given conditions.\n\n**c.** Boiling removes dissolved oxygen and the oil limits its return. The seeds lack enough oxygen for aerobic respiration.',
    hints: 'Identify the condition that differs in each comparison and explain its effect on germination.',
  },
  {
    number: '3', page: 4, notesPage: 6, code: '17.5.1', marks: 3,
    stem: 'List three human activities that cause deforestation.',
    solution: '1. Clearing forest for farming or cattle grazing.\n2. Logging trees for timber.\n3. Clearing forest to build roads, housing or other infrastructure.',
    hints: 'Give three distinct activities that remove forest cover. Habitat loss is a possible consequence.',
  },
  {
    number: '4', page: 4, notesPage: 8, code: '4.4.2', marks: 3, figure: true,
    stem: 'The diagrams show two forms of the same amoeba. Which form, I or II, is expected to have the greater surface area? Explain using the diagram.',
    solution: 'Form II. Its long pseudopodia and irregular outline extend the cell membrane. Compared with the more compact form I, these projections expose more membrane surface for a comparable cell volume.',
    hints: 'Link the greater surface area to the membrane extensions visible in form II.',
  },
  {
    number: '5', page: 5, notesPage: 10, code: '5.3.1', marks: 3,
    stem: 'Give one advantage of each feature of the human respiratory system. (a) C-shaped rings in the tracheal wall. (b) A single layer of epithelial cells in the alveolar wall. (c) Mucus production in the bronchi. Each part is worth 1 mark.',
    solution: '**a.** The cartilage rings support the trachea and prevent collapse during breathing.\n\n**b.** A one-cell-thick wall gives gases a short diffusion distance.\n\n**c.** Mucus traps dust and microbes so they can be moved away from the lungs.',
    hints: 'State a functional advantage for every structure. Relate the thin alveolar wall to gas exchange.',
  },
  {
    number: '6', page: 5, notesPage: 11, code: '6.2.2', marks: 2, figure: true,
    stem: 'The graph shows the activity of a human enzyme at different pH values. Give two interpretations supported by the graph.',
    solution: '1. The enzyme’s activity is greatest at about pH 8.\n2. Activity declines as the pH moves away from pH 8 on either side.',
    hints: 'Use the peak and the pattern on its two sides. The graph alone does not establish the enzyme’s identity.',
  },
  {
    number: '7', page: 6, notesPage: 12, code: '9.6.1', marks: 3,
    stem: 'Explain these blood vessel adaptations. (a) Veins have valves. (b) Capillaries have a wall one cell thick. (c) Arteries have thicker muscular walls than veins. Each part is worth 1 mark.',
    solution: '**a.** Valves prevent low-pressure venous blood from flowing backwards.\n\n**b.** A short diffusion path allows rapid exchange between the blood and tissues.\n\n**c.** Thick walls withstand the higher pressure of blood pumped from the heart.',
    hints: 'Connect each structure to its own function. Use blood pressure when comparing the artery and vein walls.',
  },
  {
    number: '8a', page: 7, notesPage: 15, code: '4.2.2', marks: 7,
    stem: 'A bacterial cell is prokaryotic and a plant cell is eukaryotic. Give three similarities and four differences between these cell types.',
    solution: 'Both have a plasma membrane, cytoplasm and ribosomes.\n\n| Feature | Typical bacterial cell | Typical plant cell |\n| --- | --- | --- |\n| Nucleus | DNA lies in a nucleoid | DNA is enclosed in a nucleus |\n| Organelles | No membrane-bound organelles | Has membrane-bound organelles such as mitochondria |\n| Cell wall | Usually contains peptidoglycan | Mainly contains cellulose |\n| Chromosomes | Usually one main circular chromosome | Multiple linear nuclear chromosomes |',
    hints: 'Compare matched features of the two cells. Give three shared structures and four paired differences.',
  },
  {
    number: '8b', page: 7, notesPage: 18, code: '7.3.2', marks: 7,
    stem: '(i) Write a balanced chemical equation for photosynthesis (1 mark). (ii) Explain how the three main limiting factors affect its rate (6 marks).',
    solution: '**i.** 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ in the presence of light and chlorophyll.\n\n**ii. Light intensity.** More light supplies more energy for the light-dependent reactions until another factor limits the rate. **Carbon dioxide concentration.** More CO₂ supplies more substrate for carbon fixation until another factor limits it. **Temperature.** Low temperature slows enzyme-controlled reactions. The rate rises towards an optimum and falls above it as enzyme function is impaired.',
    hints: 'Balance the equation and explain the effect of all three factors on the rate.',
  },
  {
    number: '9a', page: 9, notesPage: 22, code: '8.4.2', marks: 8,
    stem: 'Describe two structural features of the stomach (4 marks) and two of the small intestine (4 marks). Explain how each feature helps the organ function.',
    solution: '**Stomach.** Thick muscular layers churn food and mix it with gastric juice. Gastric glands secrete acid and enzyme precursors that help digest protein.\n\n**Small intestine.** Villi and microvilli provide a large area for absorption. The thin epithelial lining of each villus provides a short path for absorbed nutrients to enter transport vessels.',
    hints: 'Name two structures for each organ and link each structure to its digestive or absorptive function.',
  },
  {
    number: '9b', page: 9, notesPage: 25, code: '9.2.4', marks: 8,
    stem: 'Explain how transpiration pull transports water from the roots through the xylem to the leaves.',
    solution: 'Water evaporates from moist mesophyll cell surfaces and diffuses out through stomata. Water drawn from the leaf xylem replaces it, creating tension in the xylem. Cohesion between water molecules transmits that tension down the continuous water column. Adhesion helps the column maintain contact with xylem walls. Water is pulled up through the stem, and water entering root hairs by osmosis moves to the root xylem to replace it.',
    hints: 'Follow the causal chain from evaporation in the leaves to uptake at the roots. Explain how a continuous water column transmits tension.',
  },
];
