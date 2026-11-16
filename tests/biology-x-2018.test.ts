import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import manifest from '@/data/biology/ssc2_2018_source_manifest.json';

describe('Biology X annual 2018 source import and verification', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('BIO-X-2018-P1')!;
    const p2 = getFallbackPaper('BIO-X-2018-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6', '7a', '7b', '8a', '8b']);
    expect(p1.totalMarks).toBe(25);
    expect(p2.totalMarks).toBe(40);
    expect(p1.durationMinutes).toBe(35);
    expect(p2.durationMinutes).toBe(145);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([10, 10]);

    for (const p of [p1, p2]) {
      expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    }

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
    expect(manifest.crops).toHaveLength(29);

    // Verify Paper II marks: compulsory (Q1-Q6 = 4 + 4 + 4 + 4 + 4 + 5 = 25) + Q7 (7) + Q8 (8) = 40 marks
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((sum, q) => sum + q.marks, 0);
    expect(compulsory).toBe(25);
    expect(compulsory + 7 + 8).toBe(40);
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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`BIO-X-2018-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      expect(meta.current_slo).toBeTruthy();
      const grade = meta.current_mapping![0].grade;
      expect(sloMap.get(`${grade}:${meta.current_slo}`)).toBe(meta.current_mapping![0].description);
      expect(meta.in_syllabus).toBe(true);
    }

    // Check specific question mappings
    const q1 = papers[0].questions[0];
    expect(q1.sourceRegion.current_slo).toBe('5.3.1');
    expect(q1.topics?.[0]?.topic.topicNumber).toBe('5');

    const q4 = papers[0].questions[3];
    expect(q4.sourceRegion.current_slo).toBe('12.2.2');
    expect(q4.topics?.[0]?.topic.topicNumber).toBe('12');

    const q7 = papers[0].questions[6];
    expect(q7.sourceRegion.current_slo).toBe('13.3.1');
    expect(q7.topics?.[0]?.topic.topicNumber).toBe('13');

    const q10 = papers[0].questions[9];
    expect(q10.sourceRegion.current_slo).toBe('14.2.3');
    expect(q10.topics?.[0]?.topic.topicNumber).toBe('14');

    const q16 = papers[0].questions[15];
    expect(q16.sourceRegion.current_slo).toBe('16.4.5');
    expect(q16.topics?.[0]?.topic.topicNumber).toBe('16');

    const q25 = papers[0].questions[24];
    expect(q25.sourceRegion.current_slo).toBe('19.1.4');
    expect(q25.topics?.[0]?.topic.topicNumber).toBe('19');

    const q1Theory = papers[1].questions.find(q => q.questionNumber === '1')!.sourceRegion;
    expect(q1Theory.current_slo).toBe('5.3.9');
    expect(q1Theory.diagramUrl).toContain('biology-x-2018-paper-ii-q1.png');

    const q7a = papers[1].questions.find(q => q.questionNumber === '7a')!.sourceRegion;
    expect(q7a.current_slo).toBe('5.4.2');
    expect(q7a.better_response_image).toContain('biology-x-2018-emarking-q7a-stronger.png');
    expect(q7a.weaker_response_image).toContain('biology-x-2018-emarking-q7a-weaker.png');
  });

  it('ensures all 25 MCQs are gradable and match verified official keys', () => {
    const questions = getFallbackPaper('BIO-X-2018-P1')!.questions;
    expect(questions).toHaveLength(25);

    for (const q of questions) {
      const meta = q.sourceRegion;
      const choices = paperChoices(meta.choices);
      const answer = paperAnswer(meta, choices);
      expect(answer).toBeTruthy();
      expect(answer).toBe(meta.official_answer);
      expect(answer).toBe(meta.solved_correct_option);
      expect(meta.answer_status).toBe('OFFICIAL_CONFIRMED');
      expect(meta.explanation).toBeTruthy();
      expect(meta.explanation!.length).toBeGreaterThan(30);

      // Verify that every option has pedagogical feedback
      expect(meta.option_feedback!).toHaveLength(4);
      for (const fb of meta.option_feedback!) {
        expect(fb.reason).toBeTruthy();
        expect(fb.reason.length).toBeGreaterThan(15);
      }
    }
  });
});

