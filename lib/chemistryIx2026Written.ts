type WrittenItem = {
  number: string; page: number; notesPage: number; marks: number; originalSlo: string;
  slo: string; level: 'U' | 'A'; stem: string; solution: string; hints: string;
  diagram?: boolean; numerical?: boolean;
};

export const chemistryIx2026Written: WrittenItem[] = [
  {
    number: '1', page: 2, notesPage: 2, marks: 3, originalSlo: '1.3.3', slo: '1.3.3', level: 'U',
    stem: 'Three substances are shown at the particle level. A hollow circle (○) represents one kind of atom and a filled circle (●) another. Identify X, Y and Z as an element, a compound or a mixture.\n\n| Substance | Particles |\n| --- | --- |\n| X | ○○　○●　●●　○● |\n| Y | ○○　○○　○○　○○ |\n| Z | ○●　○●　○●　○● |',
    solution: '**X. Mixture.** It contains several different kinds of particle.\n\n**Y. Element.** Each particle contains two atoms of the same element.\n\n**Z. Compound.** Each identical particle contains two different elements bonded in a fixed ratio.',
    hints: 'Award one mark per correct classification. Base the distinction on atom types and bonding, since every sample contains more than one particle.',
  },
  {
    number: '2', page: 2, notesPage: 4, marks: 3, originalSlo: '3.5.1', slo: '3.5.1', level: 'A',
    stem: 'The electronic configuration of an element is 1s² 2s² 2p⁴.\n\n(a) How can the shells and subshells be identified from this configuration? (2 marks)\n\n(b) How many electrons are in the n = 2 shell? (1 mark)',
    solution: '**a.** The leading numbers 1 and 2 give the principal shell. The letters s and p identify the subshells. The superscripts give the number of electrons in those subshells.\n\n**b.** The 2s and 2p subshells contain 2 and 4 electrons respectively, so the second shell contains **6 electrons**.',
    hints: 'Award one mark each for identifying the shell number, the subshell letter and the correct sum for shell 2.',
  },
  {
    number: '3', page: 3, notesPage: 6, marks: 4, originalSlo: '4.1.5 (4.3.1)', slo: '4.1.5', level: 'U',
    stem: 'Fluorine and chlorine are in the same group of the modern periodic table.\n\n(a) Identify the group. (1 mark)\n\n(b) Give three reasons why they belong to the same group. (3 marks)',
    solution: '**a.** Group 17 (VIIA), the halogens.\n\n**b.** Both have seven valence electrons, with an outer electron configuration of ns² np⁵. Both tend to gain one electron and form singly negative halide ions. Both occur as diatomic molecules in their elemental forms, F₂ and Cl₂.',
    hints: 'Accept the group number or family name. Award one mark for each distinct relevant reason in part (b).',
  },
  {
    number: '4', page: 3, notesPage: 8, marks: 3, originalSlo: '6.4.1', slo: '6.4.1', level: 'U',
    stem: 'Compare volatile liquids in a closed container at the same temperature. How does a higher equilibrium vapour pressure relate to the boiling point measured at the same external pressure?',
    solution: 'A liquid with weaker intermolecular attractions generally has a higher equilibrium vapour pressure at the comparison temperature. A liquid boils when its vapour pressure reaches the external pressure. At the same external pressure, the more volatile liquid usually reaches that condition at a lower temperature, so it has a lower boiling point.',
    hints: 'Link higher vapour pressure, lower boiling point and weaker intermolecular attractions. For a meaningful boiling-point comparison, keep the external pressure the same.',
  },
  {
    number: '5a', page: 4, notesPage: 10, marks: 6, originalSlo: '2.3.6', slo: '2.3.6', level: 'A', numerical: true,
    stem: 'Propane burns in oxygen according to the equation:\n\nC₃H₈(g) + 5O₂(g) → 3CO₂(g) + 4H₂O(l)\n\n(i) Calculate the mass of CO₂ formed by completely burning 88 g of propane. (3 marks)\n\n(ii) Calculate the volume of O₂ required at room temperature and pressure (RTP). (3 marks)\n\nUse H = 1, C = 12, O = 16 and a molar gas volume of 24 dm³/mol at RTP.',
    solution: '**i.** The molar mass of propane is 44 g/mol, so 88 g is 2 mol. One mole of propane produces 3 mol of carbon dioxide. Therefore 2 mol produces 6 mol of CO₂, with mass 6 × 44 = **264 g**.\n\n**ii.** The equation requires 5 mol of oxygen per mole of propane. Therefore 2 mol requires 10 mol of O₂, with volume 10 × 24 = **240 dm³** at RTP.',
    hints: 'Credit the amount of propane, the correct mole ratios, and the final conversions to mass and volume. Apply error carried forward where appropriate.',
  },
  {
    number: '5b', page: 4, notesPage: 13, marks: 6, originalSlo: '5.6.1 (5.3.4)', slo: '5.6.1', level: 'A',
    stem: 'The table shows boiling points at standard atmospheric pressure.\n\n| Compound | Formula | Boiling point |\n| --- | --- | ---: |\n| Hydrogen sulphide | H₂S | −60 °C |\n| Water | H₂O | 100 °C |\n\n(i) Draw the dot-and-cross structure of H₂S. Use a cross (×) for each hydrogen electron and a dot (•) for each sulphur electron. (2 marks)\n\n(ii) Identify the type of covalent bond between sulphur and hydrogen. (1 mark)\n\n(iii) Compare the intermolecular forces to explain the difference in boiling point. (3 marks)',
    solution: '**i.** Draw H ×• S •× H, with two lone pairs (four further dots) on sulphur. Each bonded pair contains one electron from hydrogen and one from sulphur.\n\n**ii.** Each S–H bond is a single covalent bond.\n\n**iii.** Water forms hydrogen bonds between molecules. Hydrogen sulphide has permanent dipole–dipole and London dispersion attractions, with no comparable hydrogen bonding. Separating water molecules therefore requires more energy.',
    hints: 'Credit two correct bonding pairs, two lone pairs, the bond type and the comparison of intermolecular forces and their effects.',
  },
  {
    number: '6a', page: 6, notesPage: 16, marks: 6, originalSlo: '7.6.3 (7.6.2)', slo: '7.6.3', level: 'A',
    stem: 'A student has water (polar), hexane (non-polar) and vegetable oil (non-polar). Use the rule of “like dissolves like” and the factors affecting solubility to explain:\n\n(i) Which solvent dissolves table salt (NaCl) best? (3 marks)\n\n(ii) Does iodine (I₂) dissolve well in water? (3 marks)',
    solution: '**i.** Water is best. Sodium chloride is ionic. Polar water molecules surround and stabilise its sodium and chloride ions by ion–dipole attractions, helping pull them away from the lattice.\n\n**ii.** Iodine is only sparingly soluble in water at room temperature. Its non-polar molecules dissolve better in the supplied non-polar solvents, such as hexane or vegetable oil, consistent with “like dissolves like”.',
    hints: 'For NaCl, credit solvent choice, ionic or polar character and an ion–dipole explanation. For iodine, credit limited water solubility, the polarity contrast and a link to the rule or a better solvent.',
  },
  {
    number: '6b', page: 6, notesPage: 18, marks: 6, originalSlo: '8.4.4', slo: '8.4.4', level: 'A', diagram: true,
    stem: 'The diagram shows electrolysis of molten lead(II) bromide (PbBr₂) with inert carbon electrodes.\n\n(i) State the general rule for the movement of ions in an electrolytic cell. (1 mark)\n\n(ii) Identify the charge on each electrode (1 mark). Explain which ions move towards each electrode and why (4 marks).',
    solution: '**i.** Cations move towards the cathode and anions towards the anode.\n\n**ii.** The cathode is negative and attracts Pb²⁺ ions. At the cathode Pb²⁺ gains electrons to form lead. The anode is positive and attracts Br⁻ ions. Bromide loses electrons at the anode to form Br₂.',
    hints: 'Award one mark for the migration rule, one for both electrode polarities and the remaining marks for the two correct migrations and explanations.',
  },
];
