import { describe, it, expect } from "vitest";
import {
  paperMetadata,
  paperChoices,
  paperAnswer,
  safeDocumentUrl,
  presentPaperQuestion,
  safePaperOriginal,
} from "@/lib/paperPresentation";
describe("Paper interaction data", () => {
  it("never substitutes a model PDF for an annual paper original", () => {
    expect(
      safePaperOriginal("PHY-IX-2024-P1", "/materials/physics-model-paper.pdf"),
    ).toBeUndefined();
    expect(
      safePaperOriginal("PHY-IX-P1", "/materials/physics-model-paper.pdf"),
    ).toBe("/materials/physics-model-paper.pdf");
  });
  it("rejects executable document URLs and normalizes nullable database fields", () => {
    expect(safeDocumentUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeDocumentUrl("data:text/html,<script>")).toBeUndefined();
    expect(safeDocumentUrl("//other.example/source.pdf")).toBeUndefined();
    expect(safeDocumentUrl("/api/materials/one/original")).toBe(
      "/api/materials/one/original",
    );
    expect(
      presentPaperQuestion({
        id: "one",
        marks: null,
        topics: [{ topic: { name: "Force", topicNumber: null } }],
      }).marks,
    ).toBeUndefined();
  });
  it("handles malformed source data without fabricating choices or answers", () => {
    expect(paperMetadata("{bad")).toEqual({});
    expect(paperChoices(null)).toEqual({});
    expect(paperAnswer({}, { A: "One" })).toBeUndefined();
    expect(paperAnswer({ correct_answer: "Z" }, { A: "One" })).toBeUndefined();
  });
  it("normalizes array and object options for practice scoring", () => {
    const array = paperChoices([
      { id: "a", text: "One" },
      { key: "b", text: "Two" },
    ]);
    expect(array).toEqual({ A: "One", B: "Two" });
    expect(paperAnswer({ correct_answer: " b " }, array)).toBe("B");
    expect(
      paperChoices({ a: "One", B: { text: "Two" }, C: { other: "No text" } }),
    ).toEqual({ A: "One", B: "Two" });
  });
});
