import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { answerReviewPaper, legacyAnswerCases, type AnswerReviewCase, type PublishedAnswerDecision } from '@/lib/legacyAnswerReview';

const action='LEGACY_PAPER_ANSWER_REVIEWED';
const resource='LegacyPaperAnswer';
const decisionSchema=z.object({number:z.number().int(),status:z.enum(['KEEP_OFFICIAL','APPROVE_CORRECTION']),answer:z.enum(['A','B','C','D']),note:z.string(),sourceFingerprint:z.string()});
const fingerprint=(item:AnswerReviewCase)=>createHash('sha256').update(JSON.stringify({number:item.number,stem:item.stem,options:item.options,official:item.official})).digest('hex');
type Db=Prisma.TransactionClient;
// This small legacy correction ledger is append-only in the existing audit store.
// Uploaded papers continue to use the source-backed question review workflow.
export async function readAnswerReviews(db:Db=prisma) {
  const events=(await Promise.all(legacyAnswerCases.map(item=>db.auditLog.findFirst({where:{action,resource,resourceId:`${answerReviewPaper}:${item.number}`},orderBy:[{createdAt:'desc'},{id:'desc'}]})))).filter(event=>event!==null);
  return legacyAnswerCases.map(item=>{
    const latest=events.find(event=>event.resourceId===`${answerReviewPaper}:${item.number}`);
    const parsed=decisionSchema.safeParse(latest?.details);
    const valid=parsed.success && parsed.data.number===item.number && parsed.data.sourceFingerprint===fingerprint(item) && Boolean(item.options[parsed.data.answer]);
    const decision:PublishedAnswerDecision|null=valid?{...parsed.data,decidedAt:latest!.createdAt.toISOString()}:null;
    return { ...item, revision:createHash('sha256').update(`${fingerprint(item)}:${latest?.id||'pending'}`).digest('hex'), decision };
  });
}
export async function publishedAnswerDecisions(db:Db=prisma) {
  return (await readAnswerReviews(db)).flatMap(item=>item.decision?[item.decision]:[]);
}
export const reviewAnswerInput=z.object({number:z.number().int(),revision:z.string().length(64),status:z.enum(['KEEP_OFFICIAL','APPROVE_CORRECTION']),answer:z.enum(['A','B','C','D']),note:z.string().trim().min(10).max(2000)});
export async function decideLegacyAnswer(userId:string, raw:unknown) {
  const input=reviewAnswerInput.parse(raw);
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${action},0))::text`;
    const item=(await readAnswerReviews(tx)).find(row=>row.number===input.number);
    if(!item)throw new ApiError(404,'REVIEW_NOT_FOUND','This answer is not in the source review list.');
    if(item.revision!==input.revision)throw new ApiError(409,'REVIEW_CHANGED','Another decision was saved. Reload and compare before deciding.');
    const answer=input.status==='KEEP_OFFICIAL'?item.official:input.answer;
    if(!item.options[answer])throw new ApiError(422,'INVALID_ANSWER','Select an option printed in this question.');
    if(input.status==='APPROVE_CORRECTION' && answer===item.official)throw new ApiError(422,'USE_OFFICIAL_DECISION','Choose Keep answer-sheet answer for this option.');
    await tx.auditLog.create({data:{userId,action,resource,resourceId:`${answerReviewPaper}:${item.number}`,details:{number:item.number,status:input.status,answer,note:input.note,sourceFingerprint:fingerprint(item),previous:item.decision as unknown as Prisma.InputJsonValue|null}}});
    return {success:true};
  });
}
