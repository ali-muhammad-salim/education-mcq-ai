import { describe, it, expect } from "vitest";
import {
  paperMetadata,
  paperChoices,
  paperAnswer,
  safeDocumentUrl,
  presentPaperQuestion,
  safePaperOriginal,
  biologyPaperPdfHref,
  mergePaperListings,
  normalizePaperListingLabel,
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
  it("points biology papers without a question page at their original PDF", () => {
    expect(biologyPaperPdfHref("BIO-IX-2022-P1")).toBe(
      "/materials/ssc/biology/ssc-1/biology-ix-2022-paper-i.pdf",
    );
    expect(biologyPaperPdfHref("BIO-X-2025-P2")).toBe(
      "/materials/ssc/biology/ssc-2/biology-x-2025-paper-ii.pdf",
    );
    expect(biologyPaperPdfHref("PHY-IX-2024-P1")).toBeNull();
  });
  it("normalizes listing labels to the canonical paper label form", () => {
    expect(normalizePaperListingLabel("2025 · Paper 1")).toBe("Paper 1");
    expect(normalizePaperListingLabel("Paper II")).toBe("Paper 2");
    expect(normalizePaperListingLabel("MCQ keys")).toBe("Paper 1 keys");
    expect(normalizePaperListingLabel("Paper 2 e-marking")).toBe(
      "Paper 2 E-marking",
    );
    expect(normalizePaperListingLabel("Syllabus 2025")).toBe("Syllabus 2025");
  });
  it("prefers the digital question page over a later PDF fallback for the same slot", () => {
    const merged = mergePaperListings([
      {
        label: "2025 · Paper 1",
        href: "/past-papers/BIO-X-2025-P1",
        year: 2025,
      },
      {
        label: "Paper 1",
        href: "/materials/ssc/biology/ssc-2/biology-x-2025-paper-i.pdf",
        year: 2025,
      },
    ]);
    expect(merged).toEqual([
      {
        label: "Paper 1",
        href: "/past-papers/BIO-X-2025-P1",
        year: 2025,
      },
    ]);
  });
  it("upgrades a PDF slot when a digital page appears later in the list", () => {
    const merged = mergePaperListings([
      {
        label: "Paper 2",
        href: "/materials/ssc/biology/ssc-2/biology-x-2023-paper-ii.pdf",
        year: 2023,
      },
      { label: "Paper 2", href: "/past-papers/BIO-X-2023-P2", year: 2023 },
    ]);
    expect(merged).toEqual([
      { label: "Paper 2", href: "/past-papers/BIO-X-2023-P2", year: 2023 },
    ]);
  });
  it("keeps the first non-digital entry when no digital page exists", () => {
    const merged = mergePaperListings([
      { label: "Paper 1 keys", href: "/resources/biology-x-2017-key", year: 2017 },
      {
        label: "Paper 1 keys",
        href: "/materials/ssc/biology/ssc-2/biology-x-2017-keys.pdf",
        year: 2017,
      },
    ]);
    expect(merged).toEqual([
      { label: "Paper 1 keys", href: "/resources/biology-x-2017-key", year: 2017 },
    ]);
  });
  it("collapses exact duplicate slots and leaves other labels alone", () => {
    const merged = mergePaperListings([
      { label: "Paper 1", href: "/past-papers/BIO-X-2021-P1", year: 2021 },
      { label: "Paper 1", href: "/past-papers/BIO-X-2021-P1", year: 2021 },
      { label: "Practical paper", href: "/akueb/X/biology/practicals" },
    ]);
    expect(merged).toEqual([
      { label: "Paper 1", href: "/past-papers/BIO-X-2021-P1", year: 2021 },
      { label: "Practical paper", href: "/akueb/X/biology/practicals" },
    ]);
  });
});
