import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import {
  CLASS_DEFINITIONS,
  normalizeBoardId,
  SUPPORTED_BOARDS,
} from "@/lib/boardCatalog";

/** Register only the administrator's declared catalogue scope, never curriculum outcomes. */
export async function ensureUploadScope(input: {
  board: string;
  classLevel: string;
  subject: string;
}) {
  const boardInfo = SUPPORTED_BOARDS.find(
    (board) => board.id === normalizeBoardId(input.board),
  );
  const grade = input.classLevel
    .trim()
    .replace(/^(class|grade)[\s-]*/i, "")
    .toUpperCase();
  const classInfo = Object.values(CLASS_DEFINITIONS).find(
    (item) => item.roman === grade || String(item.level) === grade,
  );
  const subjectName = input.subject.trim();
  if (!boardInfo || !classInfo || !subjectName || subjectName.length > 160)
    throw new ApiError(
      400,
      "INVALID_CATALOG_SCOPE",
      "Choose a supported board, class and subject.",
    );
  return prisma.$transaction(async (tx) => {
    // Serialize first uploads for the same board; parent tables have legacy non-unique names.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`material-scope:${boardInfo.id}`}))`;
    const boards = await tx.board.findMany({
      where: {
        shortCode: { equals: boardInfo.shortCode, mode: "insensitive" },
      },
    });
    if (boards.length > 1)
      throw new ApiError(
        422,
        "AMBIGUOUS_BOARD",
        "Resolve duplicate boards before uploading.",
      );
    const board =
      boards[0] ||
      (await tx.board.create({
        data: {
          shortCode: boardInfo.shortCode,
          name: boardInfo.fullName,
          country: "Pakistan",
        },
      }));
    const classes = await tx.academicClass.findMany({
      where: { level: classInfo.level, programme: { boardId: board.id } },
    });
    if (classes.length > 1)
      throw new ApiError(
        422,
        "AMBIGUOUS_CLASS",
        "Resolve duplicate classes before uploading.",
      );
    let academicClass = classes[0];
    if (!academicClass) {
      const programmeName = classInfo.level <= 10 ? "SSC" : "HSSC";
      const programmes = await tx.programme.findMany({
        where: { boardId: board.id, name: programmeName },
      });
      if (programmes.length > 1)
        throw new ApiError(
          422,
          "AMBIGUOUS_PROGRAMME",
          "Resolve duplicate programmes before uploading.",
        );
      const programme =
        programmes[0] ||
        (await tx.programme.create({
          data: { boardId: board.id, name: programmeName },
        }));
      academicClass = await tx.academicClass.create({
        data: {
          programmeId: programme.id,
          level: classInfo.level,
          name: classInfo.name,
        },
      });
    }
    const subjects = await tx.subject.findMany({
      where: {
        classId: academicClass.id,
        name: { equals: subjectName, mode: "insensitive" },
      },
    });
    if (subjects.length > 1)
      throw new ApiError(
        422,
        "AMBIGUOUS_SUBJECT",
        "Resolve duplicate subjects before uploading.",
      );
    const subject =
      subjects[0] ||
      (await tx.subject.create({
        data: { classId: academicClass.id, name: subjectName },
      }));
    return {
      board: board.shortCode,
      classLevel: classInfo.name,
      subject: subject.name,
    };
  });
}
