import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { assessmentCapacity } from '@/services/assessment/capacity';
export async function GET(req:NextRequest) {
  try {
    await requireUser(req,['ADMIN']);
    const [counts,oldestDue]=await Promise.all([
      prisma.durableJob.groupBy({by:['kind','status'],_count:{_all:true}}),
      prisma.durableJob.findFirst({where:{kind:{in:['EXAM_GRADE','EXAM_FINALIZE']},status:'QUEUED',availableAt:{lte:new Date()}},orderBy:{availableAt:'asc'},select:{availableAt:true}})
    ]);
    return NextResponse.json({success:true,submissionMode:process.env.ASSESSMENT_SUBMISSION_MODE==='queued'?'queued':'synchronous',capacity:assessmentCapacity.snapshot(),queues:counts.map(q=>({kind:q.kind,status:q.status,count:q._count._all})),oldestDueAssessmentJobSeconds:oldestDue?Math.max(0,Math.round((Date.now()-oldestDue.availableAt.getTime())/1000)):0,workerHealth:'Queue age is a signal; an empty queue does not prove a worker is running.'},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return apiError(error);}
}
