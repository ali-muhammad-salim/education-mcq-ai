import { normalizeBoardId } from "@/lib/boardCatalog";
import syllabus from "@/data/computer-science/hssc_syllabus_2025.json";

const original = "/materials/hssc/computer-science/computer-science-hssc-syllabus-2025.pdf";

export function hsscComputerScienceSyllabus(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject.toLowerCase().replace(/\s+/g, "-") !== "computer-science" || (grade !== 11 && grade !== 12)) return null;
  return { ...syllabus[grade], original, firstExam: grade === 11 ? 2026 : 2027 };
}

export function hsscComputerScienceSections(board: string, grade: number, subject: string) {
  const data = hsscComputerScienceSyllabus(board, grade, subject);
  if (!data) return null;
  const second = grade === 12;
  const mcqs = second ? [7, 8, 10, 7, 5, 7, 3, 3] : [8, 8, 13, 3, 7, 7, 4, 0];
  const crqs = second ? [3, 3, 9, 3, 0, 3, 0, 0] : [9, 3, 6, 3, 0, 0, 0, 0];
  return {
    ...data, paperI: 50, paperII: 35, paperIII: 15, erqMarks: 7,
    cognitiveWeight: "R 0–10% · U 40–60% · A and beyond 25–35%",
    chapters: mcqs.map((count, i) => ({ number: (second ? 9 : 1) + i, mcqs: count, crqMarks: crqs[i] })),
    erqPairs: second ? [[11, 11], [13, 14]] : [[3, 3], [5, 6]],
  };
}
