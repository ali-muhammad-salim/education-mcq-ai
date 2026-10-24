import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser, rateLimit } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { pageExtraction, searchableSource } from '@/services/ingestion/trust';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { scheduleStudyPack } from '@/services/study/library';
import {compileReviewedSyllabus} from '@/services/materials/compile-syllabus';
import {scheduleMaterialCompilation} from '@/services/materials/schedule';
import {learningTranscriptionConflicts} from '@/services/ingestion/learning-validation';

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']);
    const artifactId = req.nextUrl.searchParams.get('artifactId');
    if (artifactId) {
      const id = z.string().min(1).max(80).parse(artifactId);
      const draft = await prisma.auditLog.findFirst({where:{action:'KNOWLEDGE_BROWSER_DRAFT',resource:'KnowledgeArtifact',resourceId:id},orderBy:[{createdAt:'desc'},{id:'desc'}],select:{id:true,createdAt:true,details:true}});
      return NextResponse.json({draft},{headers:{'Cache-Control':'no-store'}});
    }
    const documentId = req.nextUrl.searchParams.get('documentId');
    if (documentId) {
      const document = await prisma.knowledgeDocument.findUniqueOrThrow({ where: { id: z.string().max(80).parse(documentId) }, select: { syllabusVersionId: true } });
      const outcomes = document.syllabusVersionId ? await prisma.sLO.findMany({ where: { subtopic: { topic: { syllabusVersionId: document.syllabusVersionId } } }, select: { id: true, code: true, description: true }, orderBy: { code: 'asc' }, take: 1001 }) : [];
      return NextResponse.json({ outcomes }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const query = z.object({ status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']).default('PENDING_REVIEW'), cursor: z.string().max(80).optional() }).parse(Object.fromEntries(req.nextUrl.searchParams));
    const artifacts = await prisma.knowledgeArtifact.findMany({ where: { status: query.status }, orderBy: { id: 'asc' }, take: 21, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: { document: { include: { subject: { include: { academicClass: { include: { programme: { include: { board: true } } } } } } } } } });
    return NextResponse.json({ artifacts: artifacts.slice(0, 20), nextCursor: artifacts.length > 20 ? artifacts[19].id : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
/** An immutable browser-work checkpoint; it never approves or changes canonical source text. */
export async function POST(req: NextRequest) {
  try {
    const user=await requireUser(req,['ADMIN']);
    await rateLimit('browser-source-draft:'+user.id,60,3600);
    const input=z.object({id:z.string().min(1).max(80),contentHash:z.string().regex(/^[a-f0-9]{64}$/),note:z.string().trim().min(10).max(4000),extraction:pageExtraction}).parse(await req.json());
    const result=await prisma.$transaction(async tx=>{
      const artifact=await tx.knowledgeArtifact.findUniqueOrThrow({where:{id:input.id},include:{document:true}});
      if(artifact.contentHash!==input.contentHash||artifact.status!=='PENDING_REVIEW')throw new ApiError(409,'REVIEW_CHANGED','The source changed. Refresh before saving a draft.');
      const current=z.object({extraction:pageExtraction}).passthrough().parse(artifact.data);
      if(input.extraction.regions.length!==current.extraction.regions.length||input.extraction.regions.some((region,i)=>region.kind!==current.extraction.regions[i].kind||JSON.stringify(region.box)!==JSON.stringify(current.extraction.regions[i].box)))throw new ApiError(422,'SOURCE_GEOMETRY_CHANGED','Keep the original region order, types and crop coordinates in a page draft.');
      const draft=await tx.auditLog.create({data:{userId:user.id,action:'KNOWLEDGE_BROWSER_DRAFT',resource:'KnowledgeArtifact',resourceId:artifact.id,details:{baseContentHash:input.contentHash,sourceSha256:artifact.document.sha256,pageNumber:artifact.pageNumber,documentId:artifact.documentId,note:input.note,extraction:input.extraction}},select:{id:true,createdAt:true,details:true}});
      // The checkpoint retains its base hash; restoring it requires that same source revision.
      return {draft};
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req, ['ADMIN']);
    const input = z.object({ id: z.string().max(80), contentHash: z.string().length(64), status: z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']), note: z.string().trim().min(10).max(4000), extraction: pageExtraction.optional() }).parse(await req.json());
    const result = await prisma.$transaction(async tx => {
      const artifact = await tx.knowledgeArtifact.findUniqueOrThrow({ where: { id: input.id }, include: { document: true } });
      const sourcePage = [artifact.document.sha256, artifact.document.subjectId, artifact.document.resourceType, artifact.document.syllabusVersionId, artifact.pageNumber].join(':');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sourcePage}))`;
      if (artifact.contentHash !== input.contentHash || artifact.status === input.status || (input.status === 'APPROVED' && artifact.status !== 'PENDING_REVIEW')) throw new ApiError(409, 'REVIEW_CHANGED', 'This item changed or was already reviewed. Refresh before continuing.');
      const data = z.object({ extraction: pageExtraction, checksComplete: z.literal(true), conflicts: z.array(z.string()) }).passthrough().parse(artifact.data);
      if (artifact.document.status !== 'NEEDS_REVIEW') throw new ApiError(409, 'PROCESSING_INCOMPLETE', 'Wait for the document to finish processing before review.');
      if (input.status === 'APPROVED' && data.conflicts.length && input.note.length < 30) throw new ApiError(400, 'EXPLAIN_CONFLICT_RESOLUTION', 'Explain how you checked and resolved the flagged source conflicts (at least 30 characters).');
      const extraction = input.status === 'APPROVED' ? input.extraction || data.extraction : data.extraction;
      if(input.status==='APPROVED'){const issues=learningTranscriptionConflicts(extraction);if(issues.length)throw new ApiError(422,'STRUCTURED_SOURCE_MISMATCH',issues.join(' '));}
      if (extraction.regions.length !== data.extraction.regions.length || extraction.regions.some((r, i) => JSON.stringify(r.box) !== JSON.stringify(data.extraction.regions[i].box) || r.kind !== data.extraction.regions[i].kind)) throw new ApiError(422, 'SOURCE_GEOMETRY_CHANGED', 'Keep region order, type and crop coordinates unchanged during review. Reprocess the source to change crop geometry.');
      const ids = [...new Set(extraction.regions.flatMap(r => r.sloIds))];
      const slos = ids.length ? await tx.sLO.count({ where: { id: { in: ids }, subtopic: { topic: { syllabusVersionId: artifact.document.syllabusVersionId || 'unmapped' } } } }) : 0;
      if (slos !== ids.length) throw new ApiError(422, 'INVALID_SOURCE_MAPPING', 'Every mapped outcome must belong to this document’s syllabus.');
      const contentHash = createHash('sha256').update(JSON.stringify({ extraction, sourceSha256: artifact.document.sha256, pageSha256: data.pageSha256 })).digest('hex');
      // A revoked or revised source must never keep a searchable stale vector.
      await tx.$executeRaw`UPDATE "KnowledgeArtifact" SET embedding = NULL, "embeddingModel" = NULL, "embeddingContentHash" = NULL WHERE id = ${artifact.id}`;
      const updated = await tx.knowledgeArtifact.updateMany({ where: { id: artifact.id, status: artifact.status, contentHash: input.contentHash }, data: { status: input.status, reviewerId: input.status === 'PENDING_REVIEW' ? null : user.id, reviewedAt: input.status === 'PENDING_REVIEW' ? null : new Date(), reviewNote: input.note, content: searchableSource(extraction), contentHash, data: { ...data, extraction, educatorResolvedConflicts: input.status === 'APPROVED' ? data.conflicts : [] } } });
      if (!updated.count) throw new ApiError(409, 'REVIEW_CHANGED', 'Another reviewer changed this item. Refresh before continuing.');
      if (input.status === 'APPROVED') {
        const superseded = await tx.knowledgeArtifact.findMany({ where: { id: { not: artifact.id }, pageNumber: artifact.pageNumber, status: 'APPROVED', document: { sha256: artifact.document.sha256, subjectId: artifact.document.subjectId, resourceType: artifact.document.resourceType, syllabusVersionId: artifact.document.syllabusVersionId } }, select: { id: true, contentHash: true } });
        if (superseded.length) {
          const now = new Date(), note = 'Superseded by reviewed source revision ' + artifact.id;
          await tx.$executeRaw`UPDATE "KnowledgeArtifact" SET status = 'REJECTED', "reviewerId" = ${user.id}, "reviewedAt" = ${now}, "updatedAt" = ${now}, "reviewNote" = ${note}, embedding = NULL, "embeddingModel" = NULL, "embeddingContentHash" = NULL WHERE id IN (${Prisma.join(superseded.map(s => s.id))})`;
          await tx.auditLog.createMany({ data: superseded.map(s => ({ userId: user.id, action: 'KNOWLEDGE_SUPERSEDED', resource: 'KnowledgeArtifact', resourceId: s.id, details: { previousHash: s.contentHash, replacementId: artifact.id, replacementHash: contentHash } })) });
        }
      }
      await tx.auditLog.create({ data: { userId: user.id, action: 'KNOWLEDGE_' + input.status, resource: 'KnowledgeArtifact', resourceId: artifact.id, details: { previousHash: input.contentHash, approvedHash: contentHash, note: input.note, sourceSha256: artifact.document.sha256 } } });
      if (input.status === 'APPROVED' && process.env.GEMINI_EMBEDDING_MODEL) await tx.durableJob.create({ data: { ownerId: user.id, kind: 'AI_EMBEDDING', payload: { artifactId: artifact.id } } });
      if (input.status === 'APPROVED' && artifact.document.resourceType === 'textbook' && artifact.document.autoStudyResources) {
        const pending = await tx.knowledgeArtifact.count({ where: { documentId: artifact.documentId, status: { not: 'APPROVED' } } });
        if (!pending) {
          try { await scheduleStudyPack(tx, user.id, { documentId: artifact.documentId, kinds: (artifact.document.catalogMetadata as {studyKinds?:string[]} | null)?.studyKinds }); }
          catch (error) {
            if (!(error instanceof ApiError) || !['CHAPTER_EVIDENCE_REQUIRED', 'BOOK_REVIEW_REQUIRED', 'BOOK_CURRENT_CURRICULUM_REQUIRED', 'STUDY_PACK_TOO_LARGE', 'STUDY_BOOK_SCOPE_TOO_LARGE'].includes(error.code)) throw error;
            await tx.auditLog.create({ data: { userId: user.id, action: 'STUDY_PACK_NEEDS_MAPPING', resource: 'KnowledgeDocument', resourceId: artifact.documentId, details: { reason: error.code } } });
          }
        }
      }
      const publication= input.status==='APPROVED' && artifact.document.resourceType==='syllabus' ? await compileReviewedSyllabus(tx,artifact.documentId):undefined;
      if(input.status==='APPROVED')await scheduleMaterialCompilation(tx,artifact.documentId);
      return { id: artifact.id, status: input.status,publication };
    },{timeout:60000});
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
