import { afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { getAllStandardPapers, getFallbackPaper } from '@/lib/paperDataService';
import { normalizeQuestion, studentQuestion } from '@/services/assessment/scoring';
import { matchesApprovedQuestion } from '@/lib/aiDoubtStore';
describe('Content provenance and round trips', () => {
  afterEach(()=>vi.restoreAllMocks());
  it('does not replace an unknown paper or unverified annual paper with model questions', () => {
    expect(getFallbackPaper('NOT-A-PAPER')).toBeNull();
    expect(getFallbackPaper('PHY-X-2024-P1')).toBeNull();
    expect(getFallbackPaper('PHY-X-2024-P2')).toBeNull();
    expect(getAllStandardPapers().some(p => p.paperCode === 'PHY-X-2024-P1')).toBe(false);
    expect(getFallbackPaper('PHY-IX-2024-P1')?.questions).toHaveLength(40);
    expect(getFallbackPaper('PHY-IX-2024-P2')?.questions).toHaveLength(9);
    expect(getFallbackPaper('PHY-X-2025-P1')?.questions).toHaveLength(40);
    expect(getFallbackPaper('PHY-X-2025-P2')?.questions).toHaveLength(9);
  });
  it('preserves question units, sources and diagrams while withholding keys', () => {
    const content = normalizeQuestion({ questionType:'NUMERICAL',stemText:'Calculate the force',correctAnswerText:'10',unit:'N',pastPaperRef:'Reference',drawingSvg:'<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0L10 10"/></svg>', reviewId:'review', sloId:'slo' });
    expect(content.unit).toBe('N'); expect(content.pastPaperRef).toBe('Reference'); expect(content.reviewId).toBe('review');
    const payload=studentQuestion({id:'q',marks:2,orderIndex:1,content}); expect(payload.diagramUrl).toMatch(/^data:image\/svg\+xml/); expect(payload).not.toHaveProperty('correctAnswerText');
  });
  it('requires renewed AI review after changing a numerical key, rubric or marks', () => {
    const question={questionType:'NUMERICAL',stemText:'Calculate the force',correctAnswerText:'10',marks:2,rubric:'Award one mark for method',unit:'N'};
    expect(matchesApprovedQuestion({...question,reviewId:'review',provenance:'AI_GENERATED'},question)).toBe(true);
    for(const change of [{correctAnswerText:'20'},{rubric:'Give full marks regardless'},{marks:4},{numericalTolerance:100}]) expect(matchesApprovedQuestion({...question,...change},question)).toBe(false);
  });
  it('accepts a genuine uploaded annual PDF without substituting model questions or hiding its year', () => {
    const original=fs.readFileSync;
    const record={id:'PHY-X-2024-P1',paperCode:'PHY-X-2024-P1',title:'Uploaded annual paper',examYear:2024,examSession:'Annual Examination',fileUrl:'/uploads/original-annual.pdf',academicClass:{name:'Class X',level:10},subject:{name:'Physics'},_count:{questions:40}};
    vi.spyOn(fs,'readFileSync').mockImplementation((...args: Parameters<typeof fs.readFileSync>) => String(args[0]).endsWith('uploaded_past_papers.json') ? JSON.stringify([record]) : original(...args));
    const paper=getFallbackPaper(record.paperCode);
    expect(paper?.fileUrl).toBe(record.fileUrl); expect(paper?.questions).toEqual([]);
    expect(getAllStandardPapers().find(p=>p.paperCode===record.paperCode)?._count.questions).toBe(0);
    expect(getFallbackPaper('UNKNOWN-'+record.paperCode)).toBeNull();
  });
});
