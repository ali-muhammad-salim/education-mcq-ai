import { smartMatch } from './smartSearch';

export function syllabusLevel(value: string) {
  const text = value.trim().toLowerCase();
  if (['r', 'k', 'remembering', 'knowledge'].includes(text)) return 'R';
  if (['u', 'understanding'].includes(text)) return 'U';
  if (['a', 'application'].includes(text)) return 'A';
  if (['e', 'evaluation'].includes(text)) return 'E';
  if (['an', 'analysis', 'analyse'].includes(text)) return 'An';
  if (['c', 'create'].includes(text)) return 'C';
  if (text.startsWith('fa')) return 'FA';
  return undefined;
}
// Preserve wording while restoring superscripts flattened in the source JSON.
export function syllabusDisplayText(value: string) {
  return value.replace('3 × 108 m/s', '$3 \\times 10^{8}\\,\\mathrm{m/s}$').replace('½ mv2', '$\\frac{1}{2}mv^{2}$').replaceAll('NADPH2', 'NADPH₂');
}
export function filterSyllabus(units: any[], query: string, level: string, selected: number | 'all') {
  const term = query.trim();
  return units.filter(unit => selected === 'all' || unit.unitNumber === selected).map(unit => ({
    ...unit, subtopics: unit.subtopics.map((topic: any) => ({
      ...topic, slos: [...topic.slos].sort((a, b) =>
        (a.sourcePage ?? 0) - (b.sourcePage ?? 0) ||
        (a.sourceOrdinal ?? 0) - (b.sourceOrdinal ?? 0) ||
        a.code.localeCompare(b.code, undefined, { numeric: true })
      ).filter((slo: any) =>
        (level === 'all' || syllabusLevel(slo.cognitiveLevel) === level) &&
        (!term || smartMatch([unit.name, topic.name, slo.description].join(' '), term, slo.code))
      ),
    })).filter((topic: any) => topic.slos.length > 0),
  })).filter(unit => unit.subtopics.length > 0);
}
