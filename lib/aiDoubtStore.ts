import { z } from 'zod';
import prisma from '@/lib/prisma';
import { questionSchema, QuestionContent } from '@/lib/validations/assessment';
import { ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { Prisma } from '@prisma/client';
export const doubtDataSchema = z.object({ question: questionSchema, subject: z.string(), board: z.string().optional(), classLevel: z.string(), stage1Answer: z.string(), stage2Answer: z.string().default('Unavailable'), doubtReason: z.string(), confidenceScore: z.number().min(0).max(1).nullable().default(null), provenance: z.string(), suggestedCorrection: z.string().optional(), evidence: z.array(z.object({ id: z.string(), documentId: z.string(), pageNumber: z.number().int(), sourceSha256: z.string(), contentHash: z.string() })).optional() });
export function matchesApprovedQuestion(question: unknown, approved: unknown) {
  const canonical = (value: unknown) => {
    const { reviewId: _reviewId, provenance: _provenance, ...content } = questionSchema.parse(value);
    return JSON.stringify({ ...content, options: content.options.map((o,i) => ({id:o.id || String.fromCharCode(65+i),text:o.text,isCorrect:o.isCorrect})) });
  };
  return canonical(question) === canonical(approved);
}
export async function assertApprovedEvidence(tx: Prisma.TransactionClient, data: z.infer<typeof doubtDataSchema>) {
  if (!data.evidence?.length || !data.board) throw new ApiError(422, 'SOURCE_REVIEW_REQUIRED', 'Regenerate this AI draft using approved source evidence before approving or publishing it.');
  const ids = [...new Set(data.evidence.map(e => e.id))];
  await tx.$queryRaw`SELECT id FROM "KnowledgeArtifact" WHERE id IN (${Prisma.join(ids)}) FOR SHARE`;
  const sources = await tx.knowledgeArtifact.findMany({
    where: {
      id: { in: ids }, status: 'APPROVED',
      document: { status: 'NEEDS_REVIEW', subject: { name: { equals: data.subject, mode: 'insensitive' }, academicClass: { level: Number(data.classLevel) } } },
    },
    select: {
      id: true, contentHash: true, documentId: true, pageNumber: true,
      document: {
        select: {
          sha256: true, syllabusVersionId: true,
          subject: {
            select: {
              academicClass: {
                select: { programme: { select: { board: { select: { shortCode: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (data.evidence.some(e => !sources.some(s => s.id === e.id && s.contentHash === e.contentHash && s.documentId === e.documentId && s.pageNumber === e.pageNumber && s.document.sha256 === e.sourceSha256 && s.document.subject.academicClass.programme.board.shortCode.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === data.board!.replace(/[^A-Za-z0-9]/g, '').toLowerCase()))) throw new ApiError(422, 'SOURCE_REVIEW_CHANGED', 'Source evidence was changed or withdrawn. Review or regenerate this AI question before publication.');
  if (data.question.sloId && !await tx.sLO.findFirst({ where: { id: data.question.sloId, subtopic: { topic: { syllabusVersionId: { in: sources.flatMap(s => s.document.syllabusVersionId ? [s.document.syllabusVersionId] : []) } } } }, select: { id: true } })) throw new ApiError(422, 'SOURCE_SCOPE_CHANGED', 'The question’s learning outcome does not belong to its cited curriculum.');
}
export async function addDoubtItem(ownerId: string, data: z.infer<typeof doubtDataSchema>, id?: string, db: Pick<Prisma.TransactionClient, 'aIDoubtRecord'> = prisma) {
  return id ? db.aIDoubtRecord.upsert({ where: { id }, update: {}, create: { id, ownerId, data: doubtDataSchema.parse(data) } }) : db.aIDoubtRecord.create({ data: { ownerId, data: doubtDataSchema.parse(data) } });
}
export async function getDoubtQueue(ownerId?: string) {
  const records = await prisma.aIDoubtRecord.findMany({ where: ownerId ? { ownerId } : {}, orderBy: { createdAt: 'desc' }, take: 200 });
  return records.map(record => { const data = doubtDataSchema.parse(record.data);
    return { ...data.question, ...data, id: record.id, status: record.status, createdAt: record.createdAt, reviewedAt: record.status === 'PENDING_REVIEW' ? null : record.updatedAt }; });
}
export async function resolveDoubtItem(id: string, ownerId: string, admin: boolean, status: 'APPROVED' | 'DISMISSED', correctedAnswer?: string) {
  return serializable(async tx => {
    const item = await tx.aIDoubtRecord.findUnique({ where: { id } });
    if (!item || (!admin && item.ownerId !== ownerId)) throw new ApiError(403, 'FORBIDDEN', 'You cannot review this question.');
    const data = doubtDataSchema.parse(item.data);
    if (status === 'APPROVED' && data.provenance === 'AI_GENERATED') await assertApprovedEvidence(tx, data);
    let question: QuestionContent = data.question;
    if (correctedAnswer) {
      if (!question.options.some(o => o.text === correctedAnswer || o.id === correctedAnswer)) throw new ApiError(400, 'INVALID_CORRECTION', 'The corrected answer must match an option.');
      question = questionSchema.parse({ ...question, options: question.options.map(o => ({ ...o, isCorrect: o.text === correctedAnswer || o.id === correctedAnswer })) });
    }
    const updated = await tx.aIDoubtRecord.update({ where: { id }, data: { status, data: { ...data, question } } });
    await tx.auditLog.create({ data: { userId: ownerId, action: 'DOUBT_' + status, resource: 'AIDoubtRecord', resourceId: id } });
    return { ...data, ...question, question, id, status, reviewedAt: updated.updatedAt };
  });
}
