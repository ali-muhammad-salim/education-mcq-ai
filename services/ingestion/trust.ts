import { z } from 'zod';

export const normalizedBox = z.tuple([z.number().finite().min(0).max(1000), z.number().finite().min(0).max(1000), z.number().finite().min(0).max(1000), z.number().finite().min(0).max(1000)])
  .refine(([y0, x0, y1, x1]) => y1 - y0 >= 5 && x1 - x0 >= 5 && !(y1 - y0 > 980 && x1 - x0 > 980), 'Invalid or full-page crop');
export const pageExtraction = z.object({
  text: z.string().max(60000),
  continuation: z.string().max(2000),
  regions: z.array(z.object({
    kind: z.enum(['TEXT', 'QUESTION', 'EQUATION', 'CHEMICAL_EQUATION', 'BONDING', 'FLOWCHART', 'DIAGRAM', 'TABLE']),
    text: z.string().max(12000), questionNumber: z.string().max(80),
    box: normalizedBox.nullable().catch(null), labels: z.array(z.string().max(200)).max(100),
    relationships: z.array(z.string().max(500)).max(100),
    sloIds: z.array(z.string().max(80)).max(10),
    uncertainty: z.string().max(2000),
  })).max(100),
});
export const extractionResponseSchema = { type: 'OBJECT', properties: {
  text: { type: 'STRING' }, continuation: { type: 'STRING' }, regions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    kind: { type: 'STRING', enum: ['TEXT', 'QUESTION', 'EQUATION', 'CHEMICAL_EQUATION', 'BONDING', 'FLOWCHART', 'DIAGRAM', 'TABLE'] },
    text: { type: 'STRING' }, questionNumber: { type: 'STRING' }, box: { type: 'ARRAY', nullable: true, items: { type: 'NUMBER' } }, labels: { type: 'ARRAY', items: { type: 'STRING' } }, relationships: { type: 'ARRAY', items: { type: 'STRING' } }, sloIds: { type: 'ARRAY', items: { type: 'STRING' } }, uncertainty: { type: 'STRING' },
  }, required: ['kind', 'text', 'questionNumber', 'box', 'labels', 'relationships', 'sloIds', 'uncertainty'] } },
}, required: ['text', 'continuation', 'regions'] };
export const sourceVerification = z.object({ faithful: z.boolean(), complete: z.boolean(), mappingsCorrect: z.boolean(), conflicts: z.array(z.string().max(2000)).max(100) });
export const verificationResponseSchema = { type: 'OBJECT', properties: { faithful: { type: 'BOOLEAN' }, complete: { type: 'BOOLEAN' }, mappingsCorrect: { type: 'BOOLEAN' }, conflicts: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['faithful', 'complete', 'mappingsCorrect', 'conflicts'] };

const elements = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '));
// Deliberately narrow grammar: unsupported ionic/LaTeX notation needs review.
// This checks atom conservation, not thermodynamics, valence or reaction validity.
export function chemicalBalance(equation: string): 'BALANCED' | 'UNBALANCED' | 'UNSUPPORTED' {
  const normal = equation.replace(/[₀-₉]/g, c => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(c))).replace(/\((aq|s|l|g)\)/g, '').replace(/\s/g, '');
  const sides = normal.split(/->|→|⇌|=/);
  if (sides.length !== 2 || normal.length > 2000) return 'UNSUPPORTED';
  const parse = (side: string) => {
    const total: Record<string, number> = {};
    for (const term of side.split('+')) {
      const match = /^(\d*)(.+)$/.exec(term); if (!match) throw Error();
      const multiplier = match[1] ? Number(match[1]) : 1;
      if (!Number.isSafeInteger(multiplier) || multiplier < 1 || multiplier > 10000) throw Error();
      const formula = match[2], stack: Record<string, number>[] = [{}]; let pos = 0;
      const count = () => { const m = /^\d+/.exec(formula.slice(pos)); if (!m) return 1; pos += m[0].length; const n = Number(m[0]); if (n < 1 || n > 10000) throw Error(); return n; };
      while (pos < formula.length) {
        if (formula[pos] === '(') { if (stack.length > 10) throw Error(); stack.push({}); pos++; continue; }
        if (formula[pos] === ')') { if (stack.length === 1) throw Error(); pos++; const group = stack.pop()!, n = count(); for (const [el, value] of Object.entries(group)) stack.at(-1)![el] = (stack.at(-1)![el] || 0) + value * n; continue; }
        const atom = /^[A-Z][a-z]?/.exec(formula.slice(pos)); if (!atom || !elements.has(atom[0])) throw Error();
        pos += atom[0].length; const n = count(); stack.at(-1)![atom[0]] = (stack.at(-1)![atom[0]] || 0) + n;
      }
      if (stack.length !== 1 || !Object.keys(stack[0]).length) throw Error();
      for (const [el, value] of Object.entries(stack[0])) { total[el] = (total[el] || 0) + value * multiplier; if (!Number.isSafeInteger(total[el])) throw Error(); }
    }
    return total;
  };
  try { const left = parse(sides[0]), right = parse(sides[1]); return [...new Set([...Object.keys(left), ...Object.keys(right)])].every(el => left[el] === right[el]) ? 'BALANCED' : 'UNBALANCED'; } catch { return 'UNSUPPORTED'; }
}

export function chemicalExpressions(text: string) {
  // Include equations embedded in question text, not only AI-classified regions.
  return [...new Set(text.split('\n').filter(line => /->|→|⇌/.test(line)).map(line => line.slice(line.lastIndexOf(':') + 1).trim().replace(/^\d+\.\s*/, '')).filter(line => chemicalBalance(line) !== 'UNSUPPORTED' || /\d+[A-Z]|[A-Z][a-z]?\d|\\ce\{|[A-Z][a-z]?\^|[A-Z][a-z]?[+-](?:\s|$)/.test(line)))].slice(0, 100);
}

export function searchableSource(extraction: z.infer<typeof pageExtraction>) {
  const figures = extraction.regions.filter(r => ['DIAGRAM', 'BONDING', 'FLOWCHART', 'TABLE'].includes(r.kind));
  return extraction.text + (figures.length ? '\n\nReviewed figure transcriptions:\n' + figures.map(r => [r.text, ...r.labels, ...r.relationships].join('\n')).join('\n\n') : '');
}
