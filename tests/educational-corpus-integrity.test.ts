import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import { formatEducationalMath, formatExplicitMath } from '../lib/syllabusMath';

// Exercise the actual bundled educational fields, including solutions and marking notes.
// A newly introduced malformed formula must fail instead of silently falling back to raw LaTeX.
function collectText(value: unknown, texts: Set<string>) {
  if (typeof value === 'string' && value.trim()) texts.add(value);
  else if (Array.isArray(value)) value.forEach(item => collectText(item, texts));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectText(item, texts));
}

describe('registered educational corpus', () => {
  it('typesets formulas in stems, options, solutions, rubrics, and response notes', () => {
    const failures: { paper: string; question: string; expression: string }[] = [];
    const seen = new Set<string>();
    let formulas = 0;
    for (const summary of getAllStandardPapers()) {
      const paper = getFallbackPaper(summary.paperCode)!;
      for (const question of paper.questions) {
        const texts = new Set<string>();
        collectText(question.questionText, texts);
        for (const field of ['choices', 'explanation', 'model_answer', 'slo_text', 'better_response', 'weaker_response', 'suggestions', 'rubric', 'option_reasoning']) {
          collectText((question.sourceRegion as Record<string, unknown>)[field], texts);
        }
        for (const text of texts) {
          if (seen.has(text)) continue;
          seen.add(text);
          // Code literals are not math, even when they contain dollars.
          const prose = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g).filter((_, index) => index % 2 === 0).join(' ');
          for (const match of formatEducationalMath(prose).matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)) {
            formulas++;
            const expression = formatExplicitMath(match[1] || match[2]);
            try {
              katex.renderToString(expression, { throwOnError: true, strict: false, trust: false, maxExpand: 1000, maxSize: 50 });
            } catch {
              failures.push({ paper: paper.paperCode, question: String(question.questionNumber), expression });
            }
          }
        }
      }
    }
    expect(formulas).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  }, 60000);
});
