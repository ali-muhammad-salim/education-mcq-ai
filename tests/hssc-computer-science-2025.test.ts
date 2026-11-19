import { describe, it, expect } from 'vitest';
import { hsscXiAnnualComputerSciencePapers } from '@/lib/hsscXiAnnualComputerScience';
import { getFallbackPaper } from '@/lib/paperDataService';
import { hsscMcqsData } from '@/lib/hsscMcqsData';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';

describe('Computer Science Class XI Annual 2025', () => {
  it('loads Paper I and Paper II with accurate structure and marks', () => {
    const p1 = hsscXiAnnualComputerSciencePapers.find(p => p.id === 'CS-XI-2025-P1');
    const p2 = hsscXiAnnualComputerSciencePapers.find(p => p.id === 'CS-XI-2025-P2');

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1!.totalMarks).toBe(50);
    expect(p1!.questions.length).toBe(50);

    expect(p2!.totalMarks).toBe(35);
    expect(p2!.questions.length).toBe(10); // 1-6, 7a, 7b, 8a, 8b

    // Verify all 50 MCQs have complete choices, official and verified answers, feedback, and explanations
    for (const q of p1!.questions) {
      expect(q.questionType).toBe('MULTIPLE_CHOICE');
      const choices = paperChoices(q.sourceRegion.choices);
      expect(Object.keys(choices)).toEqual(['A', 'B', 'C', 'D']);
      const answer = paperAnswer(q.sourceRegion, choices);
      expect(answer).toMatch(/^[A-D]$/);
      expect(q.sourceRegion.explanation).toBeTruthy();
      expect(q.sourceRegion.option_feedback).toHaveLength(4);
    }

    // Verify Paper II specific questions: Q1 tables, Q2 tables, Q8a diagram
    const q1 = p2!.questions.find(q => q.questionNumber === '1');
    expect(q1).toBeDefined();
    expect(q1!.marks).toBe(6);
    expect(q1!.questionText).toContain('| Type of Device | Device 1 | Device 2 |');

    const q2 = p2!.questions.find(q => q.questionNumber === '2');
    expect(q2).toBeDefined();
    expect(q2!.marks).toBe(3);
    expect(q2!.questionText).toContain('| S.No. | DRAM | SRAM |');

    const q8a = p2!.questions.find(q => q.questionNumber === '8a');
    expect(q8a).toBeDefined();
    expect(q8a!.marks).toBe(7);
    expect(q8a!.diagramBased).toBe(true);
    expect(q8a!.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2025-P2/question-8a.png');

    const q8b = p2!.questions.find(q => q.questionNumber === '8b');
    expect(q8b).toBeDefined();
    expect(q8b!.marks).toBe(7);
  });

  it('correctly classifies in-syllabus, out-of-syllabus, and Class XII migrated questions', () => {
    const p1 = hsscXiAnnualComputerSciencePapers.find(p => p.id === 'CS-XI-2025-P1')!;

    // Exactly Q33 and Q34 match Class XI 2025 syllabus (1.5.2 Network Topologies)
    const inSyllabusGrade11 = p1.questions.filter(q => q.sourceRegion.in_syllabus && q.sourceRegion.mapping_scope?.grade === 11);
    expect(inSyllabusGrade11.map(q => q.questionNumber)).toEqual(['33', '34']);
    expect(inSyllabusGrade11[0].slos?.[0]?.slo?.code).toBe('1.5.2');
    expect(inSyllabusGrade11[1].slos?.[0]?.slo?.code).toBe('1.5.2');

    // 9 database questions migrated to Class XII Unit 11 in 2025 syllabus
    const migratedToGrade12 = p1.questions.filter(q => q.sourceRegion.mapping_scope?.grade === 12);
    expect(migratedToGrade12.map(q => q.questionNumber)).toEqual(['40', '42', '43', '44', '45', '47', '48', '49', '50']);
    expect(migratedToGrade12.every(q => q.sourceRegion.in_syllabus === true)).toBe(true);
    expect(migratedToGrade12[0].sourceRegion.mapping_reason).toContain('Database items now belong to Class XII');

    // Remaining 39 legacy hardware/networking MCQs have no direct outcome
    const unmapped = p1.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME');
    expect(unmapped.length).toBe(39);
    expect(unmapped.every(q => q.slos?.length === 0)).toBe(true);
    expect(unmapped.every(q => q.sourceRegion.out_of_syllabus === true)).toBe(true);

    // Paper II mapping checks
    const p2 = hsscXiAnnualComputerSciencePapers.find(p => p.id === 'CS-XI-2025-P2')!;
    const p2Unmapped = p2.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME');
    expect(p2Unmapped.length).toBe(9); // Q1-Q7, Q8a have no direct outcome in 2025 syllabus
    const p2Grade12 = p2.questions.filter(q => q.sourceRegion.mapping_scope?.grade === 12);
    expect(p2Grade12.map(q => q.questionNumber)).toEqual(['8b']);
    expect(p2Grade12[0].slos?.[0]?.slo?.code).toBe('11.11.3');
  });

  it('serves CS-XI-2025-P1 and CS-XI-2025-P2 via paperDataService getFallbackPaper', () => {
    const p1 = getFallbackPaper('CS-XI-2025-P1');
    const p2 = getFallbackPaper('CS-XI-2025-P2');

    expect(p1).toBeDefined();
    expect(p1?.questions.length).toBe(50);

    expect(p2).toBeDefined();
    expect(p2?.questions.length).toBe(10);
  });

  it('populates chapterwise MCQs cleanly in hsscMcqsData without polluting other units', () => {
    const dataXI = hsscMcqsData(11, '/akueb/XI/computer-science', 'computer-science');
    expect(dataXI.papers.some(p => p.code === 'CS-XI-2025-P1')).toBe(true);

    const paperViewXI = dataXI.papers.find(p => p.code === 'CS-XI-2025-P1');
    expect(paperViewXI?.questions.length).toBe(50);

    // Unit 1 (Computing Systems) receives only Q33 and Q34
    const unit1 = dataXI.units.find(u => u.unitNumber === 1);
    expect(unit1).toBeDefined();
    const groupU1 = unit1!.groups.find(g => g.paperCode === 'CS-XI-2025-P1');
    expect(groupU1?.questionIds).toEqual(['CS-XI-2025-P1-q33', 'CS-XI-2025-P1-q34']);

    // Units 2 through 8 have 0 questions from CS-XI-2025-P1
    for (const unit of dataXI.units.filter(u => u.unitNumber > 1)) {
      const grp = unit.groups.find(g => g.paperCode === 'CS-XI-2025-P1');
      expect(grp?.questionIds ?? []).toHaveLength(0);
    }

    // In Class XII MCQs, CS-XI-2025-P1 appears as chapterOnly for Unit 11 (DBMS)
    const dataXII = hsscMcqsData(12, '/akueb/XII/computer-science', 'computer-science');
    const paperViewXII = dataXII.papers.find(p => p.code === 'CS-XI-2025-P1');
    expect(paperViewXII?.chapterOnly).toBe(true);

    const unit11 = dataXII.units.find(u => u.unitNumber === 11);
    expect(unit11).toBeDefined();
    const groupU11 = unit11!.groups.find(g => g.paperCode === 'CS-XI-2025-P1');
    expect(groupU11?.questionIds).toHaveLength(9);
  });
});
