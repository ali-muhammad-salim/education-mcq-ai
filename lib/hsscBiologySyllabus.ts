import { normalizeBoardId } from '@/lib/boardCatalog';
import data from '@/data/biology/hssc_syllabus_2025.json';

const original = '/materials/hssc/biology/biology-hssc-syllabus-2025.pdf';
const official = 'https://examinationboard.aku.edu/assets/cdn/f/289824724335130/3614425/3a241c554e/biology-hssc-i-syllabus-2025_-20261028074606.pdf?stream=1';
const allocations = {
  11: { mcqs: [6, 3, 6, 4, 2, 3, 3, 2, 2, 6, 2, 2, 7, 2], crqs: [0, 3, 0, 0, 3, 0, 0, 3, 3, 0, 3, 3, 0, 3], erqPairs: [[1, 3], [10, 13]] },
  12: { mcqs: [6, 6, 7, 2, 2, 7, 3, 6, 2, 2, 3, 2, 2], crqs: [0, 2, 0, 2, 3, 0, 3, 0, 3, 3, 3, 2, 0], erqPairs: [[15, 20], [17, 22]] },
};

export function hsscBiologySyllabus(board: string, grade: number, subject: string) {
  if (normalizeBoardId(board) !== 'akueb' || subject.toLowerCase() !== 'biology' || (grade !== 11 && grade !== 12)) return null;
  const { units, practicals } = data[grade];
  const { mcqs, crqs, erqPairs } = allocations[grade];
  return {
    id: `akueb-hssc-biology-2025-${grade}`,
    units, practicals, original, official, erqPairs,
    firstExam: grade === 11 ? 2026 : 2027,
    assessmentPage: grade === 11 ? 101 : 102,
    practicalPage: grade === 11 ? 93 : 98,
    paperI: 50,
    paperII: 35,
    paperIII: 15,
    erqMarks: 7,
    cognitiveWeight: 'R 0–15% · U 45–60% · A and beyond 25–40%',
    chapters: units.map((unit, index) => ({ number: unit.unitNumber, mcqs: mcqs[index], crqMarks: crqs[index] })),
  };
}
