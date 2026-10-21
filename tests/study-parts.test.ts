import { describe, expect, it } from "vitest";
import { planStudyParts } from "@/services/study/parts";
describe("Lossless book chapter sections", () => {
  it("preserves every source character and page citation across bounded sections", () => {
    const pages = [
      {
        id: "page-1",
        content: "H₂O, Na⁺ and F = ma.\n".repeat(900),
        contentHash: "a".repeat(64),
        pageNumber: 1,
      },
      {
        id: "page-2",
        content: "Worked example: 2 × 3 = 6 N.\n".repeat(900),
        contentHash: "b".repeat(64),
        pageNumber: 2,
      },
    ];
    const parts = planStudyParts(pages, 4000);
    expect(parts.length).toBeGreaterThan(5);
    for (const part of parts)
      expect(
        part.inputSlices.reduce((n, s) => n + s.end - s.start, 0),
      ).toBeLessThanOrEqual(4000);
    for (const page of pages) {
      const slices = parts
        .flatMap((p) => p.inputSlices)
        .filter((s) => s.artifactId === page.id);
      expect(
        slices.map((s) => page.content.slice(s.start, s.end)).join(""),
      ).toBe(page.content);
      expect(slices[0].start).toBe(0);
      expect(slices.at(-1)?.end).toBe(page.content.length);
    }
  });
  it("handles long unbroken notation without an infinite loop or omission", () => {
    const page = {
      id: "page",
      content: "x".repeat(20001),
      contentHash: "a".repeat(64),
      pageNumber: 1,
    };
    const parts = planStudyParts([page], 1000);
    expect(parts).toHaveLength(21);
    expect(
      parts
        .flatMap((p) => p.inputSlices)
        .reduce((n, s) => n + s.end - s.start, 0),
    ).toBe(20001);
  });
  it("does not split a mathematical Unicode symbol into isolated UTF-16 surrogates", () => {
    const page = {
      id: "unicode",
      content: "a".repeat(999) + "𝒎" + "b".repeat(1001),
      contentHash: "c".repeat(64),
      pageNumber: 1,
    };
    const parts = planStudyParts([page], 1000);
    for (const slice of parts.flatMap((p) => p.inputSlices)) {
      const text = page.content.slice(slice.start, slice.end);
      expect(text).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    }
  });
});
