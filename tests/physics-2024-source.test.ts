import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import mcqs from '@/data/physics/ssc1_2024_past_mcqs.json';
import crqs from '@/data/physics/ssc1_2024_past_crqs.json';
import key from '@/data/physics/ssc1_2024_official_key.json';
import { annual2024AnswerReviews } from '@/lib/legacyPaperEvidence';

const localAsset = (url: string) => path.join(process.cwd(), 'public', url.replace(/^\//, ''));

describe('2024 Class IX Physics source package', () => {
  it('contains the complete paper and keeps each answer tied to the supplied key', () => {
    expect(mcqs.map(item => Number(item.questionNumber))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(key.entries.map(item => item.questionNumber)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    for (const item of mcqs) {
      const answer = key.entries.find(entry => entry.questionNumber === Number(item.questionNumber));
      expect(answer?.answer).toBe(item.correctOption);
      expect(Object.keys(item.options)).toContain(item.correctOption);
      expect(item.pageNumber).toBeGreaterThanOrEqual(1);
      expect(existsSync(localAsset(item.pageScanUrl))).toBe(true);
      if (item.diagramUrl) expect(existsSync(localAsset(item.diagramUrl))).toBe(true);
    }
    expect(crqs.map(item => item.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6.a', '6.b', '7.a', '7.b']);
    for (const item of crqs) {
      expect(existsSync(localAsset(item.pageScanUrl))).toBe(true);
      if (item.diagramUrl) expect(existsSync(localAsset(item.diagramUrl))).toBe(true);
    }
  });

  it('retains the original PDFs and identifies unreadable or disputed key entries for review', () => {
    for (const url of [
      '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-i.pdf',
      '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-ii.pdf',
      '/materials/ssc/physics/ssc-1/physics-ix-2024-key.pdf',
      '/materials/ssc/physics/ssc-1/physics-ix-2024-emarking.pdf',
    ]) expect(existsSync(localAsset(url))).toBe(true);
    for (const entry of key.entries) {
      if (/[^ABCD]/.test(entry.printedKey)) {
        expect(annual2024AnswerReviews[entry.questionNumber]).toMatch(/review is pending/);
      }
    }
    expect(annual2024AnswerReviews[11]).toContain('keep the printed answer');
  });
});
