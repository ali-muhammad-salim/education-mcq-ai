import { normalizeBoardId } from "@/lib/boardCatalog";

const root = "/materials/hssc/computer-science/";

export function hsscComputerScienceResources(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject !== "computer-science" || (grade !== 11 && grade !== 12)) return null;
  const roman = grade === 11 ? "XI" : "XII";
  const slug = roman.toLowerCase();
  return {
    grade, roman, year: grade === 11 ? 2026 : 2027,
    papers: [
      { label: "Paper I", slug: "paper-i", file: root + "computer-science-model-" + slug + "-i.pdf", marks: 50, minutes: 90, pages: 16 },
      { label: "Paper II", slug: "paper-ii", file: root + "computer-science-model-" + slug + "-ii.pdf", marks: 35, minutes: 90, pages: 12 },
      { label: "Paper III · Practical", slug: "practical", file: root + "computer-science-model-" + slug + "-practical.pdf", marks: 15, minutes: 60, pages: 4 },
    ].map(paper => ({ ...paper, href: "/akueb/" + roman + "/computer-science/model-papers/" + paper.slug })),
  };
}
