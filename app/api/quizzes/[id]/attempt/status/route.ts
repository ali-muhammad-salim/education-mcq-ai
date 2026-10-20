import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { z } from 'zod';
export async function GET(req: NextRequest, context: {params:Promise<{id:string}>}) {
  try {
    const user=await requireUser(req), {id}=await context.params;
    const attemptId=z.string().min(1).max(160).parse(req.nextUrl.searchParams.get('attemptId'));
    const attempt=await prisma.quizAttempt.findUnique({where:{id:attemptId},select:{quizId:true,studentId:true,status:true,submittedAt:true,quiz:{select:{teacherId:true}}}});
    if(!attempt||attempt.quizId!==id||(attempt.studentId!==user.id&&user.role!=='ADMIN'&&attempt.quiz.teacherId!==user.id)) throw new ApiError(403,'FORBIDDEN','You cannot view this submission.');
    return NextResponse.json({success:true,status:attempt.status,submittedAt:attempt.submittedAt},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {return apiError(error);}
}
