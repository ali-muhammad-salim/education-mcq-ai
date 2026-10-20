import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { assessmentCapacity } from '@/services/assessment/capacity';
export async function GET(req:NextRequest) {
  try {
    await requireUser(req,['ADMIN']);
    const [counts,oldestDue,workers,sourceReviews,disabledCredentials]=await Promise.all([
      prisma.durableJob.groupBy({by:['kind','status'],_count:{_all:true}}),
      prisma.durableJob.findFirst({where:{kind:{in:['EXAM_GRADE','EXAM_FINALIZE']},status:'QUEUED',availableAt:{lte:new Date()}},orderBy:{availableAt:'asc'},select:{availableAt:true}}),
      prisma.workerHeartbeat.findMany({where:{seenAt:{gt:new Date(Date.now()-90000)}},select:{id:true,kinds:true,seenAt:true}}),
      prisma.knowledgeArtifact.groupBy({by:['status'],_count:{_all:true}}),
      prisma.aIProviderState.count({where:{disabled:true}})
    ]);
    return NextResponse.json({success:true,submissionMode:process.env.ASSESSMENT_SUBMISSION_MODE==='queued'?'queued':'synchronous',capacity:assessmentCapacity.snapshot(),queues:counts.map(q=>({kind:q.kind,status:q.status,count:q._count._all})),oldestDueAssessmentJobSeconds:oldestDue?Math.max(0,Math.round((Date.now()-oldestDue.availableAt.getTime())/1000)):0,activeWorkers:workers,sourceReviews:sourceReviews.map(r=>({status:r.status,count:r._count._all})),disabledAICredentials:disabledCredentials,workerHealth:'Worker heartbeats expire after 90 seconds; queue age still indicates processing delay.'},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return apiError(error);}
}
