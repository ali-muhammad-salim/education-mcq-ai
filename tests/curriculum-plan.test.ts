import { describe, it, expect } from 'vitest';
import { checkedCurriculumPlan, classForChapter } from '@/services/ingestion/curriculum-plan';
describe('Combined syllabus index allocation', () => {
  const entry = { classLevel: 9, chapterCode: '1', chapterTitle: 'Measurement', indexPage: 55, evidence: 'Class IX — 1. Measurement' };
  it('uses a rear index when the body has no grade headings', () => {
    const plan = checkedCurriculumPlan({ assignments: [entry, { ...entry, classLevel: 10, chapterCode: '11', chapterTitle: 'Waves', evidence: 'Class X — 11. Waves' }], conflicts: [] }, 60, [55]);
    expect(classForChapter(plan, '1', 'Measurement')).toBe(9);
    expect(classForChapter(plan, '1', 'Measurements')).toBe(9);
    expect(classForChapter(plan, '11', 'Waves')).toBe(10);
    expect(classForChapter(plan, '12', 'Unknown chapter')).toBeUndefined();
  });
  it('rejects evidence from pages the model never saw', () => expect(() => checkedCurriculumPlan({ assignments: [entry], conflicts: [] }, 60, [56])).toThrow(/not inspected/));
  it('allows restarted chapter numbering when titles establish distinct allocations', () => {
    const plan = checkedCurriculumPlan({ assignments: [entry, { ...entry, classLevel: 10, chapterTitle: 'Waves' }], conflicts: [] }, 60, [55]);
    expect(plan.conflicts).toEqual([]); expect(classForChapter(plan, '1', 'Waves')).toBe(10);
  });
  it('retains conflicts rather than assigning a reused code to a guessed class', () => {
    const plan = checkedCurriculumPlan({ assignments: [entry, { ...entry, classLevel: 10 }], conflicts: [] }, 60, [55]);
    expect(plan.conflicts.length).toBeGreaterThan(0);
    expect(classForChapter(plan, '1', 'Measurement')).toBeUndefined();
  });
});
