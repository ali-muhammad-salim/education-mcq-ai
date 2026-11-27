import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import StructuredContent from '@/components/StructuredContent';
import manifest from '@/data/mathematics/ssc2_model_source_manifest.json';
import { isMathematicsWorkedQuestion, mathematicsChapterSources } from '@/lib/mathematicsChapterPapers';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperChoices, paperScoringAnswers } from '@/lib/paperPresentation';

const p1 = getFallbackPaper('MTH-X-P1')!;
const p2 = getFallbackPaper('MTH-X-P2')!;

it('registers both complete Class X model papers and their original assets', () => {
  const publicPath = (url: string) => join(process.cwd(), 'public', url);
  for (const source of Object.values(manifest.sources)) {
    expect(createHash('sha256').update(readFileSync(publicPath(source.url))).digest('hex')).toBe(source.sha256);
  }
  expect(manifest.crops.every(crop => existsSync(publicPath(crop.url)))).toBe(true);
  expect(getAllStandardPapers().filter(paper => /^MTH-X-P[12]$/.test(paper.paperCode)).map(paper => paper.examYear)).toEqual([2027, 2027]);
  expect([p1.durationMinutes, p2.durationMinutes]).toEqual([80, 100]);
  expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, index) => index + 1));
  expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4a', '4b', '5a', '5b', '6', '7', '8a', '8b', '9']);
  expect(p2.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(p2.totalMarks);
});

it('maps the model paper to chapters, exposes worked solutions and keeps ambiguous Q39 unscored', () => {
  const mapped = ([9, 10] as const).flatMap(grade => mathematicsChapterSources([p1, p2], grade));
  expect(mapped.filter(row => row.paper === p1 && row.answers.length)).toHaveLength(44);
  expect(mapped.find(row => row.paper === p1 && row.question.questionNumber === '29')?.unit).toBe(8);
  expect(mapped.filter(row => row.paper === p1 && row.unit === 23 && row.answers.length)).toHaveLength(5);
  const unscored = p1.questions.filter(q => !paperScoringAnswers(q.sourceRegion, paperChoices(q.sourceRegion.choices)).length);
  expect(unscored.map(q => q.questionNumber)).toEqual(['39']);
  expect(mapped.filter(row => row.paper === p2)).toHaveLength(12);
  expect(p2.questions.filter(q => isMathematicsWorkedQuestion(p2.paperCode, q))).toHaveLength(11);
  for (const question of [...p1.questions, ...p2.questions]) {
    const meta = question.sourceRegion;
    for (const value of [question.questionText, ...Object.values(meta.choices ?? {}), meta.explanation, meta.model_answer]) {
      if (!value?.includes('$')) continue;
      const html = renderToStaticMarkup(createElement(StructuredContent, { text: value }));
      expect(html, `Q${question.questionNumber}: ${value}`).toContain('katex');
      expect(html).not.toContain('katex-error');
    }
  }
});
