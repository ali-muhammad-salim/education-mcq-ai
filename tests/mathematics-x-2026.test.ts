import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '@/data/mathematics/ssc2_2026_source_manifest.json';
import { isMathematicsWorkedQuestion, mathematicsChapterSources } from '@/lib/mathematicsChapterPapers';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperChoices, paperScoringAnswers } from '@/lib/paperPresentation';

describe('Class X 2026 Mathematics papers', () => {
  const p1 = getFallbackPaper('MTH-X-2026-P1')!;
  const p2 = getFallbackPaper('MTH-X-2026-P2')!;

  it('preserves the original sources, questions and printed timing', () => {
    const publicPath = (url: string) => join(process.cwd(), 'public', url);
    for (const source of Object.values(manifest.sources)) {
      expect(createHash('sha256').update(readFileSync(publicPath(source.url))).digest('hex')).toBe(source.sha256);
    }
    expect(manifest.crops.every(crop => existsSync(publicPath(crop.url)))).toBe(true);
    expect(getAllStandardPapers().filter(paper => /^MTH-X-2026-P[12]$/.test(paper.paperCode))).toHaveLength(2);
    expect([p1.durationMinutes, p2.durationMinutes]).toEqual([80, 100]);
    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 45 }, (_, index) => index + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2a', '2b', '3a', '3b', '4', '5', '6', '7a', '7b', '8a', '8b', '9']);
    expect(p2.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((marks, q) => marks + q.marks, 0)).toBe(p2.totalMarks);
  });

  it('routes reviewed questions by current grade and excludes flagged items from scoring', () => {
    const byGrade = ([9, 10] as const).map(grade => mathematicsChapterSources([p1, p2], grade));
    const mapped = byGrade.flat();
    const scorable = p1.questions.filter(q => paperScoringAnswers(q.sourceRegion, paperChoices(q.sourceRegion.choices)).length);
    expect(scorable).toHaveLength(42);
    expect(p1.questions.filter(q => !scorable.includes(q)).map(q => q.questionNumber)).toEqual(['10', '39', '43']);
    expect(new Set(mapped.filter(row => row.paper === p1 && row.answers.length).map(row => row.question.id)).size).toBe(40);
    expect(byGrade[0].some(row => row.paper === p1 && row.question.questionNumber === '7' && row.unit === 6)).toBe(true);
    expect(byGrade[1].some(row => row.paper === p1 && row.question.questionNumber === '22' && row.unit === 16)).toBe(true);
    expect(mapped.filter(row => row.paper === p2)).toHaveLength(13);
    expect(p2.questions.filter(q => isMathematicsWorkedQuestion(p2.paperCode, q))).toHaveLength(11);
    expect(p2.questions.every(q => q.sourceRegion.model_answer && q.sourceRegion.official_marking_notes)).toBe(true);
  });
});
