import { describe, it, expect } from "vitest";
import { hsscMcqsData } from "@/lib/hsscMcqsData";

describe("HSSC chapter-wise MCQ index", () => {
  it("files every Class XI unit under its syllabus number", () => {
    const data = hsscMcqsData(11, "/akueb/XI/physics");
    expect(data.units.map(unit => unit.unitNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(data.totalQuestions).toBeGreaterThan(0);
    for (const unit of data.units) {
      expect(unit.groups.some(group => group.questionIds.length > 0)).toBe(true);
    }
  });

  it("keeps Class XII units on their 11–20 syllabus numbering", () => {
    const data = hsscMcqsData(12, "/akueb/XII/physics");
    expect(data.units.map(unit => unit.unitNumber)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(data.totalQuestions).toBeGreaterThan(0);
    for (const unit of data.units) {
      expect(unit.groups.some(group => group.questionIds.length > 0)).toBe(true);
    }
  });

  it("indexes only answerable MCQs whose ids resolve back to a paper", () => {
    for (const level of [11, 12]) {
      const data = hsscMcqsData(level, level === 11 ? "/akueb/XI/physics" : "/akueb/XII/physics");
      const byId = new Map(data.papers.flatMap(paper => paper.questions.map(question => [question.id, paper])));
      const indexed = data.units.flatMap(unit => unit.groups.flatMap(group => group.questionIds));
      expect(new Set(indexed).size).toBe(data.totalQuestions);
      for (const id of indexed) {
        const paper = byId.get(id);
        expect(paper).toBeDefined();
        expect(String(paper && paper.questions.find(question => question.id === id)?.sourceRegion.correct_answer)).toMatch(/^[ABCD]$/);
      }
    }
  });
});
