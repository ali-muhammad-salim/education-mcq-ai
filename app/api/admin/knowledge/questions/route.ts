import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { resolution, questionResolutionConflicts,sourceFigureConflicts } from '@/services/materials/compile-paper';
import { pageExtraction } from '@/services/ingestion/trust';
const state = z.object({ status: z.literal('NEEDS_REVIEW'), revision: z.string(), documentId: z.string(), syllabusVersionId: z.string(), items: z.record(z.string(), z.object({ value: resolution, conflicts: z.array(z.string()), model: z.string(), verifier: z.string() })), blocked: z.array(z.object({ key: z.string(), conflicts: z.array(z.string()) })) });
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']);
    const id = req.nextUrl.searchParams.get('jobId');
    if (!id) {
      const cursor = z.string().max(160).parse(req.nextUrl.searchParams.get('cursor') || '');
      const jobs = await prisma.$queryRaw<{ id: string; status: string; error: string | null; documentId: string; blocked: number }[]>(Prisma.sql`SELECT id,status,error,payload->>'documentId' AS "documentId",COALESCE(jsonb_array_length(result->'blocked'),0) AS blocked FROM "DurableJob" WHERE kind='INGESTION' AND payload->>'task'='COMPILE_LEARNING' AND id>${cursor} AND (status='FAILED' OR result->>'status'='NEEDS_REVIEW') ORDER BY id LIMIT 21`);
      return NextResponse.json({ jobs: jobs.slice(0, 20), nextCursor: jobs.length > 20 ? jobs[19].id : null }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const job = await prisma.durableJob.findUniqueOrThrow({ where: { id: z.string().max(160).parse(id) } });
    const parsed = state.safeParse(job.result);
    if (!parsed.success) throw new ApiError(409, 'QUESTION_REVIEW_UNAVAILABLE', job.error || 'This job has no question decisions ready for review.');
    const record = parsed.data;
    const artifacts = await prisma.knowledgeArtifact.findMany({ where: { documentId: record.documentId }, select: { id: true, data: true, sourceImageKey: true } });
    const outcomes = await prisma.sLO.findMany({ where: { subtopic: { topic: { syllabusVersionId: record.syllabusVersionId } } }, select: { id: true, code: true, description: true } });
    const questions = record.blocked.map(b => { const split = b.key.lastIndexOf(':'); const artifact = artifacts.find(a => a.id === b.key.slice(0, split)); const source = pageExtraction.safeParse((artifact?.data as Record<string, unknown> | undefined)?.extraction); return { key: b.key, ...record.items[b.key], candidateHash: digest(record.items[b.key].value), original: source.success ? source.data.learning.questions[Number(b.key.slice(split + 1))] : null, sourceImageKey: artifact?.sourceImageKey }; });
    return NextResponse.json({ jobId: job.id, revision: record.revision, questions, outcomes }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req, ['ADMIN']);
    const input = z.object({ jobId: z.string().max(160), key: z.string().max(200), revision: z.string().length(64), candidateHash: z.string().length(64), value: resolution, note: z.string().trim().min(30).max(4000) }).parse(await req.json());
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "DurableJob" WHERE id=${input.jobId} FOR UPDATE`;
      const job = await tx.durableJob.findUniqueOrThrow({ where: { id: input.jobId } }), record = state.parse(job.result), candidate = record.items[input.key];
      if (job.status !== 'COMPLETED' || record.revision !== input.revision || !candidate || digest(candidate.value) !== input.candidateHash) throw new ApiError(409, 'QUESTION_REVIEW_CHANGED', 'This candidate changed. Reload its source comparison.');
      const version = await tx.syllabusVersion.findUniqueOrThrow({ where: { id: record.syllabusVersionId } });
      if (!version.isLatest) throw new ApiError(409, 'CURRICULUM_CHANGED', 'Recompile this source against the current syllabus.');
      const split = input.key.lastIndexOf(':'), artifact = await tx.knowledgeArtifact.findFirst({ where: { id: input.key.slice(0, split), documentId: record.documentId, status: 'APPROVED' } });
      if (!artifact) throw new ApiError(409, 'SOURCE_CHANGED', 'This source is no longer approved.');
      const question = pageExtraction.parse((artifact.data as Record<string, unknown>).extraction).learning.questions[Number(input.key.slice(split + 1))];
      if (!question) throw new ApiError(409, 'SOURCE_CHANGED', 'The source question changed.');
      const ids = await tx.sLO.findMany({ where: { subtopic: { topic: { syllabusVersionId: record.syllabusVersionId } } }, select: { id: true } });
      const doc = await tx.knowledgeDocument.findUniqueOrThrow({ where: { id: record.documentId }, include: { references: { include: { reference: { include: { artifacts: true } } } } } });
      const answers = new Set<string>();
      for (const { reference: r } of doc.references) {
        if (!['answer_key', 'e_marking'].includes(r.resourceType) || r.subjectId !== doc.subjectId || r.status !== 'NEEDS_REVIEW' || r.artifacts.length !== r.totalPages || r.artifacts.some(a => a.status !== 'APPROVED')) continue;
        for (const page of r.artifacts) { const source = pageExtraction.safeParse((page.data as Record<string, unknown>).extraction); if (source.success) for (const entry of source.data.learning.keyEntries) if (entry.number === question.number && entry.answer) answers.add(entry.answer); }
      }
      if (answers.size > 1) throw new ApiError(422, 'ANSWER_SOURCES_DISAGREE', 'Resolve the conflicting official keys in source review before approving an answer.');
      const conflicts = [...questionResolutionConflicts(question, input.value, new Set(ids.map(i => i.id)), [...answers][0]),...sourceFigureConflicts(question,artifact.data)];
      // Fix source/key conflicts in the source review, rather than rewriting a printed key here.
      if (conflicts.length) throw new ApiError(422, 'QUESTION_NOT_RESOLVED', conflicts.join(' '));
      const previous = candidate.value; candidate.value = input.value; candidate.conflicts = [];
      record.blocked = record.blocked.filter(b => b.key !== input.key);
      await tx.durableJob.update({ where: { id: job.id }, data: { result: record, ...(!record.blocked.length ? { status: 'QUEUED', attempts: 0, availableAt: new Date(), error: null } : {}) } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'PAPER_QUESTION_MANUALLY_VERIFIED', resource: 'KnowledgeDocument', resourceId: record.documentId, details: { jobId: job.id, key: input.key, revision: input.revision, note: input.note, previous, approved: input.value } } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
