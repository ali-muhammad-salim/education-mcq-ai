import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { enhancementCandidate, approvedEnhancement } from '@/services/ingestion/enhancement-review';
export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']);
    const cursor = z.string().max(160).parse(req.nextUrl.searchParams.get('cursor') || '');
    const status = z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).parse(req.nextUrl.searchParams.get('status') || 'PENDING_REVIEW');
    const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "KnowledgeArtifact" WHERE id>${cursor} AND jsonb_typeof(data->'enhancementCandidates')='array' AND EXISTS (SELECT 1 FROM jsonb_array_elements(data->'enhancementCandidates') c WHERE c->>'status'=${status}) ORDER BY id LIMIT 21`);
    const rows = await prisma.knowledgeArtifact.findMany({ where: { id: { in: ids.slice(0, 20).map(i => i.id) } }, select: { id: true, pageNumber: true, contentHash: true, status: true, data: true, document: { select: { catalogMetadata: true } } }, orderBy: { id: 'asc' } });
    return NextResponse.json({ artifacts: rows, nextCursor: ids.length > 20 ? ids[19].id : null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req, ['ADMIN']);
    const input = z.object({ id: z.string().max(160), region: z.number().int().nonnegative(), contentHash: z.string().length(64), candidateHash: z.string().length(64), status: z.enum(['APPROVED', 'REJECTED']), note: z.string().trim().min(10).max(4000) }).parse(await req.json());
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "KnowledgeArtifact" WHERE id=${input.id} FOR UPDATE`;
      const artifact = await tx.knowledgeArtifact.findUniqueOrThrow({ where: { id: input.id } });
      if (artifact.contentHash !== input.contentHash || artifact.status !== 'APPROVED') throw new ApiError(409, 'SOURCE_CHANGED', 'The source changed or is no longer approved. Refresh the comparison.');
      const body = artifact.data as Record<string, Prisma.InputJsonValue>;
      const candidates = z.array(enhancementCandidate).parse(body.enhancementCandidates);
      const candidate = candidates.find(c => c.region === input.region && c.candidateHash === input.candidateHash && c.sourceHash === artifact.contentHash);
      if (!candidate || candidate.status === input.status) throw new ApiError(409, 'CANDIDATE_CHANGED', 'This diagram candidate changed or was already reviewed.');
      const flagged = !candidate.audit.faithful || !candidate.audit.complete || !candidate.audit.mappingsCorrect || candidate.audit.conflicts.length;
      if (input.status === 'APPROVED' && flagged && input.note.length < 30) throw new ApiError(422, 'EXPLAIN_DIAGRAM_CHECK', 'Explain how you checked the flagged labels, bonds, arrows and geometry (at least 30 characters).');
      candidate.status = input.status; candidate.reviewerId = user.id; candidate.reviewedAt = new Date().toISOString(); candidate.note = input.note;
      const variants = z.array(approvedEnhancement).catch([]).parse(body.enhancements).filter(e => e.region !== input.region);
      if (input.status === 'APPROVED') variants.push({ region: candidate.region, storageKey: candidate.storageKey, sourceHash: artifact.contentHash, approval: 'APPROVED', reviewerId: user.id, candidateHash: candidate.candidateHash });
      await tx.knowledgeArtifact.update({ where: { id: artifact.id }, data: { data: { ...body, enhancementCandidates: candidates, enhancements: variants } } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'DIAGRAM_' + input.status, resource: 'KnowledgeArtifact', resourceId: artifact.id, details: { region: input.region, candidateHash: input.candidateHash, sourceHash: artifact.contentHash, note: input.note } } });
    });
    return NextResponse.json({ success: true, status: input.status });
  } catch (error) { return apiError(error); }
}
