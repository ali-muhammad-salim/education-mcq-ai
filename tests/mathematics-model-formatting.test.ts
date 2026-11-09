import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MathText from '@/components/MathText';
import StructuredContent from '@/components/StructuredContent';
import mcqs from '@/data/mathematics/ssc1_model_mcqs.json';
import theory from '@/data/mathematics/ssc1_model_crqs.json';

const render = (text: string) => renderToStaticMarkup(React.createElement(MathText, { text }));
describe('Class IX Mathematics model-paper source notation', () => {
  it('renders the reported questions and every option without raw formula fallbacks', () => {
    const selected = mcqs.filter(q => [7, 9, 14, 17, 18, 23, 26, 27, 28, 30, 42, 45].includes(q.questionNumber));
    for (const q of selected) for (const text of [q.stem, ...Object.values(q.options), q.explanation]) {
      const html = render(text);
      expect(html).toContain('katex');
      expect(html).not.toContain('katex-error');
      expect(html).not.toContain('$');
    }
    expect(render(selected.find(q => q.questionNumber === 26)!.stem)).toContain('\\overrightarrow{MP}');
    expect(render(selected.find(q => q.questionNumber === 45)!.stem)).toContain('\\dfrac{\\sin^2');
  });
  it('preserves the root scope, original table blanks and unfilled long division', () => {
    const q1 = theory.find(q => q.questionNumber === 'Q.1')!;
    expect(render(q1.questionText)).toContain('\\sqrt[3]{125\\times\\dfrac{x^{-4}}{x^2}}');
    const q4 = theory.find(q => q.questionNumber === 'Q.4a')!;
    const table = renderToStaticMarkup(React.createElement(StructuredContent, { text: q4.questionText }));
    expect(table).toContain('<table');
    expect(table).toContain('<td');
    expect(q4.questionText).not.toContain('...');
    expect(q4.questionText).not.toContain('$4$');
    expect(theory.find(q => q.questionNumber === 'Q.6')!.questionText).not.toContain('[96]');
    expect(render(theory.find(q => q.questionNumber === 'Q.9a')!.questionText)).toContain('\\tan^{-1}');
  });
  it('keeps the source mixed number and the mathematically verified answer to Q42', () => {
    const q = mcqs.find(q => q.questionNumber === 42)!;
    expect(q.stem).toContain('1\\dfrac{1}{4}');
    expect(q.correctOption).toBe('D');
    expect(q.options.D).toBe('$450^\\circ$');
    expect((1 + 1 / 4) * 360).toBe(450);
  });
});
