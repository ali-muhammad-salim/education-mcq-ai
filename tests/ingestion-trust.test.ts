import { describe, expect, it } from 'vitest';
import { chemicalBalance, chemicalExpressions, normalizedBox, pageExtraction } from '@/services/ingestion/trust';
import { parseGrade } from '@/services/ingestion/trusted';
describe('source geometry and chemistry checks', () => {
  it.each([[0, 0, 100, 100], [125.5, 50, 800, 900]])('accepts bounded ordered boxes %j', (...box) => { expect(normalizedBox.safeParse(box).success).toBe(true); });
  it.each([[-1, 0, 100, 100], [100, 0, 10, 100], [0, 0, 1001, 100], [NaN, 1, 20, 20], [0, 0, Infinity, 50], [0, 0, 1000, 1000], [0, 0, 1, 1]])('rejects unsafe or meaningless crop %j', (...box) => { expect(normalizedBox.safeParse(box).success).toBe(false); });
  it.each(['2H2 + O2 -> 2H2O', 'Ca(OH)2 + 2HCl → CaCl2 + 2H2O', '2H₂ + O₂ → 2H₂O', '2Na(s)+Cl2(g)->2NaCl(s)'])('checks atom conservation: %s', equation => { expect(chemicalBalance(equation)).toBe('BALANCED'); });
  it('flags unbalanced chemistry without silently changing the source', () => { expect(chemicalBalance('H2 + O2 -> H2O')).toBe('UNBALANCED'); });
  it('finds chemistry inside question text without treating a flowchart as a reaction', () => { expect(chemicalExpressions('1. Balanced reaction: 2H2 + O2 -> 2H2O\nProcess: Reactants -> Reaction -> Products')).toEqual(['2H2 + O2 -> 2H2O']); });
  it('retains an uncertain region for review with unknown geometry instead of inventing a crop', () => {
    const result = pageExtraction.parse({ text: 'Diagram', continuation: '', regions: [{ kind: 'DIAGRAM', text: 'Unclear boundary', questionNumber: '1', box: [-5, 0, 200, 300], labels: [], relationships: [], sloIds: [], uncertainty: 'Needs checking' }] });
    expect(result.regions[0].box).toBeNull(); expect(result.regions[0].uncertainty).toBe('Needs checking');
  });
  it.each(['Na+ + Cl- -> NaCl', '\\ce{H2 + O2 -> H2O}', 'Xx2->Xx2', '0H2->H2', '(H2->H2', 'H2 + -> H2'])('requires review for unsupported notation %s', equation => { expect(chemicalBalance(equation)).toBe('UNSUPPORTED'); });
  it.each([['Class IX', 9], ['Grade 10', 10], ['XII', 12], ['11', 11]])('normalizes class labels %s', (value, expected) => { expect(parseGrade(value as string)).toBe(expected); });
});
