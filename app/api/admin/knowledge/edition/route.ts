import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { checkedCurriculumPlan, curriculumPlan } from '@/services/ingestion/curriculum-plan';
import { compileReviewedSyllabus } from '@/services/materials/compile-syllabus';
import { scheduleMaterialCompilation } from '@/services/materials/schedule';
const hash = (metadata: unknown) => createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
export async function GET(req: NextRequest) {
  try {
await requireUser(req, ['ADMIN']); const id = z.string().min(1).max(80).parse(req.nextUrl.searchParams.get('documentId'));
    const doc = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id }, select: { id: true, resourceType: true, catalogMetadata: true, totalPages: true, artifacts: { select: { pageNumber: true, sourceImageKey: true }, orderBy: { pageNumber: 'asc' } } } });
    if (doc.resourceType !== 'syllabus') throw new ApiError(422, 'NOT_SYLLABUS', 'Choose a syllabus document.');
    return NextResponse.json({ ...doc, metadataHash: hash(doc.catalogMetadata) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest) {
  try {
const user = await requireUser(req, ['ADMIN']); const input = z.object({ documentId: z.string().max(80), metadataHash: z.string().length(64), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), plan: curriculumPlan, note: z.string().trim().min(30).max(4000) }).parse(await req.json());
    if (Number.isNaN(Date.parse(input.effectiveFrom)) || new Date(input.effectiveFrom).toISOString().slice(0, 10) !== input.effectiveFrom) throw new ApiError(422, 'INVALID_EDITION_DATE', 'Use the printed effective date.');
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "KnowledgeDocument" WHERE id=${input.documentId} FOR UPDATE`;
      const doc = await tx.knowledgeDocument.findUniqueOrThrow({ where: { id: input.documentId } });
      if (doc.resourceType !== 'syllabus' || doc.status !== 'NEEDS_REVIEW' || hash(doc.catalogMetadata) !== input.metadataHash) throw new ApiError(409, 'EDITION_CHANGED', 'The source or class index changed. Refresh this review.');
      const plan = checkedCurriculumPlan(input.plan, doc.totalPages, Array.from({ length: doc.totalPages }, (_, i) => i + 1));
      if (!plan.assignments.length || plan.conflicts.length) throw new ApiError(422, 'CLASS_INDEX_UNRESOLVED', 'Resolve the class allocation conflicts against the original index.');
      const metadata = (doc.catalogMetadata || {}) as Record<string, unknown>;
      // A changed index or date must produce a new immutable curriculum revision.
      const existing = curriculumPlan.safeParse(metadata.classPlan);
      if (metadata.compiledVersionIds && (!existing.success || JSON.stringify(existing.data) !== JSON.stringify(plan) || metadata.syllabusEffectiveFrom !== input.effectiveFrom)) throw new ApiError(409, 'REPROCESS_COMPILED_EDITION', 'Reprocess the original upload to revise an already compiled edition.');
      await tx.knowledgeDocument.update({ where: { id: doc.id }, data: { catalogMetadata: { ...doc.catalogMetadata as object, classPlan: plan, syllabusEffectiveFrom: input.effectiveFrom } } });
      const publication = await compileReviewedSyllabus(tx, doc.id); await scheduleMaterialCompilation(tx, doc.id);
      await tx.auditLog.create({ data: { userId: user.id, action: 'CURRICULUM_INDEX_VERIFIED', resource: 'KnowledgeDocument', resourceId: doc.id, details: { plan, effectiveFrom: input.effectiveFrom, note: input.note, publication } } });
      return publication;
    }, { timeout: 60000 });
    return NextResponse.json({ publication: result });
  } catch (error) { return apiError(error); }
}
