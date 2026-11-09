import { describe, it, expect } from "vitest";
import { hsscXiAnnualPapers } from "@/lib/hsscXiAnnualPhysics";
import { hsscPhysicsPapers } from "@/lib/hsscPhysicsResources";
import { paperAnswer, paperChoices } from "@/lib/paperPresentation";

const classXi = [...hsscPhysicsPapers, ...hsscXiAnnualPapers].filter(
  paper => paper.academicClass.level === 11,
);
const current = classXi.filter(paper =>
  paper.paperCode === "PHY-XI-P1" ||
  /^PHY-XI-202[1-5]-P1$/.test(paper.paperCode ?? ""),
);
const mcqs = current.flatMap(paper =>
  paper.questions
    .filter(question => question.questionType === "MULTIPLE_CHOICE")
    .map(question => ({ paper: paper.paperCode, question, meta: question.sourceRegion as Record<string, unknown> })),
);
const allMcqs = classXi.flatMap(paper =>
  paper.questions
    .filter(question => question.questionType === "MULTIPLE_CHOICE")
    .map(question => ({ paper: paper.paperCode, question, meta: question.sourceRegion as Record<string, unknown> })),
);
const find = (paper: string, number: number) =>
  allMcqs.find(item => item.paper === paper && Number(item.question.questionNumber) === number)!;
const answerOf = (paper: string, number: number) => {
  const { meta } = find(paper, number);
  return paperAnswer(meta, paperChoices(meta.choices));
};
const annual = (year: number, part: "P1" | "P2") =>
  hsscXiAnnualPapers.find(item => item.paperCode === `PHY-XI-${year}-${part}`)!;
const mcqOf = (year: number) =>
  annual(year, "P1").questions.filter(question => question.questionType === "MULTIPLE_CHOICE");

describe("HSSC Class XI Physics answer availability", () => {
  it("scores every 2021–2025 annual and model MCQ", () => {
    const scorable = mcqs.filter(({ meta }) => paperAnswer(meta, paperChoices(meta.choices)));
    expect(mcqs).toHaveLength(330);
    expect(scorable).toHaveLength(330);
  });

  it("releases every previously held key conflict", () => {
    const held = classXi.flatMap(paper =>
      paper.questions
        .filter(question => question.questionType === "MULTIPLE_CHOICE")
        .filter(question => {
          const meta = question.sourceRegion as Record<string, unknown> | undefined;
          return meta?.answer_status === "KEY_CONFLICT";
        })
        .map(question => `${paper.paperCode} Q${question.questionNumber}`),
    );
    expect(held).toEqual([]);
  });

  it("corrects the defective 2017 and 2019 choices while keeping the official key letter", () => {
    const q14 = find("PHY-XI-2017-P1", 14);
    expect(paperChoices(q14.meta.choices).A).toBe("5.55 km/s");
    expect(q14.meta.answer_status).toBe("ANSWER_CORRECTED");
    expect(answerOf("PHY-XI-2017-P1", 14)).toBe("A");

    const q23 = find("PHY-XI-2017-P1", 23);
    expect(paperChoices(q23.meta.choices).A).toBe("0.172°");
    expect(answerOf("PHY-XI-2017-P1", 23)).toBe("A");

    const q29 = find("PHY-XI-2017-P1", 29);
    expect(paperChoices(q29.meta.choices).A).toBe("an increase in entropy.");
    expect(answerOf("PHY-XI-2017-P1", 29)).toBe("A");

    const q24 = find("PHY-XI-2019-P1", 24);
    expect(paperChoices(q24.meta.choices).A).toBe("I and III.");
    expect(answerOf("PHY-XI-2019-P1", 24)).toBe("A");
  });

  it("loads the newly added 2017–2019 papers with complete, answerable structure", () => {
    const expected = [
      { year: 2017, mcq: 30, scored: 30, written: 16 },
      { year: 2018, mcq: 30, scored: 30, written: 15 },
      { year: 2019, mcq: 35, scored: 35, written: 13 },
    ];
    for (const { year, mcq, scored, written } of expected) {
      const paper = mcqOf(year);
      expect(paper).toHaveLength(mcq);
      const answerable = paper.filter(question => {
        const meta = question.sourceRegion as Record<string, unknown>;
        return Boolean(paperAnswer(meta, paperChoices(meta.choices)));
      });
      expect(answerable).toHaveLength(scored);
      for (const question of paper) {
        const meta = question.sourceRegion as Record<string, unknown>;
        const choices = paperChoices(meta.choices);
        expect(Object.keys(choices)).toEqual(["A", "B", "C", "D"]);
        expect((meta.option_feedback as unknown[]).length).toBe(4);
        expect(meta.explanation || meta.answer_status === "KEY_CONFLICT").toBeTruthy();
      }
      const writtenPaper = annual(year, "P2");
      expect(writtenPaper.questions).toHaveLength(written);
      for (const question of writtenPaper.questions) {
        const meta = question.sourceRegion as Record<string, unknown>;
        const examples = meta.emarkingExamples as Array<Record<string, unknown>>;
        expect(examples.length).toBeGreaterThan(0);
        for (const example of examples) expect(String(example.solution ?? "").trim()).not.toBe("");
      }
    }
  });

  it("keeps the 2019 asterisked item corrected to the project-solved key", () => {
    const { meta } = find("PHY-XI-2019-P1", 32);
    expect(meta.official_answer).toBe("*");
    expect(meta.correct_answer).toBe("B");
    expect(answerOf("PHY-XI-2019-P1", 32)).toBe("B");
  });

  it("scores the corrected Carnot sequence as option C with isothermal compression", () => {
    const { meta } = find("PHY-XI-P1", 45);
    expect(answerOf("PHY-XI-P1", 45)).toBe("C");
    expect(paperChoices(meta.choices).C).toContain("isothermal compression");
  });

  it("offers the graph maximum as the answer to 2022 Q49", () => {
    const { meta } = find("PHY-XI-2022-P1", 49);
    expect(paperChoices(meta.choices).D).toBe("iii only.");
    expect(answerOf("PHY-XI-2022-P1", 49)).toBe("D");
  });

  it("compares sound speeds through elasticity in 2025 Q35", () => {
    const { meta } = find("PHY-XI-2025-P1", 35);
    expect(paperChoices(meta.choices).C).toBe("low elasticity.");
    expect(answerOf("PHY-XI-2025-P1", 35)).toBe("C");
  });

  it("describes the helmet and friction work items in 2024 with the keyed physics", () => {
    const helmet = find("PHY-XI-2024-P1", 14);
    expect(paperChoices(helmet.meta.choices).B).toContain("acting force");
    expect(paperChoices(helmet.meta.choices).A).toContain("acting force");
    expect(answerOf("PHY-XI-2024-P1", 14)).toBe("B");
    expect(helmet.question.questionText).not.toMatch(/impulse/i);

    const friction = find("PHY-XI-2024-P1", 15);
    expect(friction.question.questionText).toContain("Work done by the force of friction");
    expect(answerOf("PHY-XI-2024-P1", 15)).toBe("B");
  });

  it("names the gravitational work and centripetal acceleration in 2024 Q17 and Q21", () => {
    expect(find("PHY-XI-2024-P1", 17).question.questionText).toMatch(/gravitational force/);
    expect(answerOf("PHY-XI-2024-P1", 17)).toBe("C");
    expect(find("PHY-XI-2024-P1", 21).question.questionText).toMatch(/centripetal acceleration/);
    expect(answerOf("PHY-XI-2024-P1", 21)).toBe("C");
  });
});
