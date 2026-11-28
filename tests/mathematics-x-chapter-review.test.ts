import { describe, expect, it } from 'vitest';
import { mathematicsChapterSourcesFor } from '@/lib/mathematicsChapterPapers';
import { getFallbackPaper } from '@/lib/paperDataService';
import { groupDuplicateQuestions } from '@/lib/uniqueQuestions';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { mathematicsSupplementaryPapers, mathematicsSupplementarySourceHref, mathematicsXResources } from '@/lib/mathematicsSupplementary';

describe('Reviewed Class X Mathematics chapter placement', () => {
  const classX = mathematicsChapterSourcesFor(getFallbackPaper, 10);
  const classIx = mathematicsChapterSourcesFor(getFallbackPaper, 9);
  const scored = (unit: number) => classX.filter(row => row.paper.examType !== 'SUPPLEMENTARY' && row.unit === unit && row.answers.length);
  const reference = (row: typeof classX[number]) => `${row.paper.paperCode}/${row.question.questionNumber}`;

  it('uses real assessment outcomes and groups repeated source questions in chapter practice', () => {
    const graph = scored(16);
    expect(graph.find(row => reference(row) === 'MTH-X-2022-P1/27')?.mapping.code).toBe('16.1.2');
    expect(graph.find(row => reference(row) === 'MTH-X-2025-P1/21')?.mapping.code).toBe('16.3.1');
    expect(graph.map(reference)).not.toContain('MTH-X-2022-P1/29'); // A vertical line is not a function of x.
    expect(classIx.some(row => reference(row) === 'MTH-X-2022-P1/27' && row.unit === 9)).toBe(true);
    const graphGroups = groupDuplicateQuestions(graph, row => row.question).map(group => group.map(reference));
    expect(graphGroups).toContainEqual(['MTH-X-2024-P1/22', 'MTH-X-2026-P1/22']);
    expect(graphGroups).toHaveLength(15);
    expect(groupDuplicateQuestions(scored(21), row => row.question)).toHaveLength(3);
    expect(scored(21).map(reference)).toContain('MTH-IX-2025-P1/42');
    expect(scored(21).map(reference)).not.toContain('MTH-IX-2017-P1/26');
  });

  it('includes reviewed supplementary items in the matching current grade and chapter', () => {
    for (const [code, number, grade, unit, answer] of [
      ['MTH-X-SCHOOL-QUIZ', '14', 10, 22, 'C'],
      ['MTH-X-SCHOOL-QUIZ', '37', 9, 7, 'B'],
      ['MTH-X-SCHOOL-QUIZ', '85', 10, 20, 'A'],
      ['MTH-X-ANNOTATED-SCAN', '22', 10, 16, 'D'],
      ['MTH-X-KP-PRACTICE', 'II-12', 10, 21, undefined],
    ] as const) {
      const source = (grade === 9 ? classIx : classX).find(row => row.paper.paperCode === code && row.question.questionNumber === number);
      expect(source).toMatchObject({ unit, mapping: { grade }, answers: answer ? [answer] : [] });
    }
    expect(classX.some(row => reference(row) === 'MTH-X-SCHOOL-QUIZ/53')).toBe(false);
  });

  it('retains source and assets for each new resource question without duplicate anchors', () => {
    expect(mathematicsSupplementaryPapers).toHaveLength(4);
    for (const resource of mathematicsXResources) {
      for (const pdf of [resource.original, resource.answers]) {
        if (pdf) expect(existsSync(resolve('public', pdf.slice(1)))).toBe(true);
      }
      const paper = getFallbackPaper(resource.paperCode)!;
      expect(paper.questions.length).toBeGreaterThan(0);
      expect(new Set(paper.questions.map(q => q.questionNumber)).size).toBe(paper.questions.length);
      for (const q of paper.questions) {
        expect(mathematicsSupplementarySourceHref(paper.paperCode, q.questionNumber)).toBe(resource.href + '#question-' + q.questionNumber);
        const region = q.sourceRegion;
        if (region.diagramUrl) expect(existsSync(resolve('public', region.diagramUrl.slice(1)))).toBe(true);
        if (region.choices) expect(region.choices[region.correct_answer!]).toBeTruthy();
        expect(q.questionText + Object.values(region.choices ?? {}).join('') + region.explanation).not.toMatch(/[\x08\x0c\x0d\t]/);
      }
    }
  });

  it('keeps only gradable probability questions and applicable trigonometry questions', () => {
    expect(scored(23).map(reference)).toEqual(['MTH-X-P1/41', 'MTH-X-P1/42', 'MTH-X-P1/43', 'MTH-X-P1/44', 'MTH-X-P1/45']);
    const trig = scored(19).map(reference);
    expect(trig).toHaveLength(8);
    expect(trig).toContain('MTH-X-2026-P1/36');
    expect(trig).not.toContain('MTH-X-2021-P1/38');
    expect(trig).not.toContain('MTH-X-2024-P1/31');
    const ladder = classX.find(row => reference(row) === 'MTH-X-2024-P1/31');
    expect(ladder?.mapping.code).toBe('19.4.1');
    expect(ladder?.answers).toEqual([]);
  });
});
