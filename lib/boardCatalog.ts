/** Browser-safe board and class definitions. Keep database queries out of this module. */
export interface BoardInfo {
  id: string; // e.g. 'akueb'
  name: string;
  shortCode: string;
  fullName: string;
  status: string;
  tag: string;
  description: string;
}

export const SUPPORTED_BOARDS: BoardInfo[] = [
  {
    id: "akueb",
    name: "AKU-EB",
    shortCode: "AKU-EB",
    fullName: "Aga Khan University Examination Board",
    status: "ACTIVE",
    tag: "Available Curriculum",
    description:
      "Autonomous examination board providing SLO-based conceptual assessments, cognitive domain testing (Remembering, Understanding, Application), and electronic e-marking.",
  },
  {
    id: "fbise",
    name: "Federal Board (FBISE)",
    shortCode: "FBISE",
    fullName: "Federal Board of Intermediate & Secondary Education",
    status: "NATIONAL CURRICULUM",
    tag: "Islamabad Capital Territory",
    description:
      "Federal educational board administering secondary and higher secondary examinations based on the National Curriculum of Pakistan.",
  },
  {
    id: "bise-karachi",
    name: "Sindh Board (BSEK / BIEK)",
    shortCode: "BISE-KARACHI",
    fullName: "Board of Secondary & Intermediate Education Karachi",
    status: "PROVINCIAL",
    tag: "Sindh Province",
    description:
      "Sindh provincial examination boards conducting annual metric and intermediate board examinations.",
  },
  {
    id: "bise-lahore",
    name: "Punjab Board (BISE Lahore)",
    shortCode: "BISE-LAHORE",
    fullName: "Board of Intermediate & Secondary Education Lahore",
    status: "PROVINCIAL",
    tag: "Punjab Province",
    description:
      "Punjab provincial curriculum and secondary examinations board aligned with Punjab Curriculum and Textbook Board (PCTB).",
  },
];

export interface ClassDefinition {
  roman: "IX" | "X" | "XI" | "XII";
  level: number;
  name: string;
  stageLabel: string;
  curriculum: string;
  description: string;
}

export const CLASS_DEFINITIONS: Record<string, ClassDefinition> = {
  IX: {
    roman: "IX",
    level: 9,
    name: "Class IX",
    stageLabel: "SSC Part I",
    curriculum: "National Curriculum & AKU-EB Syllabus Standards",
    description:
      "Secondary School Certificate Part I foundation year focusing on core sciences, humanities, and analytical thinking.",
  },
  X: {
    roman: "X",
    level: 10,
    name: "Class X",
    stageLabel: "SSC Part II",
    curriculum: "National Curriculum & AKU-EB Examination Standards",
    description:
      "Secondary School Certificate Part II board examination year with comprehensive past paper archives and practical lab rubrics.",
  },
  XI: {
    roman: "XI",
    level: 11,
    name: "Class XI",
    stageLabel: "HSSC Part I",
    curriculum: "Higher Secondary School Certificate Standards",
    description:
      "Higher Secondary School Certificate Part I pre-medical, pre-engineering, computer science, and commerce streams.",
  },
  XII: {
    roman: "XII",
    level: 12,
    name: "Class XII",
    stageLabel: "HSSC Part II",
    curriculum: "Higher Secondary College Exit Standards",
    description:
      "Higher Secondary School Certificate Part II graduation examination papers, past papers, and university entrance preparations.",
  },
};

/**
 * Normalizes any class string (e.g. 'ix', 'class-9', 'ssc-i', '9') to canonical Roman 'IX' | 'X' | 'XI' | 'XII'
 */
export function normalizeClassRoman(
  rawClass: string,
): "IX" | "X" | "XI" | "XII" | null {
  if (!rawClass) return null;
  const c = rawClass.trim().toUpperCase();
  if (
    c === "IX" ||
    c === "9" ||
    c === "CLASS-9" ||
    c === "SSC-I" ||
    c === "SSC1"
  )
    return "IX";
  if (
    c === "X" ||
    c === "10" ||
    c === "CLASS-10" ||
    c === "SSC-II" ||
    c === "SSC2"
  )
    return "X";
  if (
    c === "XI" ||
    c === "11" ||
    c === "CLASS-11" ||
    c === "HSSC-I" ||
    c === "HSSC1"
  )
    return "XI";
  if (
    c === "XII" ||
    c === "12" ||
    c === "CLASS-12" ||
    c === "HSSC-II" ||
    c === "HSSC2"
  )
    return "XII";
  return null;
}

/**
 * Normalizes board slug to canonical board id (e.g. 'akueb', 'fbise', etc.)
 */
export function normalizeBoardId(rawBoard: string): string {
  if (!rawBoard) return "akueb";
  const b = rawBoard.trim().toLowerCase();
  if (b === "akueb" || b === "aku-eb" || b === "aku") return "akueb";
  if (b === "fbise" || b === "federal") return "fbise";
  if (b === "bise-karachi" || b === "sindh" || b === "bsek" || b === "biek")
    return "bise-karachi";
  if (b === "bise-lahore" || b === "punjab" || b === "lahore")
    return "bise-lahore";
  return b;
}

