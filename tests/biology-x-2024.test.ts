import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import manifest from '@/data/biology/ssc2_2024_source_manifest.json';

describe('Biology X annual 2024 source import and verification', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('BIO-X-2024-P1')!;
    const p2 = getFallbackPaper('BIO-X-2024-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5a', '5b', '6a', '6b']);
    expect(p1.totalMarks).toBe(40);
    expect(p2.totalMarks).toBe(25);
    expect(p1.durationMinutes).toBe(70);
    expect(p2.durationMinutes).toBe(110);
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
    expect(manifest.crops).toHaveLength(23);

    // Verify Paper II marks: compulsory (Q1-Q4 = 3 + 4 + 3 + 3 = 13) + Q5 (6) + Q6 (6) = 25 marks
    const compulsory = p2.questions.filter(q => !q.sourceRegion.choice_group).reduce((sum, q) => sum + q.marks, 0);
    expect(compulsory).toBe(13);
    expect(compulsory + 6 + 6).toBe(25);
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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`BIO-X-2024-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      expect(meta.current_slo).toBeTruthy();
      const grade = meta.mapping_scope!.grade;
      expect(sloMap.get(`${grade}:${meta.current_slo}`)).toBe(meta.current_mapping![0].description);
      expect(meta.in_syllabus).toBe(true);
    }

    // Check specific question mappings
    const q1 = papers[0].questions[0];
    expect(q1.sourceRegion.current_slo).toBe('11.3.7');
    expect(q1.topics?.[0]?.topic.topicNumber).toBe('11');

    const q3 = papers[0].questions[2];
    expect(q3.sourceRegion.current_slo).toBe('11.3.6');
    expect(q3.topics?.[0]?.topic.topicNumber).toBe('11');

    const q18 = papers[0].questions[17];
    expect(q18.sourceRegion.current_slo).toBe('15.3.3');
    expect(q18.topics?.[0]?.topic.topicNumber).toBe('15');

    const q27 = papers[0].questions[26];
    expect(q27.sourceRegion.current_slo).toBe('16.4.2');
    expect(q27.topics?.[0]?.topic.topicNumber).toBe('16');

    const q40 = papers[0].questions[39];
    expect(q40.sourceRegion.current_slo).toBe('19.2.1');
    expect(q40.topics?.[0]?.topic.topicNumber).toBe('19');

    const q3Theory = papers[1].questions.find(q => q.questionNumber === '3')!.sourceRegion;
    expect(q3Theory.current_slo).toBe('14.3.2');
    expect(q3Theory.diagramUrl).toContain('biology-x-2024-paper-ii-q3.png');

    const q5a = papers[1].questions.find(q => q.questionNumber === '5a')!.sourceRegion;
    expect(q5a.current_slo).toBe('13.5.3');
    expect(q5a.better_response_image).toContain('biology-x-2024-emarking-q5a-stronger.png');
    expect(q5a.weaker_response_image).toContain('biology-x-2024-emarking-q5a-weaker.png');
  });

  it('ensures all 40 MCQs are gradable and match verified official keys', () => {
    const questions = getFallbackPaper('BIO-X-2024-P1')!.questions;
    expect(questions).toHaveLength(40);

    for (const q of questions) {
      const meta = q.sourceRegion;
      const choices = paperChoices(meta.choices);
      const answer = paperAnswer(meta, choices);
      expect(answer).toBeTruthy();
      if (q.questionNumber === '18') {
        expect(meta.official_answer).toBe('•');
        expect(meta.solved_correct_option).toBe('C');
        expect(answer).toBe('C');
        expect(meta.answer_status).toBe('ANSWER_CORRECTED');
      } else if (q.questionNumber === '27') {
        expect(meta.official_answer).toBe('A');
        expect(meta.solved_correct_option).toBe('C');
        expect(answer).toBe('C');
        expect(meta.answer_status).toBe('ANSWER_CORRECTED');
      } else {
        expect(answer).toBe(meta.official_answer);
        expect(answer).toBe(meta.solved_correct_option);
        expect(meta.answer_status).toBe('OFFICIAL_CONFIRMED');
      }
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
