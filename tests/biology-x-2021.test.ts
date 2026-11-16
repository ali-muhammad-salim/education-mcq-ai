import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import manifest from '@/data/biology/ssc2_2021_source_manifest.json';

describe('Biology X annual 2021 source import and verification', () => {
  it('preserves the complete papers, marks, duration and source assets', () => {
    const p1 = getFallbackPaper('BIO-X-2021-P1')!;
    expect(p1).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(p1.totalMarks).toBe(50);
    expect(p1.durationMinutes).toBe(100);
    expect(p1.academicClass.level).toBe(10);

    expect(getAllStandardPapers().some(s => s.paperCode === p1.paperCode)).toBe(true);

    for (const crop of manifest.crops) {
      const fullPath = path.join(process.cwd(), 'public', crop.url);
      expect(existsSync(fullPath)).toBe(true);
      expect(statSync(fullPath).size).toBeGreaterThan(1000);
    }
    for (const source of Object.values(manifest.sources)) {
      const fullPath = path.join(process.cwd(), 'public', source.url);
      expect(existsSync(fullPath)).toBe(true);
      expect(statSync(fullPath).size).toBeGreaterThan(1000);
    }
    expect(manifest.crops).toHaveLength(19);
  });

  it('maps every question to current 2025 SSC Biology syllabus outcomes', () => {
    const sloMap = new Map<string, string>();
    for (const grade of ['9', '10'] as const) {
      for (const unit of syllabus[grade]) {
        for (const sub of unit.subtopics) {
          for (const slo of sub.slos) {
            sloMap.set(`${grade}:${slo.code}`, slo.description);
          }
        }
      }
    }

    const paper = getFallbackPaper('BIO-X-2021-P1')!;
    for (const q of paper.questions) {
      const meta = q.sourceRegion;
      expect(meta.current_slo).toBeTruthy();
      const grade = meta.current_mapping![0].grade;
      expect(sloMap.get(`${grade}:${meta.current_slo}`)).toBe(meta.current_mapping![0].description);
      expect(meta.in_syllabus).toBe(true);
    }

    // Check specific question mappings
    const q1 = paper.questions[0];
    expect(q1.sourceRegion.current_slo).toBe('11.3.2');

    const q4 = paper.questions[3];
    expect(q4.sourceRegion.current_slo).toBe('13.3.1');

    const q8 = paper.questions[7];
    expect(q8.sourceRegion.current_slo).toBe('13.3.13');

    const q20 = paper.questions[19];
    expect(q20.sourceRegion.current_slo).toBe('14.1.4');

    const q34 = paper.questions[33];
    expect(q34.sourceRegion.current_slo).toBe('17.2.1');

    const q48 = paper.questions[47];
    expect(q48.sourceRegion.current_slo).toBe('14.1.3');

    const q50 = paper.questions[49];
    expect(q50.sourceRegion.current_slo).toBe('10.2.2');
  });

  it('verifies scoring and the reviewed answer correction', () => {
    const questions = getFallbackPaper('BIO-X-2021-P1')!.questions;
    expect(questions).toHaveLength(50);

    for (const q of questions) {
      const num = Number(q.questionNumber);
      const meta = q.sourceRegion;
      const choices = paperChoices(meta.choices);
      const answer = paperAnswer(meta, choices);

      expect(meta.explanation).toBeTruthy();
      expect(meta.explanation!.length).toBeGreaterThan(25);
      expect(meta.option_feedback!).toHaveLength(4);
      expect(answer).toBeTruthy();

      if (num === 47) {
        expect(answer).toBe('A');
        expect(meta.official_answer).toBe('C');
        expect(meta.answer_status).toBe('ANSWER_CORRECTED');
        expect(meta.answer_origin).toBe('BIOLOGICAL_EVALUATION');
        expect(meta.answer_review_note).toBeTruthy();
      } else {
        expect(answer).toBe(meta.official_answer);
        expect(meta.answer_status).toBe('ANSWER_CONFIRMED');
        expect(meta.answer_origin).toBe('OFFICIAL_KEY_VERIFIED');
      }
    }
  });
});
