import sscPracticals from "@/data/physics/ssc_syllabus_practical_activities.json";
import { hsscPhysicsSyllabus } from "./hsscPhysicsSyllabus";
import { normalizeBoardId } from "./boardCatalog";

// Chapter allocations and optional ERQ pairs from the 2025 syllabi, pp. 52–53.
const allocations = {
  9: { mcqs: [3, 6, 8, 2, 1, 6, 4, 6, 2, 2], crqs: [3, 0, 0, 3, 3, 0, 3, 0, 3, 0], erqPairs: [[2, 3], [6, 8]] },
  10: { mcqs: [2, 2, 6, 3, 6, 2, 6, 3, 4, 6], crqs: [2, 2, 0, 0, 0, 2, 3, 0, 3, 3], erqPairs: [[13, 14], [15, 18]] },
  11: { mcqs: [2, 2, 6, 7, 1, 4, 7, 7, 7, 7], crqs: [2, 2, 2, 3, 2, 2, 3, 3, 3, 3], erqPairs: [[3, 4], [8, 9]] },
  12: { mcqs: [2, 8, 8, 4, 7, 7, 3, 2, 7, 2], crqs: [3, 3, 3, 4, 2, 2, 3, 2, 3, 0], erqPairs: [[12, 13], [15, 16]] },
};

export function physicsSyllabusSections(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject !== "physics" || (grade !== 9 && grade !== 10 && grade !== 11 && grade !== 12)) return null;
  const hssc = hsscPhysicsSyllabus(board, grade, subject);
  const partTwo = grade === 10 || grade === 12;
  const { mcqs, crqs, erqPairs } = allocations[grade];
  return {
    original: hssc?.original ?? `/materials/ssc/physics/ssc-${partTwo ? 2 : 1}/physics-ssc-full-syllabus-2025.pdf`,
    assessmentPage: partTwo ? 53 : 52,
    practicalPage: partTwo ? 50 : 48,
    firstExam: hssc?.firstExam ?? null,
    practicals: hssc?.practicals ?? (partTwo ? sscPracticals[10] : sscPracticals[9]),
    paperI: hssc ? 50 : 40,
    paperII: hssc ? 35 : 25,
    paperIII: hssc ? 15 : 10,
    cognitiveWeight: hssc ? "R 0–15% · U 45–60% · A and beyond 25–40%" : "R 10–15% · U 55–60% · A and beyond 20–30%",
    chapters: mcqs.map((count, index) => ({ number: (partTwo ? 11 : 1) + index, mcqs: count, crqMarks: crqs[index] })),
    erqPairs,
  };
}
