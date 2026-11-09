# Each decision is tied to the question content, not a replacement table of old codes.
DECISIONS = '''
1|9|3.2.4|Matches an isotope to its practical use.
2|9|7.5.2|Calculate molarity from solute mass, molar mass and solution volume.
3|9|7.4.1|Fog is an aerosol colloid; classify dispersed particles rather than treating fog as a true solution.
4|9|7.7.1,7.1.1|Filtration separates insoluble silica from the dissolved salt; infer residue and filtrate.
5|9|6.4.1|Relate weak intermolecular attractions to vapour pressure and boiling point.
6|10|12.6.2|Oxidation of ethene and ethyne with potassium permanganate.
7|9|1.3.6|Determine the valencies of ions within compounds.
8|9|2.2.3|Calculate an empirical formula from elemental mass percentages.
9|9|2.3.2|Recognise a single displacement reaction.
10|9|7.5.4|Calculate mass percentage using water mass and total solution mass.
11|9|7.4.1|Identify a suspension from the behaviour of particles in water.
12|9|3.5.1|Deduce potassium electron configuration and the partially occupied subshell.
13|9|4.1.4|Identify the s block from its characteristic elements.
14|9|6.6.2|Both sulphur allotropes contain S8 molecules.
15|9|5.2.2|Recognise general properties of ionic compounds.
16|9|5.3.2|Identify the labelled single and double covalent bonds in the supplied ozone representation.
17|9|5.5.1|Identify metallic bonding and its delocalised electron model.
18|9|8.4.5|Infer lack of electrical conduction from failure to form mobile ions.
19|9|4.1.4,4.3.3|Distinguish soft s-block metals from d-block elements and compare Group I/II metal properties.
20|9|4.3.3|Predict calcium reaction with water.
21|9|5.6.1|Compare water hydrogen bonding with oxygen intermolecular attractions and boiling points.
22|9|2.3.2|Distinguish examples of chemical reaction types.
23|9|1.3.4|Classify substances as elements, compounds or mixtures.
24|9|2.2.4|Use empirical formula mass and molecular mass to determine molecular formula.
25|9|2.3.2|Recognise hydrolysis of starch.
26|9|7.5.2,7.5.5|Use stock molarity to calculate solute mass and interpret the dilution context.
27|9|7.7.4|Interpret the separated ink spots in a chromatogram.
28|9|3.4.1|Distinguish subshells using the capacity of a p subshell.
29|9|4.1.4|Classify the displayed d-electron configuration by periodic-table block; no first-twenty-element outcome is claimed for zinc.
30|9|5.5.2|Mobile metallic electrons explain copper conductivity.
31|9|8.2.3|Calculate chlorine oxidation number in chlorate.
32|9|8.4.3|Recognise the working of a galvanic cell.
33|9|4.3.7|Recognise inert noble metals and their uncombined occurrence.
34|9|2.3.2|Identify calcium carbonate by its thermal decomposition to lime and carbon dioxide.
35|9|5.5.2|Explain melting point, conductivity, malleability, ductility and lustre using metallic bonding.
36|9|2.2.3,2.2.4|Calculate empirical formula and then molecular formula in the two separate parts.
37|9|1.3.6|Determine calcium and phosphate valencies in a compound.
38|9|2.3.1|Recognise what constitutes a chemical reaction.
39|9||The precise elemental composition of nichrome is not specified by a current outcome; identifying a solid solution alone does not assess that composition.
40|9|7.4.1|Distinguish true solutions from colloids and suspensions.
41|9|3.5.1|Deduce the electronic arrangement of the aluminium ion.
42|9|4.2.3|Compare the chemical reactivity of members of the halogen family.
43|9|4.3.3|Identify Group I using its characteristic softness and reactivity.
44|9|6.6.1|Identify the defining distinction between allotropes.
45|9|6.6.2|Apply the properties of graphite as a carbon allotrope.
46|9|8.2.3|Calculate chromium oxidation number in chromium trioxide.
47|9|8.4.5|Infer electrolyte dissociation from observed electrical conductivity.
48|9|5.5.2|Conduction through metal electrodes is due to mobile electrons.
49|9|8.4.3|Identify a voltaic cell by its working.
50|9|8.6.3,8.1.1|Chromium electroplating as corrosion prevention includes reduction of chromium ions at the cathode.
51|9|4.3.6,5.5.2|Compare transition-metal hardness and metallic bond strength with sodium.
52|9|2.3.4,2.3.5,5.2.3|Write and balance magnesium oxidation and identify bonding in magnesium oxide.
53|9|2.2.3,2.2.4|Calculate empirical and molecular formulae from composition and molar mass.
54|9|8.4.1,8.5.2|Define electrolysis and explain manufacture from aqueous brine with electrode reactions.
55|9|1.3.7|Use ionic valencies to construct a neutral compound formula.
56|9|2.2.1|Distinguish empirical formulae from formulae with reducible subscripts.
57|9|2.2.2|Calculate carbon mass as a constituent of carbon dioxide.
58|9|2.3.5|Balance the aluminium and copper sulphate reaction by inspection.
59|9|2.3.2|Classify the displacement reaction between hydrogen sulphide and chlorine.
60|9|2.3.2|Identify reactants in a double displacement reaction.
61|9|2.3.2|Recognise combustion among the described actions.
62|9|3.5.1|Interpret what electronic configuration describes and what it does not establish about a nucleus.
63|9|4.3.4|Identify bromine from halogen colour, state and diatomic character.
64|9|5.4.1|Explain formation of a coordinate covalent bond by an electron-pair donor.
65|9|5.6.1|Identify London dispersion forces between non-polar iodine molecules.
66|9|7.5.4|Calculate solvent mass percentage in a sugar solution.
67|9|7.4.1|Identify a colloid using particle size, filtration and settling behaviour.
68|9|7.6.4|Interpret salt solubility versus temperature curves.
69|9|7.7.3|Select paper chromatography to separate food colours.
70|9|7.4.1|Describe suspended chalk particles in water.
71|9|8.2.3|Calculate phosphorus oxidation number in sodium dihydrogen phosphate.
72|9|7.7.5,7.6.3|Choose a solvent-based separation using different solubilities.
73|9|7.7.1,7.1.1|Infer the residue and filtrate after filtering silica and dissolved alum.
74|9|7.7.5|Choose a practical separation technique for iron filings and sodium chloride.
75|9|7.6.2|Relate temperature and dissolution behaviour to solubility.
76|9|7.7.1|Explain acid addition during preparation and crystallisation of hydrated copper sulphate.
77|9|7.7.1|Explain why hydrated copper sulphate should not be heated to dryness during crystallisation.
78|9|8.6.3,8.1.1|Interpret electrode redox processes in corrosion-preventing electroplating.
79|9|8.4.5|Compare conductivity observations with degrees of electrolyte dissociation.
80|9|1.3.7|Use valencies to recognise a correctly written compound formula after isotope substitution.
81|9|2.3.5|Recognise a balanced chemical equation.
82|9|1.3.4|Identify a pure compound in a particle diagram.
83|9|2.3.5|Choose stoichiometric coefficients to balance aluminium hydroxide precipitation.
84|9|4.2.3|Compare physical properties of Group I and Group II elements.
85|9|5.2.2|Recognise general properties of ionic compounds.
86|9|5.6.1|Compare weak intermolecular attractions with intramolecular bonds.
87|9|7.7.4|Interpret ink separation on a chromatogram.
88|9|7.7.5,7.7.1|Order dissolution, filtration and crystallisation to separate salt from sand.
89|9|7.6.3|Apply solute-solvent compatibility to classify water solubility.
90|9|8.4.3|Distinguish electrolytic cell components and operation from a voltaic cell.
91|9|8.4.7|Predict metal displacement from the observed deposition and dissolution.
92|9|8.4.1|Identify a substance acting as an electrolyte.
93|9|7.7.5|Choose magnetic separation for iron filings from ammonium chloride.
94|9|7.1.1|Identify material retained by filter paper as residue.
95|9|7.7.5,7.7.1|Select dissolution, filtration and crystallisation to isolate sugar from sand.
96|9||The distinction between primary and secondary analytical standards is not an explicit outcome in the supplied syllabus; molarity alone is not an equivalent assessment.
97|9|7.7.1|Explain the effect of heating a hydrated salt to dryness during crystallisation.
98|9|7.7.1|Explain slow cooling as part of obtaining large pure crystals.
99|9|7.7.1,7.6.2|Use temperature-dependent solubility to explain crystallisation.
100|9|7.5.2|Calculate solute mass required for a specified molarity and volume.
101|9|8.6.3|Identify the corrosion-prevention purpose of electroplating an iron key.
102|9|5.5.2|Metal electrodes conduct by the movement of mobile electrons.
103|9|1.3.3|Distinguish heterogeneous mixtures from homogeneous substances.
104|9|1.3.4|Classify particle diagrams as pure compounds.
105|9|7.3.2|Compare dilute and concentrated solutions by their solvent fraction.
106|9|7.5.5|Calculate the volume of stock solution required for dilution.
107|9|8.6.3,8.1.1|Identify chromium reduction at the cathode during protective electroplating.
108|9|8.2.3|Calculate chlorine oxidation state in chlorate.
109|9|4.3.2|Classify non-metal oxides by their acidic nature.
110|9|7.7.3,7.7.4|Explain chromatography procedure, locating agent and interpretation of amino-acid spots.
111|9|1.3.6|Determine iron valency from the nitrate compound formula.
112|9|2.3.5|Balance ammonia oxidation coefficients.
113|9|6.3.1|Apply the inverse pressure-volume relationship at constant temperature.
114|9|7.5.2|Calculate molarity from potassium sulphate mass and solution volume.
115|9|7.4.1|Fog is an aerosol colloid; identify dispersed phases without calling it a true solution.
116|9|8.1.1,2.3.3|Relate a redox process to an observed chemical-reaction characteristic.
117|9|8.4.10|Explain zinc-carbon dry-cell electrodes, electrolyte and electrode reactions.
118|9|1.3.4|Classify mercury, glucose, ammonia and brass as element, compounds or mixture.
119|9|6.3.1|Identify Boyle's pressure-volume relationship at constant temperature.
120|9|7.5.2|Calculate sodium hydroxide molarity from mass and flask volume.
121|9|2.3.4,2.3.5,2.3.2|Identify magnesium oxide, balance the equation and classify combination reaction.
122|9|6.3.2,7.4.1|Part a assesses Charles's law; part b assesses properties identifying a suspension.
123|9|7.5.4,7.5.5|Part a calculates mass/volume percentage; part b calculates a dilution.
124|10|16.2.4|Electrolytic copper refining has moved to current Grade X Chemical Industries.
125|10|9.2.4|A catalyst lowers activation energy and increases reaction rate.
126|10|10.6.3|Classify a basic salt formed by incomplete neutralisation.
127|10|13.5.3|Hydrogenation of vegetable oil is specifically assessed in the lipids outcome.
128|10|11.2.7|Use ferric chloride and other observations to identify phenol.
129|10|11.4.3|Determine the carbon count needed for three alkane chain isomers.
130|10|11.2.5|Identify the carboxyl functional group from displayed structures.
131|10|13.4.3|A linear amino-acid sequence is the primary structure of a protein.
132|10|15.4.1|Identify a water-borne disease from symptoms and transmission.
133|10|14.4.3,14.4.4|Compare ozone formation and natural decomposition maintaining ozone concentration.
134|10|14.4.6|Identify gases contributing to global warming.
135|10|16.5.3|Relate large hydrocarbon chain size to high boiling point and collection low in the fractionating tower.
136|10|9.1.1,9.3.6|Recognise dynamic reversible equilibrium and predict shifts due to conditions.
137|10|15.3.3|Explain the roles of filtration, activated charcoal and coagulation in raw-water treatment.
138|10|10.2.3|Explain acids reacting with metals and metal oxides using balanced equations.
139|10|12.3.2|Prepare alkanes by hydrogenation of an alkyne and reduction of an alkyl halide.
140|10|14.4.4|Explain ozone depletion mechanism and its harmful effects.
141|10|9.2.4|Explain the role of iron catalyst in the Haber process.
142|9|2.3.6|Use stoichiometric gas volume ratios in combustion to identify the hydrocarbon; numerical stoichiometry is now Grade IX.
143|10|12.6.2|Recognise oxidation of ethene to a diol by permanganate.
144|10|11.2.5|Identify a ketone functional group.
145|10|11.3.1|Identify an alkyl group formed by loss of hydrogen from an alkane.
146|10|11.3.1|Determine possible alkyl groups from a five-carbon alkane.
147|10|13.3.4|Explain medicinal use of dextrose solution.
148|10|15.4.1|Identify a water-borne bacterial disease.
149|10|14.4.4,14.4.6|Link decreased ozone to ultraviolet transmission and increased carbon dioxide to warming.
150|10|14.4.5|Define the greenhouse effect.
151|10|16.5.4|Recognise the fractions obtained from petroleum.
152|10|9.3.5,9.3.6|State Le Chatelier's principle and apply it to temperature and pressure changes.
153|10|11.2.5,11.2.1|Identify the carboxyl group and compare cyclic versus acyclic structures.
154|10|10.6.7,10.6.3|Explain industrial salt uses and identify mixed and double salts.
155|10|16.5.2,16.5.3|Explain petroleum fractional distillation and collection based on boiling point.
156|10|9.3.6|A catalyst changes rates without changing equilibrium position.
157|10|9.3.6|Predict equilibrium shift for the endothermic dissociation of dinitrogen tetroxide.
158|10|10.6.3|Identify an acidic salt from replaceable hydrogen.
159|10|12.1.2|Distinguish saturated from unsaturated hydrocarbons.
160|10||This asks oxidative cleavage of a generic substituted terminal alkyne, beyond the specified oxidation of ethene and ethyne in 12.6.2. Do not equate all alkyne oxidation with that limited outcome.
161|10|12.5.3|Prepare ethyne by zinc dehalogenation of a tetrahalide.
162|10|11.3.1|Identify alkane structures capable of forming different alkyl groups.
163|10|15.4.1|Identify fluorosis and its effects on bones and teeth.
164|10|15.3.3|Identify a limitation of the raw-water treatment process.
165|10|14.4.6|Identify activities increasing greenhouse-gas emissions.
166|10|11.3.1|Draw alkyl groups derived from chain isomers of butane.
167|10|15.3.1,15.3.2|Identify chemical-waste sources and explain effects on water and aquatic life.
168|10|14.3.4,14.4.8|Recommend measures controlling particulate pollution and greenhouse warming.
'''

import hashlib
import json
from pathlib import Path
import pymupdf
ROOT = Path(__file__).resolve().parents[1]
PDF = Path.home()/'Downloads/chemistry-ssc-i-syllabus-2025-_-20261027122940.pdf'

def main():
 source_hash=hashlib.sha256(PDF.read_bytes()).hexdigest()
 assert source_hash=='5d4adcd6253bd9a456db6884a6d0aa87f3942313537670ace339815145452088'
 doc=pymupdf.open(PDF)
 outcomes={}
 for grade in [9,10]:
  for unit in json.loads((ROOT/f'data/chemistry/ssc{grade-8}_exact_syllabus.json').read_text(encoding='utf-8')):
   for sub in unit['subtopics']:
    for slo in sub['slos']:
     assert slo['code'] in doc[slo['sourcePage']-1].get_text(),slo['code']
     outcomes[grade,slo['code']]={'code':slo['code'],'description':slo['description'],'topic':unit['name'],'unitNumber':unit['unitNumber'],'grade':grade,'sourcePage':slo['sourcePage']}
 pending=json.loads((ROOT/'output/resource-audit/mapping-repair-backup.json').read_text(encoding='utf-8'))
 lines=[l.split('|',3) for l in DECISIONS.strip().splitlines()]
 assert len(lines)==len(pending)==168
 rows=[]
 for n,grade,codes,reason in lines:
  old=pending[int(n)-1];question=old['row'];grade=int(grade);original_grade=9 if '-IX-' in old['code'] else 10
  mapped=[outcomes[grade,code] for code in codes.split(',') if code]
  rows.append({'paperCode':old['code'],'questionNumber':old['number'],'questionSha256':hashlib.sha256(question['questionText'].encode('utf-8')).hexdigest(),'originalSlo':question['sourceRegion'].get('slo'),'previousProposedCode':old['next']['proposed_current_slo'],'grade':grade,'mappingStatus':'NO_DIRECT_OUTCOME' if not mapped else 'IN_SCOPE' if grade==original_grade else 'MOVED_TO_GRADE_X' if grade==10 else 'MOVED_TO_GRADE_IX','reason':reason,'outcomes':mapped})
 result={'syllabus':{'filename':PDF.name,'sha256':source_hash,'url':'/materials/ssc/chemistry/ssc-1/chemistry-ssc-full-syllabus-2025.pdf','revision':'January 2025','firstExamYears':{'IX':2026,'X':2027}},'reviewScope':'The 168 entries held pending by the resource audit; reviewed individually by question content. This is not an answer-key review.','questions':rows}
 (ROOT/'data/chemistry/reviewed_syllabus_mappings_2025.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'reviewed':len(rows),'mapped':sum(bool(r['outcomes']) for r in rows),'noDirect':sum(not r['outcomes'] for r in rows),'multipleOutcomes':sum(len(r['outcomes'])>1 for r in rows),'crossGrade':sum(r['mappingStatus'].startswith('MOVED') for r in rows)},indent=2))

if __name__=='__main__':main()
