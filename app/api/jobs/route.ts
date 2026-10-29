import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
export async function GET(req: NextRequest) { try { const user=await requireUser(req,['TEACHER','ADMIN']); const kind=z.enum(['AI_GENERATION','INGESTION','STUDY_GENERATION']).parse(req.nextUrl.searchParams.get('kind')||'AI_GENERATION'); const jobs=await prisma.durableJob.findMany({where:{ownerId:user.id,kind},take:30,orderBy:{createdAt:'desc'},select:{id:true,status:true,error:true,result:true,createdAt:true}}); return NextResponse.json({success:true,jobs},{headers:{'Cache-Control':'no-store'}}); }catch(error){return apiError(error);} }
