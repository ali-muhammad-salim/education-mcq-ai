import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getFallbackPaper, getAllStandardPapers } from '@/lib/paperDataService';
import { paperAnswer } from '@/lib/paperPresentation';
import manifest from '@/data/mathematics/ssc1_2022_source_manifest.json';

describe('Mathematics IX 2022 source import', () => {
  const paper = getFallbackPaper('MTH-IX-2022-P1')!;
  it('preserves all 50 questions, source timing, PDFs and diagram crops without inventing Paper II', () => {
    expect(paper.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(paper.totalMarks).toBe(50);
    expect(paper.durationMinutes).toBe(100);
    expect(getAllStandardPapers().filter(p => /^MTH-IX-2022-P[12]$/.test(p.paperCode))).toHaveLength(1);
    expect(getFallbackPaper('MTH-IX-2022-P2')).toBeNull();
    expect(Object.keys(manifest.sources).sort()).toEqual(['key', 'p1']);
    for (const source of Object.values(manifest.sources)) expect(createHash('sha256').update(readFileSync(path.join(process.cwd(), 'public', source.url))).digest('hex')).toBe(source.sha256);
    expect(manifest.crops).toHaveLength(14);
    for (const crop of manifest.crops) expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
  });
  it('uses the three independently corrected answers and retains every printed key', () => {
    const corrections: Record<number, string> = { 8: 'A', 14: 'B', 32: 'B' };
    for (const q of paper.questions) {
      const n = Number(q.questionNumber);
      const printed = manifest.officialKeyRows.find(k => Number(k.question) === n)!;
      expect(q.sourceRegion.official_answer).toBe(printed.answer);
      expect(paperAnswer(q.sourceRegion, q.sourceRegion.choices!)).toBe(corrections[n] || printed.answer);
      expect(q.sourceRegion.answer_status).toBe(corrections[n] ? 'ANSWER_CORRECTED' : 'VERIFIED');
      if (corrections[n]) expect(q.sourceRegion.answer_review_note).toBeTruthy();
    }
  });
  it('separates current IX, moved X and historical outcomes', () => {
    const counts = (status: string) => paper.questions.filter(q => q.sourceRegion.mapping_status === status).length;
    expect(counts('IN_SCOPE')).toBe(34);
    expect(counts('MOVED_TO_GRADE_X')).toBe(9);
    expect(counts('NO_DIRECT_OUTCOME')).toBe(7);
    for (const q of paper.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME')) expect(q.sourceRegion.current_mapping).toEqual([]);
  });
});
