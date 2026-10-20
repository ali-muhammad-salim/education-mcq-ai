import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { peopleScope } from '@/services/people/access';
export async function GET(req:NextRequest){try{
  const actor=await requireUser(req,['ADMIN','TEACHER']);
  const input=z.object({q:z.string().max(160).default(''),role:z.enum(['STUDENT','TEACHER','ADMIN']).default('STUDENT'),status:z.enum(['ACTIVE','SUSPENDED']).optional(),page:z.coerce.number().int().min(1).max(10000).default(1)}).parse(Object.fromEntries(req.nextUrl.searchParams));
  const where={AND:[peopleScope(actor),{role:input.role,...(input.status?{status:input.status}:{}),...(input.q?{OR:[{name:{contains:input.q,mode:'insensitive' as const}},{email:{contains:input.q,mode:'insensitive' as const}}]}:{})}]};
  const [total,rows]=await Promise.all([prisma.user.count({where}),prisma.user.findMany({where,orderBy:[{name:'asc'},{id:'asc'}],skip:(input.page-1)*24,take:24,select:{id:true,name:true,email:true,role:true,status:true,emailVerified:true,createdAt:true,googleId:true,passwordHash:true,_count:{select:{quizAttempts:{where:actor.role==='ADMIN'?{}:{quiz:{teacherId:actor.id}}},teacherQuizzes:true}}}})]);
  return NextResponse.json({success:true,total,page:input.page,pageSize:24,people:rows.map(({googleId,passwordHash,...u})=>({...u,signIn:{google:Boolean(googleId),password:Boolean(passwordHash)}}))});
}catch(error){return apiError(error);}}
