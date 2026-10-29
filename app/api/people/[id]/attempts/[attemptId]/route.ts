import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError,ApiError } from '@/lib/api';
import { requirePerson,attemptScope } from '@/services/people/access';
import { snapshotSchema } from '@/services/assessment/scoring';
export async function GET(req:NextRequest,context:{params:Promise<{id:string;attemptId:string}>}){try{
 const actor=await requireUser(req,['ADMIN','TEACHER']),{id,attemptId}=await context.params;await requirePerson(actor,id);
 const attempt=await prisma.quizAttempt.findFirst({where:{...attemptScope(actor,id),id:attemptId},include:{answers:true,quiz:{select:{title:true}}}});
 if(!attempt)throw new ApiError(404,'ATTEMPT_NOT_FOUND','This attempt is unavailable.');
 if(!['GRADED','PENDING_MANUAL'].includes(attempt.status))throw new ApiError(409,'PROCESSING','Answer review is available after submission has been processed.');
 const parsed=snapshotSchema.safeParse(attempt.questionSnapshot);
 if(!parsed.success)throw new ApiError(422,'SNAPSHOT_UNAVAILABLE','The original question snapshot is unavailable.');
 return NextResponse.json({success:true,attempt:{id:attempt.id,quizId:attempt.quizId,title:attempt.quiz.title,status:attempt.status,score:attempt.totalScore,submittedAt:attempt.submittedAt,questions:parsed.data.map(q=>({...q,answer:attempt.answers.find(a=>a.questionId===q.id)||null}))}});
}catch(error){return apiError(error);}}
