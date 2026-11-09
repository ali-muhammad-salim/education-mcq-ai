import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { formatSyllabusMath } from '@/lib/syllabusMath';
import { syllabusDisplayText } from '@/lib/syllabusPresentation';
import mathIX from '@/data/mathematics/ssc1_exact_syllabus.json';
import mathX from '@/data/mathematics/ssc2_exact_syllabus.json';

interface SyllabusSlo { description: string }
interface SyllabusSubtopic { slos: SyllabusSlo[] }
interface SyllabusUnit { subtopics: SyllabusSubtopic[] }

function descriptions(book: unknown): string[] {
  return (book as SyllabusUnit[]).flatMap((unit) =>
    unit.subtopics.flatMap((topic) => topic.slos.map((slo) => slo.description))
  );
}

function mathSpans(text: string): string[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((match) => match[1]);
}

describe('formatSyllabusMath', () => {
  it('typesets exponent laws', () => {
    const out = formatSyllabusMath('x^m · x^n = x^(m+n),\n(xy)^m = x^m y^m,\n(x/y)^m = x^m / y^m, where y ≠ 0,');
    expect(out).toContain('$x^{m} \\cdot x^{n} = x^{m+n}$');
    expect(out).toContain('$(xy)^{m} = x^{m} y^{m}$');
    expect(out).toContain('\\frac{x}{y}');
    expect(out).toContain('\\frac{x^{m}}{y^{m}}');
    expect(out).toContain('where $y \\ne 0$');
    expect(out.replace(/\$[^$]+\$/g, '')).not.toMatch(/[\^_]/);
  });

  it('typesets logarithms, subscripts and prose tails without mangling words', () => {
    const out = formatSyllabusMath('a. log_a(mn) = log_a(m) + log_a(n),\nwhere a > 0, a ≠ 1;');
    expect(out).toContain('a. $\\log_{a}(mn) = \\log_{a}(m) + \\log_{a}(n)$');
    expect(out).toContain('where $a > 0$, $a \\ne 1$;');
    expect(out).not.toContain('whe$');
  });

  it('typesets roots, trigonometry and conjugates', () => {
    const out = formatSyllabusMath(
      'calculate |z| = √(a^2 + b^2), the absolute value or modulus of a complex number z = a + ib;\n' +
      'b. z̿ = z, z z̄ = |z|^2, conjugate(z_1 ± z_2) = z̄_1 ± z̄_2;\n' +
      'sin^2(θ) + cos^2(θ) = 1;'
    );
    expect(out).toContain('$|z| = \\sqrt{a^{2} + b^{2}}$');
    expect(out).toContain('$\\overline{\\overline{z}} = z$');
    expect(out).toContain('$z \\bar{z} = |z|^{2}$');
    expect(out).toContain('$\\sin^{2}(θ) + \\cos^{2}(θ) = 1$');
  });

  it('normalizes parenthesised exponents and matrix inverses', () => {
    const out = formatSyllabusMath('a. px^(2n) + qx^n + r = 0, p ≠ 0,\nA A^(-1) = I = A^(-1) A');
    expect(out).toContain('$px^{2n} + qx^{n} + r = 0$');
    expect(out).toContain('$A A^{-1} = I = A^{-1} A$');
    expect(out).not.toContain('^(2n)');
  });

  it('applies ASCII math conversion only to the mathematics syllabus', () => {
    expect(syllabusDisplayText('x^2 = 4', 'mathematics')).toBe('$x^{2} = 4$');
    expect(syllabusDisplayText('x^2 = 4', 'physics')).toBe('x^2 = 4');
    expect(syllabusDisplayText('x^2 = 4')).toBe('x^2 = 4');
  });

  it('keeps letter prefixes and prose outside math spans', () => {
    const out = formatSyllabusMath('b. (x + p)(x + q)(x + r)(x + s) = k, where p + q = r + s,');
    expect(out).toMatch(/^b\. \$/);
    expect(out).toContain('where $p + q = r + s$');
  });

  it('leaves existing LaTeX and non-math prose untouched', () => {
    const latex = 'solve word problem using the transformer equation $\\frac{V_s}{V_p} = \\frac{I_p}{I_s}$;';
    expect(formatSyllabusMath(latex)).toBe(latex);
    const prose = 'describe the following properties of complex numbers:';
    expect(formatSyllabusMath(prose)).toBe(prose);
    const chem = 'retention factor (R_f);';
    expect(formatSyllabusMath(chem)).toBe('retention factor $(R_{f})$;');
  });

  it('preserves function names in stacked fractions', () => {
    expect(formatSyllabusMath('P(E) = n(E) / n(S)')).toContain(String.raw`\frac{n(E)}{n(S)}`);
    expect(formatSyllabusMath('log_m(n) = log_a(n) / log_a(m)')).toContain(String.raw`\frac{\log_{a}(n)}{\log_{a}(m)}`);
  });

  it('matches the source exponential, conjugates, identity and matrix example', () => {
    const slos=mathX.flatMap(u=>u.subtopics.flatMap(s=>s.slos));
    const formatted=(code:string)=>formatSyllabusMath(slos.find(s=>s.code===code)!.description);
    expect(formatted('15.3.2')).toContain(String.raw`p^{2x} - q\cdot p^{x+2} + k = 0`);
    const conjugates=formatted('17.3.2');
    expect(conjugates).toContain(String.raw`\overline{\overline{z}}`);
    expect(conjugates).toContain(String.raw`\overline{z_{1} \pm z_{2}}`);
    expect(conjugates).toContain(String.raw`\overline{z_{1} z_{2}}`);
    expect(conjugates).toContain(String.raw`\overline{\frac{z_{1}}{z_{2}}}`);
    expect(conjugates).not.toContain('operatorname{conjugate}');
    expect(formatted('18.5.8')).toContain('where $I$ is');
    const matrix=formatted('18.6.1');
    expect(matrix).toContain(String.raw`\begin{bmatrix}2 & 1 \\ 0 & 3\end{bmatrix}`);
    expect(matrix).toContain(String.raw`\begin{bmatrix}1 \\ 0\end{bmatrix}`);
    expect(matrix).toContain(String.raw`\begin{bmatrix}3 \\ 2\end{bmatrix}`);
    expect(matrix).not.toContain('[[');
  });

  it('emits KaTeX-parseable spans for every formula in the mathematics syllabus', () => {
    for (const book of [mathIX, mathX]) {
      for (const description of descriptions(book)) {
        const formatted = formatSyllabusMath(description);
        for (const span of mathSpans(formatted)) {
          expect(() => katex.renderToString(span, { throwOnError: true, strict: false })).not.toThrow();
        }
      }
    }
  });

  it('removes every stray caret and underscore from the mathematics syllabus', () => {
    for (const book of [mathIX, mathX]) {
      for (const description of descriptions(book)) {
        const outside = formatSyllabusMath(description).replace(/\$[^$]+\$/g, '');
        expect(outside).not.toMatch(/[\^_]/);
      }
    }
  });
});
