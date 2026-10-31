import { describe, expect, it } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import syllabus from '@/data/computer-science/ssc1_exact_syllabus.json';

describe('Computer Science IX source materials', () => {
  it('lists papers that have digital questions and original documents', () => {
    const papers = getAllStandardPapers().filter(p => p.paperCode.startsWith('CS-IX-'));
    expect(papers.length).toBe(9);
    for (const item of papers) {
      expect(item.fileUrl).toMatch(/^\/materials\/ssc\/computer-science\//);
      expect(getFallbackPaper(item.paperCode)?.questions.length).toBeGreaterThan(0);
    }
  });

  it('preserves exceptional board-key answers without a false single key', () => {
    const q2023 = getFallbackPaper('CS-IX-2023-P1')!.questions.find(q => q.questionNumber === '11')!;
    const q2024 = getFallbackPaper('CS-IX-2024-P1')!.questions.find(q => q.questionNumber === '9')!;
    expect(q2023.sourceRegion.official_answer).toBe('*');
    expect(q2023.sourceRegion.correct_answer).toBe('');
    expect(q2024.sourceRegion.official_answer).toBe('D,A');
  });

  it('does not publish a non-existent current SLO as reviewed', () => {
    const codes = new Set(syllabus.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos.map(slo => slo.code))));
    for (const year of [2022, 2023, 2024, 2025]) {
      const paper = getFallbackPaper(`CS-IX-${year}-P1`)!;
      for (const q of paper.questions) {
        const meta = q.sourceRegion;
        if (meta.current_syllabus_reviewed && meta.current_slo) expect(codes.has(meta.current_slo)).toBe(true);
      }
    }
  });
});
