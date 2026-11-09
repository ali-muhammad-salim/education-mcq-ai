import { normalizeBoardId } from "@/lib/boardCatalog";
import syllabus from "@/data/physics/hssc_syllabus_2025.json";

const original = "/materials/hssc/physics/physics-hssc-syllabus-2025.pdf";

export function hsscPhysicsSyllabus(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== "akueb" || subject.toLowerCase() !== "physics" || (grade !== 11 && grade !== 12)) return null;
  return { ...syllabus[grade], original, firstExam: grade === 11 ? 2026 : 2027 };
}
