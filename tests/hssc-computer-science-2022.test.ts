import { describe, it, expect } from 'vitest';
import { hsscComputerScience2022Papers } from '@/lib/hsscComputerScience2022';
import { getFallbackPaper } from '@/lib/paperDataService';
import { hsscMcqsData } from '@/lib/hsscMcqsData';
import { paperAnswer, paperChoices } from '@/lib/paperPresentation';

describe('Computer Science Class XI Annual 2022', () => {
  it('loads Paper I (Theory & ATP) with accurate structure, marks, and diagrams', () => {
    const p1 = hsscComputerScience2022Papers.find(p => p.id === 'CS-XI-2022-P1');

    expect(p1).toBeDefined();
    expect(p1!.totalMarks).toBe(65);
    expect(p1!.questions.length).toBe(65);

    // Theory section: 1-50, ATP section: 51-65
    const theory = p1!.questions.filter(q => Number(q.questionNumber) <= 50);
    const atp = p1!.questions.filter(q => Number(q.questionNumber) > 50);
    expect(theory).toHaveLength(50);
    expect(atp).toHaveLength(15);

    for (const q of p1!.questions) {
      expect(q.questionType).toBe('MULTIPLE_CHOICE');
      const choices = paperChoices(q.sourceRegion.choices);
      expect(Object.keys(choices)).toEqual(['A', 'B', 'C', 'D']);
      const answer = paperAnswer(q.sourceRegion, choices);
      expect(answer).toMatch(/^[A-D]$/);
      expect(q.sourceRegion.explanation).toBeTruthy();
      expect(q.sourceRegion.option_feedback).toHaveLength(4);
    }

    // Verify visual diagram crops
    const q9 = p1!.questions.find(q => q.questionNumber === '9')!;
    expect(q9.diagramBased).toBe(true);
    expect(q9.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-9.png');

    const q13 = p1!.questions.find(q => q.questionNumber === '13')!;
    expect(q13.diagramBased).toBe(true);
    expect(q13.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-13.png');

    const q30 = p1!.questions.find(q => q.questionNumber === '30')!;
    expect(q30.diagramBased).toBe(true);
    expect(q30.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-30.png');

    const q39 = p1!.questions.find(q => q.questionNumber === '39')!;
    expect(q39.diagramBased).toBe(true);
    expect(q39.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-39.png');

    const q41 = p1!.questions.find(q => q.questionNumber === '41')!;
    expect(q41.diagramBased).toBe(true);
    expect(q41.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-41.png');

    const q42 = p1!.questions.find(q => q.questionNumber === '42')!;
    expect(q42.diagramBased).toBe(true);
    expect(q42.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-42.png');

    const q56 = p1!.questions.find(q => q.questionNumber === '56')!;
    expect(q56.diagramBased).toBe(true);
    expect(q56.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-56.png');

    const q57 = p1!.questions.find(q => q.questionNumber === '57')!;
    expect(q57.diagramBased).toBe(true);
    expect(q57.sourceRegion.choices?.A).toContain('/paper-crops/CS-XI-2022-P1/question-57-a.png');

    const q58 = p1!.questions.find(q => q.questionNumber === '58')!;
    expect(q58.diagramBased).toBe(true);
    expect(q58.sourceRegion.choices?.A).toContain('/paper-crops/CS-XI-2022-P1/question-58-a.png');

    const q59 = p1!.questions.find(q => q.questionNumber === '59')!;
    expect(q59.diagramBased).toBe(true);
    expect(q59.sourceRegion.choices?.A).toContain('/paper-crops/CS-XI-2022-P1/question-59-a.png');

    const q61 = p1!.questions.find(q => q.questionNumber === '61')!;
    expect(q61.diagramBased).toBe(true);
    expect(q61.sourceRegion.diagramUrl).toBe('/paper-crops/CS-XI-2022-P1/question-61.png');
  });

  it('correctly maps in-syllabus, out-of-syllabus, and Class XII migrated questions', () => {
    const p1 = hsscComputerScience2022Papers.find(p => p.id === 'CS-XI-2022-P1')!;

    // Exactly Q30 and Q31 match Class XI 2025 syllabus (1.5.2 Network Topologies)
    const inSyllabusGrade11 = p1.questions.filter(q => q.sourceRegion.in_syllabus && q.sourceRegion.mapping_scope?.grade === 11);
    expect(inSyllabusGrade11.map(q => q.questionNumber)).toEqual(['30', '31']);
    expect(inSyllabusGrade11[0].slos?.[0]?.slo?.code).toBe('1.5.2');
    expect(inSyllabusGrade11[1].slos?.[0]?.slo?.code).toBe('1.5.2');

    // 12 database questions migrated to Class XII Unit 11 in 2025 syllabus
    const migratedToGrade12 = p1.questions.filter(q => q.sourceRegion.mapping_scope?.grade === 12);
    expect(migratedToGrade12.map(q => q.questionNumber)).toEqual([
      '39', '40', '45', '48', '51', '53', '54', '55', '62', '63', '64', '65',
    ]);
    expect(migratedToGrade12.every(q => q.sourceRegion.in_syllabus === true)).toBe(true);
    expect(migratedToGrade12.every(q => q.sourceRegion.mapping_scope?.grade === 12)).toBe(true);
    expect(migratedToGrade12[0].sourceRegion.mapping_reason).toContain('Database items now belong to Class XII');

    // 51 legacy questions have no direct outcome in 2025 syllabus
    const unmapped = p1.questions.filter(q => q.sourceRegion.mapping_status === 'NO_DIRECT_OUTCOME');
    expect(unmapped.length).toBe(51);
    expect(unmapped.every(q => q.slos?.length === 0)).toBe(true);
    expect(unmapped.every(q => q.sourceRegion.out_of_syllabus === true)).toBe(true);
  });

  it('serves CS-XI-2022-P1 via paperDataService getFallbackPaper', () => {
    const p1 = getFallbackPaper('CS-XI-2022-P1');

    expect(p1).toBeDefined();
    expect(p1?.questions.length).toBe(65);
    expect(p1?.totalMarks).toBe(65);
    expect(p1?.academicClass.level).toBe(11);
  });

  it('populates chapterwise MCQs cleanly in hsscMcqsData without polluting other units', () => {
    const dataXI = hsscMcqsData(11, '/akueb/XI/computer-science', 'computer-science');
    expect(dataXI.papers.some(p => p.code === 'CS-XI-2022-P1')).toBe(true);

    const paperViewXI = dataXI.papers.find(p => p.code === 'CS-XI-2022-P1');
    expect(paperViewXI?.questions.length).toBe(65);

    // Unit 1 (Computing Systems) receives Q30 and Q31
    const unit1 = dataXI.units.find(u => u.unitNumber === 1);
    expect(unit1).toBeDefined();
    const groupU1 = unit1!.groups.find(g => g.paperCode === 'CS-XI-2022-P1');
    expect(groupU1?.questionIds).toEqual(['CS-XI-2022-P1-q30', 'CS-XI-2022-P1-q31']);

    // Units 2 through 8 have 0 questions from CS-XI-2022-P1
    for (const unit of dataXI.units.filter(u => u.unitNumber > 1)) {
      const grp = unit.groups.find(g => g.paperCode === 'CS-XI-2022-P1');
      expect(grp?.questionIds ?? []).toHaveLength(0);
    }

    // In Class XII MCQs, CS-XI-2022-P1 appears as chapterOnly for Unit 11 (DBMS)
    const dataXII = hsscMcqsData(12, '/akueb/XII/computer-science', 'computer-science');
    const paperViewXII = dataXII.papers.find(p => p.code === 'CS-XI-2022-P1');
    expect(paperViewXII?.chapterOnly).toBe(true);

    const unit11 = dataXII.units.find(u => u.unitNumber === 11);
    expect(unit11).toBeDefined();
    const groupU11 = unit11!.groups.find(g => g.paperCode === 'CS-XI-2022-P1');
    expect(groupU11?.questionIds).toHaveLength(12);
  });
});
