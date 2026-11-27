type WrittenItem = {
  number: string; page: number; notesPage: number; marks: number; originalSlo: string;
  slo: string | null; level: 'U' | 'A'; stem: string; solution: string; hints: string; scopeNote?: string;
};

export const chemistryX2026Written: WrittenItem[] = [
  {
    number: '1', page: 2, notesPage: 3, marks: 4, originalSlo: '9.3.7 (9.3.6)', slo: '9.3.6', level: 'A',
    stem: 'PCl₃(g) + Cl₂(g) ⇌ PCl₅(g), ΔH = −124 kJ/mol.\n\n(a) Explain each shift at equilibrium (2 marks).\n\n| Change | Observed shift |\n| --- | --- |\n| Increase in temperature | Left |\n| Increase in pressure by compression | Right |\n\n(b) Identify the principle that explains these changes (1 mark).\n\n(c) What kind of reactions does this principle describe? (1 mark)',
    solution: '**a(i).** The forward reaction releases heat. Heating favours the endothermic reverse reaction, so equilibrium shifts left.\n\n**a(ii).** Compression favours the side with fewer gas molecules. The left has two moles of gas per reaction as written, and the right has one.\n\n**b.** Le Chatelier’s principle.\n\n**c.** It applies to reversible reactions at dynamic equilibrium when a disturbance changes an equilibrium condition.',
    hints: 'Award one mark for each correct reason and one each for naming the principle and identifying reversible equilibrium reactions.',
  },
  {
    number: '2', page: 3, notesPage: 7, marks: 3, originalSlo: '11.5.4', slo: '11.2.7', level: 'A',
    stem: 'Rancid butter contains an organic acid with four carbon atoms.\n\n(a) Suggest one chemical test and state the result that would support the presence of a carboxylic acid (2 marks).\n\n(b) Name the acid expected in rancid butter (1 mark).',
    solution: '**a.** A sodium bicarbonate test gives effervescence of carbon dioxide when a carboxylic acid is present. The reaction also produces a carboxylate salt and water.\n\n**b.** Butanoic acid, also called butyric acid, CH₃CH₂CH₂COOH. The butter context points to butanoic acid. A positive functional-group test alone cannot distinguish it from other four-carbon carboxylic acid isomers.',
    hints: 'Credit a suitable test and a matching result separately. Use the context and four-carbon clue for the name.',
  },
  {
    number: '3', page: 3, notesPage: 9, marks: 3, originalSlo: '13.1.2', slo: '13.3.2', level: 'U',
    stem: 'Choose one example from this list for each category in the table. Use fructose, lactose, cellulose, raffinose, galactose and starch.\n\n| Category | One example |\n| --- | --- |\n| Monosaccharide | ? |\n| Oligosaccharide | ? |\n| Polysaccharide | ? |',
    solution: '| Category | One suitable example | Other examples from the list |\n| --- | --- | --- |\n| Monosaccharide | Fructose | Galactose |\n| Oligosaccharide | Raffinose, a trisaccharide | Lactose is a disaccharide and is included when the convention counts two-unit sugars as oligosaccharides. |\n| Polysaccharide | Starch | Cellulose |',
    hints: 'Credit one suitable example per row. Raffinose is the clearest oligosaccharide under either common definition.',
  },
  {
    number: '4', page: 4, notesPage: 11, marks: 3, originalSlo: '15.1.2', slo: null, level: 'U',
    stem: 'Give three features of how water occurs on Earth.',
    solution: '1. Water covers about 71% of Earth’s surface.\n2. Most of Earth’s water is saline and is found in oceans.\n3. Freshwater occurs in glaciers and ice caps, in groundwater and in smaller surface stores such as rivers and lakes.',
    hints: 'Give three observations about water’s occurrence or distribution. Measurements such as its boiling point answer a different question.',
    scopeNote: 'The 2026 marking notes use SLO 15.1.2 for water occurrence. In the January 2025 Class X syllabus that number instead assesses anomalous behaviour of water.',
  },
  {
    number: '5a', page: 5, notesPage: 13, marks: 6, originalSlo: '10.4.2', slo: '10.3.3', level: 'U',
    stem: 'Explain how selective chemical etching creates a design on a glass surface while leaving masked areas intact. Describe the stages and relevant industrial conditions.',
    solution: '1. **Surface preparation.** A clean glass surface lets the protective mask adhere evenly.\n2. **Masking.** A chemically resistant mask covers the areas intended to stay clear.\n3. **Design exposure.** Openings in the mask expose only the parts of the design that are to be etched.\n4. **Chemical action.** In a controlled industrial system, fluoride-based chemistry, commonly involving hydrofluoric acid, attacks silica in the exposed glass. The exposed areas lose a thin layer of material and scatter light, creating a frosted contrast.\n5. **Unmasking.** After the etchant has been cleared through the facility’s controlled process, the mask is removed to reveal the design.\n6. **Finishing.** Residues and waste are managed under the facility’s chemical-handling controls, and the finished glass is inspected.',
    hints: 'The board assesses preparation, masking, exposure, selective etching, unmasking and finishing. Its teaching guidance recommends a digital demonstration because hydrofluoric acid is extremely hazardous.',
  },
  {
    number: '5b', page: 5, notesPage: 16, marks: 6, originalSlo: '12.1.1', slo: '11.5.1', level: 'U',
    stem: '(i) Explain one drawback of common chemical names and give two examples (3 marks). (ii) Explain three advantages of systematic naming (3 marks).',
    solution: '**i.** A common name can hide the structure or have a meaning that depends on context. For example, **wood alcohol** does not specify the one-carbon alcohol **methanol**, and **acetic acid** does not tell a reader it is the two-carbon carboxylic acid **ethanoic acid**.\n\n**ii.** Systematic rules provide a standard naming convention across languages and laboratories. A systematic name often encodes the parent chain, functional group and position of substituents. The locants and structural information help distinguish similar compounds and isomers.',
    hints: 'Link both examples to the drawback, then give three distinct benefits.',
  },
  {
    number: '6a', page: 7, notesPage: 19, marks: 6, originalSlo: '14.3.4', slo: '14.3.4', level: 'U',
    stem: 'Lahore experiences severe smog. Recommend three measures the Punjab government could take to reduce its air pollution. Explain how each measure would benefit health or the environment.',
    solution: '1. **Reduce road emissions.** Enforce vehicle emissions inspections and improve public transport so fewer high-emitting trips produce nitrogen oxides and fine particles.\n2. **Control industrial and kiln emissions.** Set and monitor emission limits and require effective particulate control and cleaner technology where applicable. This cuts smoke and other pollutants that worsen respiratory exposure.\n3. **Reduce open burning.** Enforce restrictions on crop-residue and waste burning while providing workable alternatives for farmers and municipalities. Less burning means fewer airborne particles and less exposure during smog episodes.',
    hints: 'For each strategy, connect a concrete policy action to the emissions it reduces and an effect on people or the environment.',
  },
  {
    number: '6b', page: 7, notesPage: 22, marks: 6, originalSlo: '16.1.1', slo: '16.1.1', level: 'U',
    stem: 'Describe two responsibilities for a chemistry-trained professional in each area (2 marks each).\n\n(i) Pharmaceutical industry\n\n(ii) Production and manufacturing\n\n(iii) Chemical engineering',
    solution: '**i. Pharmaceutical industry.** Analyse raw materials and finished medicines for identity, purity and strength. Help develop and test formulations for stability and consistent delivery of the active ingredient.\n\n**ii. Production and manufacturing.** Check feedstocks and product batches against quality specifications. Monitor process chemistry and investigate deviations to improve consistency and reduce rejected material.\n\n**iii. Chemical engineering.** Use material and energy balances to design or scale up processes. Evaluate process hazards and improve equipment controls, resource use or waste handling.',
    hints: 'Give two distinct and relevant responsibilities for each sector and explain what each responsibility involves.',
  },
];
