import { Prisma } from "@prisma/client";
import {publishedStudyWhere} from './visibility';
import prisma from "@/lib/prisma";
import {
  CLASS_DEFINITIONS,
  SUPPORTED_BOARDS,
  normalizeBoardId,
  normalizeClassRoman,
} from "@/lib/boardHierarchy";
import { getSubjectMeta } from "@/lib/subjectMetadata";
import { studyKinds } from "./contracts";
import physicsIX from "@/data/physics/ssc1_exact_syllabus.json";
import physicsX from "@/data/physics/ssc2_exact_syllabus.json";

function syllabusChapters(scope: NonNullable<ReturnType<typeof studyScope>>) {
  if (
    scope.board.id !== "akueb" ||
    normalizeBoardId(scope.board.shortCode) !== scope.board.id ||
    scope.meta.slug !== "physics" ||
    ![9, 10].includes(scope.classDef.level)
  )
    return [];
  const units = scope.classDef.level === 9 ? physicsIX : physicsX;
  return units.map((unit) => ({
    id: "syllabus-" + unit.unitNumber,
    name: unit.name,
    topicNumber: String(unit.unitNumber),
    syllabusVersion: { subject: { name: scope.meta.title } },
    kinds: studyKinds.map((kind) => ({ kind, count: 0 })),
  }));
}

// Shared with the public list: navigation must never advertise withdrawn evidence,
// incomplete editions, or resources belonging to an outdated curriculum.
export {publishedStudyWhere} from './visibility';
export function studyScope(
  rawBoard: string,
  rawClass: string,
  rawSubject: string,
) {
  const board = SUPPORTED_BOARDS.find(
    (b) => b.id === normalizeBoardId(rawBoard),
  );
  const roman = normalizeClassRoman(rawClass);
  const meta = getSubjectMeta(rawSubject);
  if (!board || !roman || !meta.slug) return null;
  return {
    board,
    classDef: CLASS_DEFINITIONS[roman],
    meta,
    baseUrl: `/${board.id}/${roman}/${meta.slug}`,
  };
}

export async function studyChapters(
  scope: NonNullable<ReturnType<typeof studyScope>>,
) {
  // Resolve within the selected board AND class. The same subject name is not
  // sufficient to identify a curriculum.
  const subjects = await prisma.subject.findMany({
    where: {
      academicClass: {
        level: scope.classDef.level,
        programme: {
          board: {
            shortCode: { equals: scope.board.shortCode, mode: "insensitive" },
          },
        },
      },
    },
    select: { id: true, name: true },
  });
  const ids = subjects
    .filter((s) => getSubjectMeta(s.name).slug === scope.meta.slug)
    .map((s) => s.id);
  if (!ids.length) return syllabusChapters(scope);
  const chapters = await prisma.topic.findMany({
    where: { syllabusVersion: { subjectId: { in: ids }, isLatest: true } },
    select: {
      id: true,
      name: true,
      topicNumber: true,
      syllabusVersion: { select: { subject: { select: { name: true } } } },
    },
  });
  if (!chapters.length) return syllabusChapters(scope);
  const counts = await prisma.$queryRaw<
    { topicId: string; kind: string; count: number }[]
  >(Prisma.sql`
    SELECT n."topicId", n.kind, COUNT(*)::int AS count FROM "StudyNote" n
    JOIN "KnowledgeDocument" d ON d.id=n."sourceDocumentId"
    JOIN "Topic" t ON t.id=n."topicId"
    JOIN "SyllabusVersion" v ON v.id=n."syllabusVersionId" AND v.id=t."syllabusVersionId" AND v.id=d."syllabusVersionId"
    WHERE v."subjectId" IN (${Prisma.join(ids)}) AND ${publishedStudyWhere}
    GROUP BY n."topicId",n.kind`);
  return chapters
    .sort((a, b) =>
      (a.topicNumber || a.name).localeCompare(
        b.topicNumber || b.name,
        undefined,
        { numeric: true },
      ),
    )
    .map((chapter) => ({
      ...chapter,
      kinds: studyKinds.map((kind) => ({
        kind,
        count:
          counts.find((c) => c.topicId === chapter.id && c.kind === kind)
            ?.count || 0,
      })),
    }));
}
