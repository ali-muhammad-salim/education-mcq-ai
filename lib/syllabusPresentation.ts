import { smartMatch } from './smartSearch';
import { formatSyllabusMath } from './syllabusMath';

export function syllabusLevel(value: string) {
  const text = (value || '').trim().toLowerCase();
  if (['r', 'k', 'remembering', 'remember', 'knowledge'].includes(text)) return 'R';
  if (['u', 'understanding', 'understand'].includes(text)) return 'U';
  if (['a', 'application', 'apply'].includes(text)) return 'A';
  if (['an', 'analysing', 'analyzing', 'analyse', 'analyze'].includes(text)) return 'An';
  if (['e', 'evaluation', 'evaluate'].includes(text)) return 'E';
  if (['c', 'creating', 'create'].includes(text)) return 'C';
  if (['fa', 'formative assessment', 'formative'].includes(text)) return 'FA';
  return undefined;
}
// Preserve wording while restoring superscripts flattened in the source JSON.
export function syllabusDisplayText(value: string, subjectSlug?: string) {
  const restored = value
    .replace('3 × 108 m/s', '$3 \\times 10^{8}\\,\\mathrm{m/s}$')
    .replace('½ mv2', '$\\frac{1}{2}mv^{2}$');
  if (subjectSlug === 'physics') {
    return restored
      .replace(/\bfollowing[ \t]*\r?\n[ \t]*terms:/g, 'following terms:')
      .replace('E = IVt = I2Rt = V 2 t / R ;', () => '$E=IVt=I^{2}Rt=\\frac{V^{2}t}{R}$;');
  }
  return subjectSlug === 'mathematics' ? formatSyllabusMath(restored) : restored;
}
export function filterSyllabus(units: any[], query: string, level: string, selected: number | 'all') {
  const term = query.trim();
  return units.filter(unit => selected === 'all' || unit.unitNumber === selected).map(unit => ({
    ...unit, subtopics: unit.subtopics.map((topic: any) => ({
      ...topic, slos: [...topic.slos].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).filter((slo: any) => {
        const mapped = syllabusLevel(slo.cognitiveLevel);
        if (level !== 'all') {
          if (level === 'A' && (mapped === 'An' || mapped === 'C')) {
            // Keep higher-order levels individually filterable as well.
          } else if (mapped !== level) {
            return false;
          }
        }
        if (!term) return true;
        const combined = `${unit.name} ${topic.name} ${slo.code} ${slo.description}`;
        return smartMatch(combined, term, slo.code);
      }),
    })).filter((topic: any) => topic.slos.length > 0),
  })).filter(unit => unit.subtopics.length > 0);
}
