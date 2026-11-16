import syllabus from "@/data/biology/ssc_syllabus_2025.json";
import { normalizeBoardId } from "./boardCatalog";

const original = "/materials/ssc/biology/biology-ssc-syllabus-2025.pdf";
const specifications = {
  9: { mcqs: [2, 2, 5, 8, 4, 2, 2, 5, 10], crqs: [2, 2, 2, 0, 0, 2, 3, 0, 2], erqPairs: [[4, 5], [8, 9]] },
  10: { mcqs: [1, 4, 3, 6, 2, 7, 8, 3, 3, 3], crqs: [0, 3, 2, 3, 3, 0, 0, 2, 0, 0], erqPairs: [[11, 13], [15, 16]] },
};

export function sscBiologySyllabus(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject.toLowerCase() !== "biology" || (grade !== 9 && grade !== 10)) return null;
  const units = syllabus[grade];
  const { mcqs, crqs, erqPairs } = specifications[grade];
  return {
    units,
    original,
    assessmentPage: grade === 9 ? 69 : 70,
    practicalPage: grade === 9 ? 60 : 64,
    firstExam: grade === 9 ? 2026 : 2027,
    paperI: 40,
    paperII: 25,
    paperIII: 10,
    erqMarks: 6,
    cognitiveWeight: "R 10–15% · U 55–60% · A and beyond 20–30%",
    chapters: units.map((unit, index) => ({ number: unit.unitNumber, mcqs: mcqs[index], crqMarks: crqs[index] })),
    erqPairs,
  };
}
