import { describe, expect, it } from 'vitest';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { sscComputerScienceMapping, sscComputerScienceOutcomes } from '@/lib/sscComputerScienceSyllabus';
import { sscComputerScienceTheory } from '@/lib/sscComputerScienceTheory';
import { questionSyllabus } from '@/lib/questionSyllabus';
import { paperAnswer } from '@/lib/paperPresentation';
import { gradablePracticeQuestions, sourcePracticeQuestion } from '@/services/assessment/service';

describe('Computer Science IX source materials', () => {
  it('lists papers that have digital questions and original documents', () => {
    const papers = getAllStandardPapers().filter(p => p.paperCode.startsWith('CS-IX-'));
    expect(papers.length).toBe(14);
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

  it('validates current mappings for all 28 Grade IX and X model and past theory papers', () => {
    const papers = getAllStandardPapers().filter(p => /^CS-(IX|X)-/.test(p.paperCode));
    expect(papers).toHaveLength(28);
    const questions = papers.flatMap(p => getFallbackPaper(p.paperCode)!.questions);
    expect(questions).toHaveLength(615);
    for (const question of questions) {
      const meta = question.sourceRegion;
      const outcomes = meta.current_mapping!;
      expect(meta.current_syllabus_reviewed).toBe(true);
      expect(meta.current_slo).toBe(outcomes[0]?.code ?? null);
      expect(meta.out_of_syllabus).toBe(!outcomes.length);
      for (const outcome of outcomes) expect(outcome).toEqual(sscComputerScienceOutcomes.get(outcome.code));
      if (outcomes.length) {
        expect(meta.mapping_scope?.grade).toBe(outcomes[0].grade);
        expect(questionSyllabus(meta, question.slos, outcomes[0].grade!, 'Computer Science', 'AKU-EB', true).href)
          .toBe(`/akueb/${outcomes[0].grade === 9 ? 'IX' : 'X'}/computer-science/syllabus#slo-${outcomes[0].code}`);
      }
    }
  });

  it('moves detailed OS outcomes to Grade X and leaves retired topics outside the current chapters', () => {
    const quizQuestion = (paperCode: string, number: string) => getFallbackPaper(paperCode)!.questions.find(q => q.questionNumber === number)!.sourceRegion;
    expect(quizQuestion('CS-IX-2025-P1', '15')).toMatchObject({ current_slo: '8.4.2', mapping_scope: { grade: 10 } });
    expect(quizQuestion('CS-IX-2025-P1', '3')).toMatchObject({ current_slo: null, out_of_syllabus: true });
    expect(quizQuestion('CS-X-2025-P1', '34')).toMatchObject({ current_slo: null, out_of_syllabus: true });
    expect(quizQuestion('CS-X-2025-P1', '26').mapping_reason).toContain('JavaScript');
    expect(sscComputerScienceMapping('CS-IX-2025-P2', 'Q.6b', null)?.current_slo).toBe('1.9.4');
    const unitEight = sscComputerScienceTheory(10).find(unit => unit.unitNumber === 8)!;
    expect(unitEight.crqs).toEqual(expect.arrayContaining([expect.objectContaining({
      sourceHref: '/past-papers/CS-IX-2025-P2#question-1', currentSlo: '8.5.3',
    })]));
  });

  it('retains printed exceptions in both grades and excludes them from single-answer scoring', () => {
    for (const [code, number, printed, alternatives] of [
      ['CS-X-2019-P1', '21', 'A,C', ['A', 'C']],
      ['CS-X-2023-P1', '37', 'D,B', ['D', 'B']],
      ['CS-X-2024-P1', '8', 'C,D', ['C', 'D']],
      ['CS-X-2024-P1', '26', 'D', ['C']],
      ['CS-X-2024-P1', '31', 'A', ['A', 'C']],
      ['CS-IX-2024-P1', '39', '•', undefined],
      ['CS-X-P1', '14', undefined, undefined],
    ] as const) {
      const { questions } = getFallbackPaper(code)!;
      const question = questions.find(q => q.questionNumber === number)!;
      const meta = question.sourceRegion;
      expect(meta.official_answer).toBe(printed);
      expect(meta.accepted_options).toEqual(alternatives);
      expect(paperAnswer(meta, meta.choices!)).toBeUndefined();
      expect(gradablePracticeQuestions(code, questions)).not.toContain(question);
    }
  });

  it('validates every scorable Computer Science IX and X MCQ against the quiz format', () => {
    const papers = getAllStandardPapers().filter(paper => /^CS-(IX|X)(-\d{4})?-P1$/.test(paper.paperCode));
    const sources = papers.map(paper => getFallbackPaper(paper.paperCode)!);
    expect(sources).toHaveLength(14);
    expect(sources.flatMap(paper => paper.questions)).toHaveLength(520);
    for (const paper of sources) {
      for (const question of gradablePracticeQuestions(paper.paperCode, paper.questions)) {
        const content = sourcePracticeQuestion(question);
        expect(content.options).toHaveLength(4);
        expect(content.options.filter(option => option.isCorrect)).toHaveLength(1);
      }
    }
  });
});
