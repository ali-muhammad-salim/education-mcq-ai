import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { formatExplicitMath } from '@/lib/syllabusMath';
import xiModel from '@/data/physics/hssc_xi_model_mcq_feedback.json';
import xiiModel from '@/data/physics/hssc_xii_model_mcq_feedback.json';
import xi2022 from '@/data/physics/hssc_xi_2022_mcq_feedback.json';
import xi2025 from '@/data/physics/hssc_xi_2025_mcq_feedback.json';
import mathematics from '@/data/mathematics/ssc1_2024_past_mcqs.json';

const renderStrict = (latex: string) => katex.renderToString(latex, { throwOnError: true });

// Catch denominator overreach and splitting of TeX control symbols using real source rows.
describe('explicit slash fraction boundaries', () => {
  const originals = [
    { name: 'XI model row 17', text: xiModel[17][0], raw: String.raw`\Delta L=FL/(AY)=500(3)/[2(1.1\times10^{11})]\approx6.8\times10^{-9}\,\mathrm m`, fraction: String.raw`\frac{500(3)}{[2(1.1\times10^{11})]}\approx` },
    { name: 'XII model row 24', text: xiiModel[24][1], raw: String.raw`I_{\mathrm{rms}}=I_0/\sqrt2=1.23/\sqrt2\approx0.870\,\mathrm A`, fraction: String.raw`\frac{1.23}{\sqrt2}\approx` },
    { name: 'XI 2022 row 58', text: xi2022[58][0], raw: String.raw`L=9.8(2^2)/(4\pi^2)\approx0.993\,\mathrm m`, fraction: String.raw`\frac{9.8(2^{2})}{4\pi^{2}}\approx` },
    { name: 'XI 2025 row 14', text: xi2025[14][0], raw: String.raw`mgh/t=(500\times10\times50)/3600\approx69.4\,\mathrm W`, fraction: String.raw`\frac{500\times10\times50}{3600}\approx` },
    { name: 'XI 2025 row 32', text: xi2025[32][0], raw: String.raw`L=gT^2/(4\pi^2)\approx0.253\,\mathrm m`, fraction: String.raw`\frac{gT^{2}}{4\pi^{2}}\approx` },
  ];
  it.each(originals)('keeps $name valid and its approximation outside the denominator', ({ text, raw, fraction }) => {
    expect(text.match(/\$([^$]+)\$/)?.[1]).toBe(raw);
    expect(() => renderStrict(raw)).not.toThrow();
    const normalized = formatExplicitMath(raw);
    expect(() => renderStrict(normalized)).not.toThrow();
    expect(normalized).toContain(fraction);
    expect(normalized).toContain(String.raw`\,\mathrm`);
  });

  it.each([
    [String.raw`\left\{a/b+c\right\}`, String.raw`\left\{a/b+c\right\}`],
    [String.raw`\{a/b+c\}`, String.raw`\{a/b+c\}`],
    [String.raw`a/b\approx c`, String.raw`\frac{a}{b}\approx c`],
    [String.raw`a/b\leq c/d`, String.raw`\frac{a}{b}\leq\frac{c}{d}`],
    [String.raw`a/b\neq c`, String.raw`\frac{a}{b}\neq c`],
    [String.raw`a/b\,c`, String.raw`\frac{a}{b\,c}`],
    [String.raw`a/b\;c`, String.raw`\frac{a}{b\;c}`],
    [String.raw`a/b,c/d`, String.raw`\frac{a}{b},\frac{c}{d}`],
    [String.raw`a/b\times c`, String.raw`\frac{a}{b}\times  c`],
    [String.raw`a/(b\approx c)`, String.raw`\frac{a}{b\approx c}`],
    [String.raw`a/\sqrt2`, String.raw`\frac{a}{\sqrt2}`],
    [String.raw`a/\text{m/s}`, String.raw`\frac{a}{\text{m/s}}`],
    [String.raw`a/b-c/d`, String.raw`\frac{a}{b}-\frac{c}{d}`],
    [String.raw`a/b^{-2}`, String.raw`\frac{a}{b^{-2}}`],
  ])('preserves grammar boundaries in %s', (raw, expected) => {
    const normalized = formatExplicitMath(raw);
    expect(normalized).toBe(expected);
    expect(() => renderStrict(normalized)).not.toThrow();
  });
});

// A misspelled angle command makes the actual explanation/mapping equations unrenderable.
describe('SSC I 2024 angle source corrections', () => {
  it.each([40, 43, 44])('renders Q%i explanation and mappingReason strictly', (number) => {
    const question = mathematics.find(row => row.questionNumber === number)!;
    for (const text of [question.explanation, question.mappingReason]) {
      const equations = [...text.matchAll(/\$([^$]+)\$/g)].map(match => match[1]);
      expect(equations.length).toBeGreaterThan(0);
      for (const equation of equations) {
        expect(() => renderStrict(equation)).not.toThrow();
        expect(() => renderStrict(formatExplicitMath(equation))).not.toThrow();
      }
    }
  });
});
