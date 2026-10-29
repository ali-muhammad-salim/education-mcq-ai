import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import mcqs from '@/data/physics/ssc2_2025_past_mcqs.json';
import crqs from '@/data/physics/ssc2_2025_past_crqs.json';
import key from '@/data/physics/ssc2_2025_official_key.json';
import syllabus from '@/data/physics/ssc2_exact_syllabus.json';
import { getFallbackPaper } from '@/lib/paperDataService';

const assetExists = (url: string) => existsSync(path.join(process.cwd(), 'public', url.replace(/^\//, '')));

describe('2025 Class X Physics source package', () => {
  it('keeps all 40 MCQs tied to the printed answer key and real source assets', () => {
    expect(mcqs.map(item => Number(item.questionNumber))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(key.entries.map(item => item.questionNumber)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    const outcomes = new Map(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos)).map(slo => [slo.code, slo.description]));
    for (const item of mcqs) {
      const printed = key.entries.find(entry => entry.questionNumber === Number(item.questionNumber));
      expect(item.correctOption).toBe(printed?.printedKey);
      expect(Object.keys(item.options)).toContain(item.correctOption);
      if (item.current_syllabus_reviewed) expect(outcomes.get(item.current_slo)).toBe(item.current_mapping[0]?.description);
      expect(assetExists(item.pageScanUrl)).toBe(true);
      if (item.diagramUrl) expect(assetExists(item.diagramUrl)).toBe(true);
    }
    expect(assetExists('/materials/ssc/physics/ssc-2/physics-x-2025-paper-i.pdf')).toBe(true);
    expect(assetExists(key.sourceUrl)).toBe(true);
    expect(mcqs.filter(item => !item.current_syllabus_reviewed).map(item => Number(item.questionNumber))).toEqual([1, 3, 8, 17, 20, 27, 32, 34, 35]);
  });

  it('serves Paper II with the original PDF but withholds unreviewed generated solutions', () => {
    expect(crqs.map(item => item.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6.a', '6.b', '7.a', '7.b']);
    const paper = getFallbackPaper('PHY-X-2025-P2');
    expect(paper?.questions).toHaveLength(9);
    expect(assetExists(paper!.fileUrl!)).toBe(true);
    expect(assetExists('/materials/ssc/physics/ssc-2/physics-x-2025-emarking.pdf')).toBe(true);
    for (const question of paper!.questions) {
      expect(question.sourceRegion.current_syllabus_reviewed).toBe(false);
      expect(question.sourceRegion.model_answer).toBeUndefined();
      expect(question.sourceRegion.rubric).toBeUndefined();
      expect(question.sourceRegion.answer_review_note).toContain('pending source review');
      expect(assetExists(question.sourceRegion.pageScanUrl!)).toBe(true);
    }
  });
});
