import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StructuredContent from '../components/StructuredContent';
import { hsscComputerSciencePapers } from '../lib/hsscComputerSciencePapers';
import { hsscMcqsData } from '../lib/hsscMcqsData';
import { paperAnswer, paperChoices } from '../lib/paperPresentation';

const modelPapers = hsscComputerSciencePapers.filter(p => p.examType === 'MODEL_EXAM');

describe('HSSC Computer Science model publications', () => {
  it('includes all source questions and both ERQ alternatives with valid grade mappings', () => {
    expect(modelPapers).toHaveLength(4);
    for (const paper of modelPapers) {
      const mcq = paper.paperCode.endsWith('-P1');
      expect(paper.questions).toHaveLength(mcq ? 50 : 11);
      expect(paper.durationMinutes).toBe(90);
      for (const question of paper.questions) {
        expect(question.sourceRegion.mapping_scope?.grade).toBe(paper.academicClass.level);
        expect(question.slos?.length).toBeGreaterThan(0);
        if (mcq) {
          expect(Object.keys(paperChoices(question.sourceRegion.choices))).toEqual(['A', 'B', 'C', 'D']);
          expect(question.sourceRegion.option_feedback?.map(item => item.key)).toEqual(['A', 'B', 'C', 'D']);
        } else {
          expect(question.sourceRegion.model_answer).toBeTruthy();
        }
      }
      if (!mcq) {
        expect(paper.questions.filter(q => !q.questionNumber.endsWith('b')).reduce((sum, q) => sum + (q.marks ?? 0), 0)).toBe(35);
        for (const group of ['8', '9']) {
          expect(paper.questions.filter(q => q.sourceRegion.choice_group === group).map(q => q.questionNumber)).toEqual([group + 'a', group + 'b']);
        }
      }
    }
  });

  it('keeps ambiguous printed items out of scored question pools', () => {
    const expected: Record<string, string[]> = {'CS-XI-P1': ['7', '19', '29', '36', '44', '50'], 'CS-XII-P1': ['13', '14']};
    for (const paper of modelPapers.filter(p => p.paperCode.endsWith('-P1'))) {
      const conflicts = paper.questions.filter(q => !paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices)));
      expect(conflicts.map(q => q.questionNumber)).toEqual(expected[paper.paperCode]);
      expect(conflicts.every(q => q.sourceRegion.answer_status === 'KEY_CONFLICT' && q.sourceRegion.answer_review_note)).toBe(true);
    }
    expect(hsscMcqsData(11, '/akueb/XI/computer-science', 'computer-science').papers.find(p => p.code === 'CS-XI-P1')?.questions).toHaveLength(44);
    expect(hsscMcqsData(12, '/akueb/XII/computer-science', 'computer-science').papers.find(p => p.code === 'CS-XII-P1')?.questions).toHaveLength(48);
  });

  it('renders the circuit choices as tables and preserves Python indentation', () => {
    const xi = hsscComputerSciencePapers.find(p => p.paperCode === 'CS-XI-P1')!;
    const truth = xi.questions.find(q => q.questionNumber === '3')!;
    for (const value of Object.values(paperChoices(truth.sourceRegion.choices))) {
      const html = renderToStaticMarkup(React.createElement(StructuredContent, {text: value}));
      expect(html).toContain('<table');
      expect(html.match(/<tr/g)).toHaveLength(5);
      expect(html).not.toContain('| --- |');
    }
    const nested = xi.questions.find(q => q.questionNumber === '26')!;
    const html = renderToStaticMarkup(React.createElement(StructuredContent, {text: paperChoices(nested.sourceRegion.choices).D}));
    expect(html).toContain('    if subject');
    expect(html).toContain('        print');
  });
});
