import { Prisma } from "@prisma/client";
import { publicMaterialWhere } from "@/lib/materialVisibility";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { studyScope } from "@/services/study/navigation";
import { getSubjectMeta } from "@/lib/subjectMetadata";
import { materialResourceTypes } from '@/lib/materialTypes';
import { getAllStandardPapers } from '@/lib/paperDataService';
import { isBundledMathematics, mathematicsStoreUnavailable } from './mathematicsAvailability';
export const materialScopeWhere=(ids:string[]):Prisma.KnowledgeDocumentWhereInput=>({OR:[{subjectId:{in:ids}},...ids.map(id=>({catalogMetadata:{path:['scopeSubjectIds'],array_contains:[id]}}))]});

export async function subjectPaperListings(
  scope: NonNullable<ReturnType<typeof studyScope>>,
  examType: 'MODEL_EXAM' | 'ANNUAL',
  includeStandard: boolean,
) {
  const stored = await prisma.pastPaper.findMany({
    where: {
      academicClass: { level: scope.classDef.level, programme: { board: { shortCode: { equals: scope.board.shortCode, mode: 'insensitive' } } } },
      subject: { name: { equals: scope.meta.title, mode: 'insensitive' } },
      examType,
      OR: [{ sourceDocumentId: null }, { sourceDocument: publicMaterialWhere }],
    },
    select: {
      id: true, paperCode: true, title: true, fileUrl: true, examYear: true,
      sourceDocument: { select: { catalogMetadata: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { examYear: 'desc' },
    take: 100,
  }).catch(error => {
    if (includeStandard && isBundledMathematics(scope.board.id, scope.classDef.level, scope.meta.slug) && mathematicsStoreUnavailable(error)) return [];
    if (includeStandard && error.name === 'PrismaClientInitializationError') return [];
    throw error;
  });
  const standard = includeStandard ? getAllStandardPapers().filter(paper =>
    paper.academicClass.level === scope.classDef.level &&
    paper.subject.name.toLowerCase() === scope.meta.title.toLowerCase() &&
    /MODEL/i.test(paper.examSession || '') === (examType === 'MODEL_EXAM'),
  ) : [];
  return [
    ...stored.filter(paper => !paper.sourceDocument || (paper.sourceDocument.catalogMetadata as Record<string, unknown> | null)?.compiledPaperId === paper.id),
    ...standard,
  ].filter(paper => (paper.fileUrl || paper._count.questions) &&
    !/CHAP1-2/i.test(paper.paperCode || paper.id) && !/Chapters\s*1\s*&\s*2/i.test(paper.title || ''));
}

export const materialMetadata = z.object({
  title: z.string().max(240).optional(),
  examYear: z.string().max(20).optional(),
  paperCode: z.string().max(160).optional(),
  paperComponent: z.string().max(80).optional(),
  compiledPaperId:z.string().max(160).optional(),
});
export { publicMaterialWhere } from "@/lib/materialVisibility";
export async function publicMaterial(id: string) {
  const document = await prisma.knowledgeDocument.findFirst({
    where: { ...publicMaterialWhere, id },
    include: {
      _count: { select: { artifacts: true } },
      subject: {
        include: {
          academicClass: {
            include: { programme: { include: { board: true } } },
          },
        },
      },
    },
  });
  if (
    !document ||
    document._count.artifacts !== document.totalPages ||
    document.totalPages < 1
  )
    throw new ApiError(
      404,
      "MATERIAL_NOT_FOUND",
      "This material is not available.",
    );
  return document;
}
export async function subjectMaterials(
  rawBoard: string,
  rawClass: string,
  rawSubject: string,
  type?: string | string[],
  after = "",
) {
  const scope = studyScope(rawBoard, rawClass, rawSubject);
  if (!scope) return [];
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
  if (!ids.length) return [];
  const rows = await prisma.knowledgeDocument.findMany({
    where: {
      ...publicMaterialWhere,
      ...materialScopeWhere(ids),
      ...(after ? { id: { gt: after } } : {}),
      ...(type ? { resourceType: typeof type==='string'?type:{in:type} } : {}),
    },
    select: {
      id: true,
      resourceType: true,
      catalogMetadata: true,
      totalPages: true,
      _count: { select: { artifacts: true } },
    },
    orderBy: { id: "asc" },
    take: 101,
  });
  return rows
    .filter(
      (row) => row.totalPages > 0 && row.totalPages === row._count.artifacts,
    )
    .map((row) => ({
      ...row,
      metadata: materialMetadata.parse(row.catalogMetadata || {}),
    }));
}

export async function subjectMaterialTypes(
  rawBoard: string,
  rawClass: string,
  rawSubject: string,
) {
  const scope = studyScope(rawBoard, rawClass, rawSubject);
  if (!scope) return new Set<string>();
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
  if (!ids.length) return new Set<string>();
  const rows = await prisma.$queryRaw<{ resourceType: string }[]>(
    Prisma.sql`SELECT DISTINCT d."resourceType" FROM "KnowledgeDocument" d JOIN "User" u ON u.id=d."ownerId" WHERE (d."subjectId" IN (${Prisma.join(ids)}) OR ${Prisma.join(ids.map(id=>Prisma.sql`d."catalogMetadata" @> ${JSON.stringify({scopeSubjectIds:[id]})}::jsonb`),' OR ')}) AND d."publishAfterReview" AND d.status='NEEDS_REVIEW' AND u.role='ADMIN' AND d."resourceType" IN (${Prisma.join([...materialResourceTypes])}) AND d."totalPages">0 AND (SELECT COUNT(*) FROM "KnowledgeArtifact" a WHERE a."documentId"=d.id)=d."totalPages" AND NOT EXISTS (SELECT 1 FROM "KnowledgeArtifact" a WHERE a."documentId"=d.id AND a.status<>'APPROVED')`,
  );
  const types=new Set(rows.map((r) => r.resourceType));
  const curriculum=await prisma.syllabusVersion.findFirst({where:{subjectId:{in:ids},isLatest:true,sourceDocument:publicMaterialWhere},select:{sourceDocument:{select:{totalPages:true,_count:{select:{artifacts:true}}}}}});
  if(curriculum?.sourceDocument&&curriculum.sourceDocument.totalPages>0&&curriculum.sourceDocument.totalPages===curriculum.sourceDocument._count.artifacts)types.add('syllabus');
  const practice=await prisma.$queryRaw<{available:boolean}[]>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM "PastPaperQuestion" q JOIN "PastPaper" p ON p.id=q."pastPaperId" JOIN "KnowledgeDocument" d ON d.id=p."sourceDocumentId" JOIN "User" u ON u.id=d."ownerId" JOIN "SyllabusVersion" v ON v.id=q."syllabusVersionId" WHERE v."subjectId" IN (${Prisma.join(ids)}) AND v."isLatest" AND q.verified AND q."questionType"='MULTIPLE_CHOICE' AND d."catalogMetadata"->>'compiledPaperId'=p.id AND d."publishAfterReview" AND d.status='NEEDS_REVIEW' AND u.role='ADMIN' AND d."totalPages">0 AND (SELECT COUNT(*) FROM "KnowledgeArtifact" a WHERE a."documentId"=d.id)=d."totalPages" AND NOT EXISTS (SELECT 1 FROM "KnowledgeArtifact" a WHERE a."documentId"=d.id AND a.status<>'APPROVED') AND EXISTS(SELECT 1 FROM "PastPaperQuestionTopic" qt JOIN "Topic" t ON t.id=qt."topicId" WHERE qt."pastPaperQuestionId"=q.id AND t."syllabusVersionId"=v.id) AND (v."sourceDocumentId" IS NULL OR EXISTS(SELECT 1 FROM "KnowledgeDocument" c JOIN "User" cu ON cu.id=c."ownerId" WHERE c.id=v."sourceDocumentId" AND c."publishAfterReview" AND c.status='NEEDS_REVIEW' AND cu.role='ADMIN' AND c."totalPages">0 AND (SELECT COUNT(*) FROM "KnowledgeArtifact" a WHERE a."documentId"=c.id)=c."totalPages" AND NOT EXISTS(SELECT 1 FROM "KnowledgeArtifact" a WHERE a."documentId"=c.id AND a.status<>'APPROVED')))) AS available`);
  if(practice[0]?.available)types.add('mcq');
  return types;
}
