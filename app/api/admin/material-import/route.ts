import { NextRequest,NextResponse } from 'next/server';
import { handleUpload } from '@/services/ingestion/upload';
import { requireUser,rateLimit } from '@/lib/security';
import prisma from '@/lib/prisma';
import { ApiError,apiError } from '@/lib/api';
import { sourceRecheck } from '@/services/ingestion/recheck';
import { z } from 'zod';
export async function POST(req:NextRequest){return handleUpload(req,{bulk:true});}
export async function PATCH(req:NextRequest){
  try{
    const user=await requireUser(req,['ADMIN']);
    await rateLimit('bulk-recheck:'+user.id,20,3600);
    const {jobId}=z.object({jobId:z.string().regex(/^bulk-ingest-[a-f0-9]{64}$/)}).parse(await req.json());
    await prisma.$transaction(async tx=>{
      const job=await tx.durableJob.findFirst({where:{id:jobId,ownerId:user.id,kind:'INGESTION'}});
      if(!job)throw new ApiError(404,'IMPORT_JOB_NOT_FOUND','This import job is not available.');
      if(!['COMPLETED','FAILED'].includes(job.status))throw new ApiError(409,'IMPORT_JOB_ACTIVE','This source is already queued or processing.');
      if(job.status==='COMPLETED'){
        const result=z.object({documentId:z.string()}).safeParse(job.result);
        const pages=result.success?await tx.knowledgeArtifact.findMany({where:{documentId:result.data.documentId,status:'PENDING_REVIEW',document:{ownerId:user.id,publishAfterReview:true}},select:{data:true,status:true}}):[];
        if(!pages.some(page=>sourceRecheck(page.data,page.status,true)))throw new ApiError(409,'SOURCE_REVIEW_REQUIRED','No unused automatic recheck remains. Review the flagged source pages.');
      }
      const changed=await tx.durableJob.updateMany({where:{id:job.id,ownerId:user.id,status:job.status},data:{status:'QUEUED',attempts:0,availableAt:new Date(),lockedAt:null,leaseToken:null,error:null}});
      if(!changed.count)throw new ApiError(409,'IMPORT_JOB_CHANGED','The source job changed. Refresh its status.');
      await tx.auditLog.create({data:{userId:user.id,action:'MATERIAL_IMPORT_RETRY',resource:'DurableJob',resourceId:job.id,details:{previousStatus:job.status}}});
    });
    return NextResponse.json({status:'QUEUED'});
  }catch(error){return apiError(error);}
}
export async function GET(req:NextRequest){
  try{
    const user=await requireUser(req,['ADMIN']),batch=z.string().regex(/^[a-f0-9]{64}$/).parse(req.nextUrl.searchParams.get('batch'));
    const jobs=await prisma.durableJob.findMany({where:{ownerId:user.id,kind:'INGESTION',payload:{path:['meta','importBatchId'],equals:batch}},orderBy:{createdAt:'asc'},take:201,select:{id:true,status:true,result:true,error:true,payload:true}});
    return NextResponse.json({jobs:jobs.slice(0,200).map(job=>({id:job.id,status:job.status,result:job.result,error:job.error,title:(job.payload as {meta?:{title?:string}})?.meta?.title,sha256:(job.payload as {meta?:{sourceSha256?:string}})?.meta?.sourceSha256})),truncated:jobs.length>200},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
