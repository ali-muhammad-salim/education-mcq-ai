import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { publishedStudyWhere } from "@/services/study/visibility";
import { publicMaterialWhere } from "@/lib/materialVisibility";
import { getSubjectMeta } from "@/lib/subjectMetadata";

import {SUPPORTED_BOARDS, CLASS_DEFINITIONS, normalizeBoardId, normalizeClassRoman} from './boardCatalog';
export {SUPPORTED_BOARDS, CLASS_DEFINITIONS, normalizeBoardId, normalizeClassRoman} from './boardCatalog';
export type {BoardInfo,ClassDefinition} from './boardCatalog';

/**
 * Fetch classes data for a board
 */
export async function getBoardClasses(boardId: string) {
  const normBoard = normalizeBoardId(boardId);
  const boardInfo =
    SUPPORTED_BOARDS.find((b) => b.id === normBoard) || SUPPORTED_BOARDS[0];

  // Fetch subject counts for each level from DB
  let counts: Record<number, number> = { 9: 27, 10: 27, 11: 26, 12: 28 };
  try {
    const classes = await prisma.academicClass.findMany({
      include: {
        _count: {
          select: { subjects: true },
        },
      },
    });
    for (const c of classes) {
      if (counts[c.level] !== undefined) {
        counts[c.level] = c._count.subjects;
      }
    }
  } catch (err) {
    console.error("Error fetching class counts:", err);
  }

  const classesList = [
    { ...CLASS_DEFINITIONS["IX"], subjectsCount: counts[9] || 27 },
    { ...CLASS_DEFINITIONS["X"], subjectsCount: counts[10] || 27 },
    { ...CLASS_DEFINITIONS["XI"], subjectsCount: counts[11] || 26 },
    { ...CLASS_DEFINITIONS["XII"], subjectsCount: counts[12] || 28 },
  ];

  return {
    board: boardInfo,
    classes: classesList,
  };
}

/**
 * Fetch subjects for a specific board and class level
 */
export async function getClassSubjects(
  boardId: string,
  classRoman: "IX" | "X" | "XI" | "XII",
) {
  const normBoard = normalizeBoardId(boardId);
  const boardInfo = SUPPORTED_BOARDS.find((b) => b.id === normBoard);
  if (!boardInfo) return null;
  const classDef = CLASS_DEFINITIONS[classRoman];

  let subjects: any[] = [];
  try {
    const dbClass = await prisma.academicClass.findFirst({
      where: {
        level: classDef.level,
        programme: {
          board: {
            shortCode: { equals: boardInfo.shortCode, mode: "insensitive" },
          },
        },
      },
      include: {
        subjects: {
          include: {
            pastPapers: {
              select: {
                id: true,
                paperCode: true,
                examYear: true,
                examType: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (dbClass && dbClass.subjects.length > 0) {
      subjects = dbClass.subjects.map((sub) => {
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
    console.error("Error fetching subjects from DB:", err);
  }

  // Fallback defaults if DB is temporarily empty
  if (subjects.length === 0) {
    const defaultSubjectNames = [
      "Physics",
      "Chemistry",
      "Biology",
      "Mathematics",
      "Computer Science",
      "English Compulsory",
      "Urdu Compulsory",
      "Islamiyat",
      "Pakistan Studies",
      "Art And Model Drawing",
      "General Science",
      "Economics",
      "Civics",
    ];
    subjects = defaultSubjectNames.map((name) => {
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
        papersCount: 0,
        categories: meta.categories,
      };
    });
  }

  const reviewed = await prisma.knowledgeDocument.findMany({
    where: {
      ...publicMaterialWhere,
      subject: {
        academicClass: {
          level: classDef.level,
          programme: {
            board: {
              shortCode: { equals: boardInfo.shortCode, mode: "insensitive" },
            },
          },
        },
      },
    },
    select: {
      subjectId: true,
      totalPages: true,
      _count: { select: { artifacts: true } },
    },
  });
  const publishedSubjects = new Set(
    reviewed
      .filter((d) => d.totalPages > 0 && d.totalPages === d._count.artifacts)
      .map((d) => d.subjectId),
  );

  const subjectIds = subjects.map((s) => s.id);
  if(subjectIds.length){
    const editions=await prisma.syllabusVersion.findMany({where:{subjectId:{in:subjectIds},isLatest:true,sourceDocument:publicMaterialWhere},select:{subjectId:true,sourceDocument:{select:{totalPages:true,_count:{select:{artifacts:true}}}}}});
    for(const edition of editions)if(edition.sourceDocument&&edition.sourceDocument.totalPages>0&&edition.sourceDocument.totalPages===edition.sourceDocument._count.artifacts)publishedSubjects.add(edition.subjectId);
  }
  const noteSubjects = subjectIds.length
    ? await prisma.$queryRaw<{ subjectId: string }[]>(
        Prisma.sql`SELECT DISTINCT v."subjectId" FROM "StudyNote" n JOIN "KnowledgeDocument" d ON d.id=n."sourceDocumentId" JOIN "Topic" t ON t.id=n."topicId" JOIN "SyllabusVersion" v ON v.id=n."syllabusVersionId" AND v.id=t."syllabusVersionId" AND v.id=d."syllabusVersionId" WHERE v."subjectId" IN (${Prisma.join(subjectIds)}) AND ${publishedStudyWhere}`,
      )
    : [];
  for (const row of noteSubjects) publishedSubjects.add(row.subjectId);
  subjects = subjects.map((sub) => ({
    ...sub,
    available:
      publishedSubjects.has(sub.id) ||
      (sub.papersCount || 0) > 0 ||
      (boardInfo.id === "akueb" &&
        ["IX", "X"].includes(classRoman) &&
        sub.slug === "physics"),
  }));
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
    subjects,
  };
}
