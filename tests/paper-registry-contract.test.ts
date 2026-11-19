import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import math from '../data/mathematics/ssc1_model_crqs.json';
import modelMcqs from '../data/biology/ssc_model_mcqs.json';
import modelWritten from '../data/biology/ssc_model_written.json';
import syllabus from '../data/biology/ssc_syllabus_2025.json';

const annual = [
  ['IX', 2022, 'ssc1_2022', 50, 0],
  ['IX', 2024, 'ssc1_2024', 40, 9],
  ['X', 2022, 'ssc2_2022', 50, 0],
  ['X', 2023, 'ssc2_2023', 40, 8],
  ['X', 2025, 'ssc2_2025', 40, 9],
] as const;
const read = (name: string) => JSON.parse(fs.readFileSync(path.resolve('data/biology', name + '.json'), 'utf8'));
const biologyCases = [
  ...annual.flatMap(([roman, year, stem, mcqCount, writtenCount]) => [
    { code: `BIO-${roman}-${year}-P1`, rows: read(stem + '_past_mcqs'), count: mcqCount, model: false, mcq: true },
    ...(writtenCount ? [{ code: `BIO-${roman}-${year}-P2`, rows: read(stem + '_written'), count: writtenCount, model: false, mcq: false }] : []),
  ]),
  ...(['IX', 'X'] as const).flatMap(roman => [
    { code: `BIO-${roman}-MODEL-${roman === 'IX' ? 2026 : 2027}-P1`, rows: modelMcqs[roman], count: 40, model: true, mcq: true },
    { code: `BIO-${roman}-MODEL-${roman === 'IX' ? 2026 : 2027}-P2`, rows: modelWritten[roman], count: roman === 'IX' ? 10 : 9, model: true, mcq: false },
  ]),
];

describe('paper registry contracts', () => {
  it('resolves every published listing by both canonical id and code', () => {
    const papers = getAllStandardPapers();
    expect(papers.length).toBeGreaterThan(100);
    for (const listed of papers) {
      const byCode = getFallbackPaper(listed.paperCode);
      expect(byCode, listed.paperCode).not.toBeNull();
      expect(getFallbackPaper(listed.id), listed.id).toEqual(byCode);
      expect(byCode!.questions.length).toBe(listed._count.questions);
      expect(new Set(byCode!.questions.map(q => q.id)).size, listed.paperCode).toBe(byCode!.questions.length);
      for (const q of byCode!.questions) {
        expect(q.marks, q.id).toBeGreaterThan(0);
        for (const entry of q.sourceRegion.rubric ?? []) {
          expect(typeof entry.description, q.id).toBe('string');
          expect(Number.isFinite(entry.marks), q.id).toBe(true);
        }
        const answer = q.sourceRegion.correct_answer || q.sourceRegion.solved_correct_option;
        if (answer && q.questionType === 'MULTIPLE_CHOICE') expect(Object.keys(q.sourceRegion.choices ?? {}), q.id).toContain(answer);
      }
    }
    expect(getFallbackPaper('BIO-IX-1900-P1')).toBeNull();
  });

  it.each(['CHM-IX-P2', 'CHM-X-P2', 'CHM-IX-2025-P2'])('%s preserves distinct EITHER/OR question identities', code => {
    const paper = getFallbackPaper(code)!;
    expect(new Set(paper.questions.map(q => q.id)).size).toBe(paper.questions.length);
    for (const q of paper.questions.filter(q => /EITHER|OR/.test(q.questionNumber))) {
      expect(q.id).toContain(q.questionNumber.includes('EITHER') ? 'either' : 'or');
    }
    expect(getFallbackPaper(code)!.questions.map(q => q.questionNumber)).toEqual(paper.questions.map(q => q.questionNumber));
  });

  it('normalizes all 42 Math rubric strings using their explicit source marks without changing content', () => {
    const paper = getFallbackPaper('MTH-IX-P2')!;
    expect(paper.questions).toHaveLength(14);
    expect(paper.questions.flatMap(q => q.sourceRegion.rubric!)).toHaveLength(42);
    paper.questions.forEach((q, i) => {
      expect(q.questionNumber).toBe(math[i].questionNumber);
      expect(q.questionText).toBe(math[i].questionText);
      expect(q.marks).toBe(math[i].marks);
      expect(q.sourceRegion.rubric).toEqual(math[i].rubric.map(description => ({ marks: 1, description })));
      expect(math[i].rubric.every(entry => typeof entry === 'string')).toBe(true);
    });
  });

  it.each(biologyCases)('$code publishes source questions, mappings, answers and existing local assets', ({ code, rows, count, model, mcq }) => {
    const paper = getFallbackPaper(code);
    expect(paper, code).not.toBeNull();
    expect(paper!.questions).toHaveLength(count);
    expect(getAllStandardPapers().find(p => p.paperCode === code)?._count.questions).toBe(count);
    const asset = (url: string | null | undefined) => {
      if (url?.startsWith('/')) expect(fs.existsSync(path.resolve('public', url.split('#')[0].slice(1))), url).toBe(true);
    };
    asset(paper!.fileUrl);
    paper!.questions.forEach((q, i) => {
      const row = rows[i];
      const meta = q.sourceRegion;
      expect(q.questionNumber).toBe(mcq ? row.number : row[0]);
      expect(q.questionText).toBe(mcq ? row.stem : row[model ? 4 : 6]);
      expect(q.marks).toBe(mcq ? 1 : row[2]);
      expect(meta.pageNumber).toBe(mcq ? row.page : row[1]);
      expect(meta.current_mapping?.map(m => m.code)).toEqual(mcq ? [row.code] : model ? row[3] : [row[3]]);
      for (const mapping of meta.current_mapping ?? []) {
        const grade = mapping.grade ?? meta.mapping_scope!.grade;
        const outcomes = syllabus[String(grade) as '9' | '10'].flatMap(u => u.subtopics.flatMap(s => s.slos));
        expect(outcomes.some(o => o.code === mapping.code && o.description === mapping.description)).toBe(true);
      }
      if (mcq) {
        expect(Object.values(meta.choices!)).toEqual(row.choices);
        expect(meta.correct_answer || null).toBe(row.answer || null);
        expect(meta.solved_correct_option || null).toBe(row.answer || null);
        expect(meta.explanation).toBe(row.explanation);
        expect(meta.option_feedback?.map(f => f.reason)).toEqual(row.feedback);
        if (row.answerStatus) expect(meta.answer_status).toBe(row.answerStatus);
        if (!model) {
          expect(meta.official_answer).toBe(row.officialAnswer);
          expect(meta.slo).toBe(row.originalSlo);
          expect((meta as Record<string, unknown>).original_cognitive_level).toBe(row.originalLevel);
        }
      } else {
        expect(meta.model_answer).toBe(row[model ? 5 : 7]);
        if (!model) {
          expect(meta.slo).toBe(row[4]);
          expect(meta.official_marking_notes).toBe(row[8]);
        }
      }
      [meta.diagramUrl, meta.original_reference_source, meta.better_response_image, meta.weaker_response_image].forEach(asset);
    });
  });
});
