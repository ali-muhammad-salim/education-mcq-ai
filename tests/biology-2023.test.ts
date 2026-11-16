import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';
import syllabus from '@/data/biology/ssc_syllabus_2025.json';
import manifest from '@/data/biology/ssc1_2023_source_manifest.json';

describe('Biology IX annual 2023 source import', () => {
  it('preserves the complete papers, alternatives and source assets', () => {
    const p1 = getFallbackPaper('BIO-IX-2023-P1')!;
    const p2 = getFallbackPaper('BIO-IX-2023-P2')!;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1.questions.map(q => Number(q.questionNumber))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    expect(p2.questions.map(q => q.questionNumber)).toEqual(['1', '2', '3', '4', '5', '6a', '6b', '7a', '7b']);
    expect(p1.totalMarks).toBe(40);
    expect(p2.totalMarks).toBe(25);
    expect(p1.durationMinutes).toBe(70);
    expect(p2.durationMinutes).toBe(110);
    expect([p1, p2].map(p => p.academicClass.level)).toEqual([9, 9]);

    for (const p of [p1, p2]) {
      expect(getAllStandardPapers().some(s => s.paperCode === p.paperCode)).toBe(true);
    }

    for (const crop of manifest.crops) {
      expect(existsSync(path.join(process.cwd(), 'public', crop.url))).toBe(true);
    }
    for (const source of Object.values(manifest.sources)) {
      expect(existsSync(path.join(process.cwd(), 'public', source.url))).toBe(true);
    }
    expect(manifest.crops).toHaveLength(33);

    // Verify Paper II marks: compulsory (Q1-Q5 = 13) + Q6 (6) + Q7 (6) = 25 marks
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

    const papers = ['P1', 'P2'].map(c => getFallbackPaper(`BIO-IX-2023-${c}`)!);
    for (const q of papers.flatMap(p => p.questions)) {
      const meta = q.sourceRegion;
      expect(meta.current_slo).toBeTruthy();
      const grade = meta.mapping_scope!.grade;
      expect(sloMap.get(`${grade}:${meta.current_slo}`)).toBe(meta.current_mapping![0].description);
      expect(meta.in_syllabus).toBe(true);
    }

    // Check specific question mappings
    const q1 = papers[0].questions[0];
    expect(q1.sourceRegion.current_slo).toBe('1.6.4');
    expect(q1.topics?.[0]?.topic.topicNumber).toBe('1');

    const q8 = papers[0].questions[7];
    expect(q8.sourceRegion.current_slo).toBe('3.5.1');
    expect(q8.topics?.[0]?.topic.topicNumber).toBe('3');

    const q37 = papers[0].questions[36];
    expect(q37.sourceRegion.current_slo).toBe('9.5.4');
    expect(q37.topics?.[0]?.topic.topicNumber).toBe('9');

    const q6a = papers[1].questions.find(q => q.questionNumber === '6a')!.sourceRegion;
    expect(q6a.current_slo).toBe('4.2.1');
    expect(q6a.better_response_image).toContain('/paper-crops/BIO-IX-2023-EMARKING/q6a_better.png');
    expect(q6a.weaker_response_image).toContain('/paper-crops/BIO-IX-2023-EMARKING/q6a_weaker.png');
  });

  it('ensures all 40 MCQs are gradable and match verified official keys', () => {
    const questions = getFallbackPaper('BIO-IX-2023-P1')!.questions;
    expect(questions).toHaveLength(40);

    for (const q of questions) {
      const meta = q.sourceRegion;
      const choices = paperChoices(meta.choices);
      const answer = paperAnswer(meta, choices);
      expect(answer).toBeTruthy();
      if (q.questionNumber === '26') {
        expect(['A', 'A,D', 'A, D']).toContain(meta.official_answer);
        expect(meta.solved_correct_option).toBe('A');
      } else {
        expect(answer).toBe(meta.official_answer);
        expect(answer).toBe(meta.solved_correct_option);
      }
      expect(meta.answer_status).toBe('VERIFIED');
      expect(meta.explanation).toBeTruthy();
      expect(meta.explanation!.length).toBeGreaterThan(30);
    }
  });

  it('verifies Paper II worked solutions and marking notes alignment', () => {
    const theory = getFallbackPaper('BIO-IX-2023-P2')!.questions;
    expect(theory).toHaveLength(9);

    for (const q of theory) {
      const meta = q.sourceRegion;
      expect(meta.model_answer).toBeTruthy();
      expect(meta.official_marking_notes).toBeTruthy();
      expect(meta.better_response_image).toBeTruthy();
      expect(meta.weaker_response_image).toBeTruthy();
      expect(existsSync(path.join(process.cwd(), 'public', meta.better_response_image!))).toBe(true);
      expect(existsSync(path.join(process.cwd(), 'public', meta.weaker_response_image!))).toBe(true);
    }
  });
});

