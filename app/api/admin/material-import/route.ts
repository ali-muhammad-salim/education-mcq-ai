import { NextRequest,NextResponse } from 'next/server';
import { handleUpload } from '@/services/ingestion/upload';
import { requireUser } from '@/lib/security';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/api';
import { z } from 'zod';
export async function POST(req:NextRequest){return handleUpload(req,{bulk:true});}
export async function GET(req:NextRequest){
  try{
    const user=await requireUser(req,['ADMIN']),batch=z.string().regex(/^[a-f0-9]{64}$/).parse(req.nextUrl.searchParams.get('batch'));
    const jobs=await prisma.durableJob.findMany({where:{ownerId:user.id,kind:'INGESTION',payload:{path:['meta','importBatchId'],equals:batch}},orderBy:{createdAt:'asc'},take:201,select:{id:true,status:true,result:true,error:true,payload:true}});
    return NextResponse.json({jobs:jobs.slice(0,200).map(job=>({id:job.id,status:job.status,result:job.result,error:job.error,title:(job.payload as {meta?:{title?:string}})?.meta?.title,sha256:(job.payload as {meta?:{sourceSha256?:string}})?.meta?.sourceSha256})),truncated:jobs.length>200},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return apiError(error);}
}
