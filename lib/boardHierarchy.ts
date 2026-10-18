import prisma from '@/lib/prisma';
import { getSubjectMeta } from '@/lib/subjectMetadata';

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
    id: 'akueb',
    name: 'AKU-EB',
    shortCode: 'AKU-EB',
    fullName: 'Aga Khan University Examination Board',
    status: 'ACTIVE',
    tag: 'Flagship Partner',
    description: 'Autonomous examination board providing SLO-based conceptual assessments, cognitive domain testing (Remembering, Understanding, Application), and electronic e-marking.'
  },
  {
    id: 'fbise',
    name: 'Federal Board (FBISE)',
    shortCode: 'FBISE',
    fullName: 'Federal Board of Intermediate & Secondary Education',
    status: 'NATIONAL CURRICULUM',
    tag: 'Islamabad Capital Territory',
    description: 'Federal educational board administering secondary and higher secondary examinations based on the National Curriculum of Pakistan.'
  },
  {
    id: 'bise-karachi',
    name: 'Sindh Board (BSEK / BIEK)',
    shortCode: 'BISE-KARACHI',
    fullName: 'Board of Secondary & Intermediate Education Karachi',
    status: 'PROVINCIAL',
    tag: 'Sindh Province',
    description: 'Sindh provincial examination boards conducting annual metric and intermediate board examinations.'
  },
  {
    id: 'bise-lahore',
    name: 'Punjab Board (BISE Lahore)',
    shortCode: 'BISE-LAHORE',
    fullName: 'Board of Intermediate & Secondary Education Lahore',
    status: 'PROVINCIAL',
    tag: 'Punjab Province',
    description: 'Punjab provincial curriculum and secondary examinations board aligned with Punjab Curriculum and Textbook Board (PCTB).'
  }
];

export interface ClassDefinition {
  roman: 'IX' | 'X' | 'XI' | 'XII';
  level: number;
  name: string;
  stageLabel: string;
  curriculum: string;
  description: string;
}

export const CLASS_DEFINITIONS: Record<string, ClassDefinition> = {
  'IX': {
    roman: 'IX',
    level: 9,
    name: 'Class IX',
    stageLabel: 'SSC Part I',
    curriculum: 'National Curriculum & AKU-EB Syllabus Standards',
    description: 'Secondary School Certificate Part I foundation year focusing on core sciences, humanities, and analytical thinking.'
  },
  'X': {
    roman: 'X',
    level: 10,
    name: 'Class X',
    stageLabel: 'SSC Part II',
    curriculum: 'National Curriculum & AKU-EB Examination Standards',
    description: 'Secondary School Certificate Part II board examination year with comprehensive past paper archives and practical lab rubrics.'
  },
  'XI': {
    roman: 'XI',
    level: 11,
    name: 'Class XI',
    stageLabel: 'HSSC Part I',
    curriculum: 'Higher Secondary School Certificate Standards',
    description: 'Higher Secondary School Certificate Part I pre-medical, pre-engineering, computer science, and commerce streams.'
  },
  'XII': {
    roman: 'XII',
    level: 12,
    name: 'Class XII',
    stageLabel: 'HSSC Part II',
    curriculum: 'Higher Secondary College Exit Standards',
    description: 'Higher Secondary School Certificate Part II graduation examination papers, past papers, and university entrance preparations.'
  }
};

/**
 * Normalizes any class string (e.g. 'ix', 'class-9', 'ssc-i', '9') to canonical Roman 'IX' | 'X' | 'XI' | 'XII'
 */
export function normalizeClassRoman(rawClass: string): 'IX' | 'X' | 'XI' | 'XII' | null {
  if (!rawClass) return null;
  const c = rawClass.trim().toUpperCase();
  if (c === 'IX' || c === '9' || c === 'CLASS-9' || c === 'SSC-I' || c === 'SSC1') return 'IX';
  if (c === 'X' || c === '10' || c === 'CLASS-10' || c === 'SSC-II' || c === 'SSC2') return 'X';
  if (c === 'XI' || c === '11' || c === 'CLASS-11' || c === 'HSSC-I' || c === 'HSSC1') return 'XI';
  if (c === 'XII' || c === '12' || c === 'CLASS-12' || c === 'HSSC-II' || c === 'HSSC2') return 'XII';
  return null;
}

/**
 * Normalizes board slug to canonical board id (e.g. 'akueb', 'fbise', etc.)
 */
export function normalizeBoardId(rawBoard: string): string {
  if (!rawBoard) return 'akueb';
  const b = rawBoard.trim().toLowerCase();
  if (b === 'akueb' || b === 'aku-eb' || b === 'aku') return 'akueb';
  if (b === 'fbise' || b === 'federal') return 'fbise';
  if (b === 'bise-karachi' || b === 'sindh' || b === 'bsek' || b === 'biek') return 'bise-karachi';
  if (b === 'bise-lahore' || b === 'punjab' || b === 'lahore') return 'bise-lahore';
  return b;
}

/**
 * Fetch classes data for a board
 */
export async function getBoardClasses(boardId: string) {
  const normBoard = normalizeBoardId(boardId);
  const boardInfo = SUPPORTED_BOARDS.find(b => b.id === normBoard) || SUPPORTED_BOARDS[0];

  // Fetch subject counts for each level from DB
  let counts: Record<number, number> = { 9: 27, 10: 27, 11: 26, 12: 28 };
  try {
    const classes = await prisma.academicClass.findMany({
      include: {
        _count: {
          select: { subjects: true }
        }
      }
    });
    for (const c of classes) {
      if (counts[c.level] !== undefined) {
        counts[c.level] = c._count.subjects;
      }
    }
  } catch (err) {
    console.error('Error fetching class counts:', err);
  }

  const classesList = [
    { ...CLASS_DEFINITIONS['IX'], subjectsCount: counts[9] || 27 },
    { ...CLASS_DEFINITIONS['X'], subjectsCount: counts[10] || 27 },
    { ...CLASS_DEFINITIONS['XI'], subjectsCount: counts[11] || 26 },
    { ...CLASS_DEFINITIONS['XII'], subjectsCount: counts[12] || 28 },
  ];

  return {
    board: boardInfo,
    classes: classesList
  };
}

/**
 * Fetch subjects for a specific board and class level
 */
export async function getClassSubjects(boardId: string, classRoman: 'IX' | 'X' | 'XI' | 'XII') {
  const normBoard = normalizeBoardId(boardId);
  const boardInfo = SUPPORTED_BOARDS.find(b => b.id === normBoard) || SUPPORTED_BOARDS[0];
  const classDef = CLASS_DEFINITIONS[classRoman];

  let subjects: any[] = [];
  try {
    const dbClass = await prisma.academicClass.findFirst({
      where: { level: classDef.level },
      include: {
        subjects: {
          include: {
            pastPapers: {
              select: { id: true, paperCode: true, examYear: true, examType: true, title: true }
            }
          }
        }
      }
    });

    if (dbClass && dbClass.subjects.length > 0) {
      subjects = dbClass.subjects.map(sub => {
        const meta = getSubjectMeta(sub.name);
        return {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          slug: meta.slug,
          icon: meta.icon,
          description: meta.description,
          chapterCount: meta.chapterCount,
          sloCount: meta.sloCount,
          papersCount: sub.pastPapers.length,
          categories: meta.categories,
        };
      });
    }
  } catch (err) {
    console.error('Error fetching subjects from DB:', err);
  }

  // Fallback defaults if DB is temporarily empty
  if (subjects.length === 0) {
    const defaultSubjectNames = [
      'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 
      'English Compulsory', 'Urdu Compulsory', 'Islamiyat', 'Pakistan Studies',
      'Art And Model Drawing', 'General Science', 'Economics', 'Civics'
    ];
    subjects = defaultSubjectNames.map(name => {
      const meta = getSubjectMeta(name);
      return {
        id: meta.slug,
        name: name,
        code: null,
        slug: meta.slug,
        icon: meta.icon,
        description: meta.description,
        chapterCount: meta.chapterCount,
        sloCount: meta.sloCount,
        papersCount: meta.slug === 'physics' ? (classRoman === 'IX' ? 4 : 2) : 0,
        categories: meta.categories,
      };
    });
  }

  // Sort so Physics and Science subjects appear top
  subjects.sort((a, b) => {
    if ((b.papersCount || 0) !== (a.papersCount || 0)) {
      return (b.papersCount || 0) - (a.papersCount || 0);
    }
    return a.name.localeCompare(b.name);
  });

  return {
    board: boardInfo,
    classDef,
    subjects
  };
}
