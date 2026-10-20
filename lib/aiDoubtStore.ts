import { z } from 'zod';
import prisma from '@/lib/prisma';
import { questionSchema, QuestionContent } from '@/lib/validations/assessment';
import { ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
export const doubtDataSchema = z.object({ question: questionSchema, subject: z.string(), classLevel: z.string(), stage1Answer: z.string(), stage2Answer: z.string().default('Unavailable'), doubtReason: z.string(), confidenceScore: z.number().min(0).max(1).nullable().default(null), provenance: z.string(), suggestedCorrection: z.string().optional() });
export function matchesApprovedQuestion(question: unknown, approved: unknown) {
  const canonical = (value: unknown) => {
    const { reviewId: _reviewId, provenance: _provenance, ...content } = questionSchema.parse(value);
    return JSON.stringify({ ...content, options: content.options.map((o,i) => ({id:o.id || String.fromCharCode(65+i),text:o.text,isCorrect:o.isCorrect})) });
  };
  return canonical(question) === canonical(approved);
}
export async function addDoubtItem(ownerId: string, data: z.infer<typeof doubtDataSchema>, id?: string) {
  return id ? prisma.aIDoubtRecord.upsert({ where: { id }, update: {}, create: { id, ownerId, data: doubtDataSchema.parse(data) } }) : prisma.aIDoubtRecord.create({ data: { ownerId, data: doubtDataSchema.parse(data) } });
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
