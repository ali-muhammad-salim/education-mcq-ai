import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { canonicalModel } from '@/services/ai/provider';
import { sourceVerification } from './trust';

const checked = z.object({ checksComplete: z.literal(true), conflicts: z.array(z.string()).length(0), verification: sourceVerification, extractionModel: z.string(), verificationModel: z.string() });

/** Approval, its audit record and indexing are committed together for this exact revision. */
export async function approveCheckedPage(tx: Prisma.TransactionClient, input: { id: string; documentId: string; ownerId: string; contentHash: string; data: unknown; index: boolean }) {
  const parsed = checked.safeParse(input.data);
  if (!parsed.success) return false;
  const { verification, extractionModel, verificationModel } = parsed.data;
  if (!verification.faithful || !verification.complete || !verification.mappingsCorrect || verification.conflicts.length || !canonicalModel(extractionModel) || canonicalModel(extractionModel) === canonicalModel(verificationModel)) return false;
  const approved = await tx.knowledgeArtifact.updateMany({ where: { id: input.id, documentId: input.documentId, contentHash: input.contentHash, status: 'PENDING_REVIEW', document: { ownerId: input.ownerId, publishAfterReview: true } }, data: { status: 'APPROVED', reviewerId: input.ownerId, reviewedAt: new Date(), reviewNote: 'Automatic publication checks passed: source transcription and independent model audit.' } });
  if (!approved.count) return false;
  await tx.auditLog.create({ data: { userId: input.ownerId, action: 'KNOWLEDGE_AUTO_APPROVED', resource: 'KnowledgeArtifact', resourceId: input.id, details: { contentHash: input.contentHash, extractionModel, verificationModel } } });
  if (input.index && process.env.GEMINI_EMBEDDING_MODEL) {
    const id = 'source-index:' + createHash('sha256').update(input.id + ':' + input.contentHash + ':' + canonicalModel(process.env.GEMINI_EMBEDDING_MODEL)).digest('hex');
    await tx.durableJob.upsert({ where: { id }, create: { id, ownerId: input.ownerId, kind: 'AI_EMBEDDING', payload: { artifactId: input.id } }, update: {} });
  }
  return true;
}
