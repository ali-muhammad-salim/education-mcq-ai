export type BiologyWritten = {
  number: string;
  page: number;
  notesPage: number;
  marks: number;
  code: string;
  boardCode?: string;
  stem: string;
  solution: string;
  hints: string;
  stronger: string;
  weaker: string;
  figure?: boolean;
};

export const biologyIx2026Written: BiologyWritten[] = [
  {
    number: '1', page: 2, notesPage: 2, marks: 2, code: '1.3.1',
    stem: 'The Nile tilapia, a fish native to Africa, was introduced in Pakistan for fish farming. It spread into rivers and lakes and affected native aquatic life. Relate the case to biogeography in two points.',
    solution: '1. Introducing the fish moved it beyond its natural geographic range.\n2. Its spread into new freshwater habitats affected the distribution and survival of native species, for example through competition for food or space.',
    hints: 'Award one mark for each valid connection to geographic distribution or its ecological effects.',
    stronger: 'Connects human introduction to a change in range and explains an effect on native aquatic communities.',
    weaker: 'Retells the introduction without linking it to species distribution, or assumes that the fish was already native to Pakistan.',
  },
  {
    number: '2', page: 2, notesPage: 3, marks: 2, code: '2.1.3',
    stem: 'A student investigated the effect of different amounts of fertiliser on the yield of three potted tomato plants kept under identical water, light and soil conditions. Identify the dependent variable and control group.\n\n| Plant | Fertiliser (g) | Tomatoes produced |\n| --- | ---: | ---: |\n| I | 0 | 4 |\n| II | 5 | 9 |\n| III | 10 | 12 |',
    solution: 'The dependent variable is the number of tomatoes produced. Plant I, which received 0 g of fertiliser, is the control.',
    hints: 'One mark for the dependent variable and one for the control group.',
    stronger: 'Identifies the count measured and the untreated comparison plant.',
    weaker: 'Names the fertiliser dose as the dependent variable or selects a fertilised plant as the control.',
  },
  {
    number: '3', page: 2, notesPage: 5, marks: 2, code: '3.7.7',
    stem: 'The table compares three species. Identify the taxonomic class of (i) humans and cats and (ii) frogs.\n\n| Species | Backbone | Warm-blooded | Hair or fur | Mammary glands |\n| --- | --- | --- | --- | --- |\n| Human | Yes | Yes | Yes | Yes |\n| Frog | Yes | No | No | No |\n| Cat | Yes | Yes | Yes | Yes |',
    solution: 'Humans and cats belong to Mammalia. Frogs belong to Amphibia.',
    hints: 'One mark for each class.',
    stronger: 'Gives the two class names at the requested taxonomic rank.',
    weaker: 'Answers with generic terms such as vertebrate, an individual species name, or the wrong class.',
  },
  {
    number: '4', page: 3, notesPage: 7, marks: 2, code: '6.2.2', boardCode: '6.2.3', figure: true,
    stem: 'Catalase breaks down hydrogen peroxide into water and oxygen. A student measured the oxygen collected at different pH values. (a) Plot the data on the given grid. (b) Write a conclusion.\n\n| pH | Oxygen collected (cm³) |\n| ---: | ---: |\n| 2 | 1 |\n| 4 | 12 |\n| 6 | 20 |\n| 8 | 24 |\n| 10 | 8 |\n| 12 | 4 |',
    solution: 'a. Put pH on the horizontal axis and volume of oxygen (cm³) on the vertical axis. Plot (2, 1), (4, 12), (6, 20), (8, 24), (10, 8) and (12, 4).\n\nb. Oxygen production rises up to pH 8 and falls above it. Catalase showed its highest activity at pH 8 among the values tested.',
    hints: 'One mark for the correctly plotted graph and one for a conclusion supported by the graph.',
    stronger: 'Plots the paired values accurately and identifies the highest measured activity.',
    weaker: 'Misplots values or calls an acidic or strongly alkaline pH optimal despite the measured peak.',
  },
  {
    number: '5', page: 4, notesPage: 9, marks: 3, code: '7.3.3', figure: true,
    stem: 'The graph shows how light intensity affects the rate of photosynthesis. Deduce the limiting factor at each point X, Y and Z.',
    solution: 'X: light intensity. The rate rises as light increases.\n\nY: temperature. At the same carbon dioxide concentration, the warmer curve plateaus at a higher rate.\n\nZ: carbon dioxide concentration. At the same temperature, increasing carbon dioxide raises the plateau.',
    hints: 'One mark per correctly identified limiting factor.',
    stronger: 'Uses the initial rise and compares curves that differ in only one of the plotted conditions.',
    weaker: 'Assigns light to the plateaus or swaps temperature and carbon dioxide without comparing the curves.',
  },
  {
    number: '6', page: 4, notesPage: 10, marks: 2, code: '9.5.5',
    stem: 'A patient with blood group B needs a transfusion. The available blood types are A, AB and O. (a) Which can be transfused in the ABO red-cell example? (b) Why are the other groups incompatible?',
    solution: 'a. Group O red cells lack A and B antigens.\n\nb. A and AB red cells carry A antigen, which reacts with anti-A antibodies in the group B recipient and can cause agglutination. The examination question is about ABO compatibility. Actual transfusion also requires compatibility checks.',
    hints: 'One mark for O and one for the anti-A and A-antigen explanation.',
    stronger: 'Names O and correctly identifies the recipient antibody and donor antigen.',
    weaker: 'Chooses AB or describes donor and recipient antibodies in the wrong direction.',
  },
  {
    number: '7a', page: 5, notesPage: 12, marks: 6, code: '4.2.1',
    stem: 'The cytoskeleton consists of fibrous proteins in the cytoplasm. Describe one structural feature and one function of each: (i) microtubules, (ii) microfilaments and (iii) intermediate filaments.',
    solution: '| Fibre | Structural feature | Function |\n| --- | --- | --- |\n| Microtubules | Hollow tubes made of tubulin | Form spindle fibres that move chromosomes during cell division |\n| Microfilaments | Thin filaments made of actin | Support changes in cell shape and cell movement |\n| Intermediate filaments | Rope-like fibres made from proteins such as keratin | Resist mechanical stress and help maintain cell shape |',
    hints: 'One structure mark and one function mark for each fibre.',
    stronger: 'Distinguishes the three fibres by composition or form and assigns a specific function to each.',
    weaker: 'Gives the same generic function for all fibres or confuses actin and tubulin.',
  },
  {
    number: '7b', page: 5, notesPage: 14, marks: 6, code: '5.3.5',
    stem: 'Explain how (i) oxygen moves from the alveoli into the blood and then into body tissues and (ii) carbon dioxide moves from the blood into the alveoli.',
    solution: 'i. Oxygen diffuses from alveolar air, where its partial pressure is higher, across the thin alveolar and capillary walls. Haemoglobin carries it as oxyhaemoglobin. Oxygen is released at tissues and diffuses into cells with a lower oxygen partial pressure.\n\nii. Cells produce carbon dioxide, which enters the blood. Much of it travels as bicarbonate. In the lungs bicarbonate is converted back to carbon dioxide, which diffuses from blood into alveoli down its partial-pressure gradient and is exhaled.',
    hints: 'Three marks for the oxygen pathway and three for the carbon dioxide pathway.',
    stronger: 'Traces the route, states the direction of both gradients, and distinguishes transport in blood from diffusion.',
    weaker: 'Describes ventilation alone or reverses the direction of oxygen or carbon dioxide movement.',
  },
  {
    number: '8a', page: 6, notesPage: 17, marks: 6, code: '8.5.2',
    stem: 'Jamal has diarrhoea, dehydration and an electrolyte imbalance. His large intestine is not functioning properly. (i) Explain how this can lead to dehydration and an electrolyte imbalance. (ii) Give three dietary changes that can help manage these effects in the scenario.',
    solution: 'i. The large intestine normally reabsorbs water and salts. Reduced water absorption leaves more water in the faeces. Frequent watery stools cause net losses of both water and electrolytes, including sodium and potassium.\n\nii. Examples discussed in the board notes are replacing lost water, using oral rehydration solution to replace water and salts, and including appropriate electrolyte-containing foods. These measures address fluid and nutrient losses. The cause of the bowel problem determines treatment.',
    hints: 'One mark each for three physiological effects and one mark each for three relevant dietary changes.',
    stronger: 'Links the loss of absorptive function to watery stools and specific fluid or salt losses.',
    weaker: 'Attributes the whole scenario to infection without explaining absorption, or gives unrelated lifestyle changes.',
  },
  {
    number: '8b', page: 6, notesPage: 19, marks: 6, code: '9.8.5',
    stem: 'Use the table to answer the following. (i) Identify the individual with the highest risk of coronary heart disease and explain why. (ii) Identify an individual with long-term risk and explain why. (iii) Suggest two lifestyle changes to reduce that individual’s risk.\n\n| Individual | Diet | Physical activity | Smoking |\n| --- | --- | --- | --- |\n| I | High in saturated fats | Sedentary | Smokes |\n| II | Low in saturated fats | Active | Non-smoker |\n| III | Balanced diet | Sedentary | Smokes |\n| IV | High in sugar and low in fibre | Active | Non-smoker |',
    solution: 'i. Individual I has the greatest overall risk because a high-saturated-fat diet, inactivity and smoking combine.\n\nii. Individual III has long-term risk from smoking and inactivity. Individual IV is also accepted if the answer explains the longer-term effects of a high-sugar, low-fibre diet.\n\niii. For III, stop smoking and increase regular physical activity. For IV, reduce added sugar and increase fibre-rich foods.',
    hints: 'For (i) and (ii), award one mark for identification and one for a reason. In (ii), the notes accept either III or IV with a valid reason. Award one mark per appropriate change in (iii).',
    stronger: 'Explains why combined risks matter and chooses changes that address the selected person’s habits.',
    weaker: 'Lists a person without explaining the pattern or offers changes unrelated to that person’s stated risk factors.',
  },
];
