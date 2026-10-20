import { NextRequest, NextResponse } from 'next/server';
import { randomBytes,createHash } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser,rateLimit } from '@/lib/security';
import { apiError,ApiError } from '@/lib/api';
import { configuredSiteUrl } from '@/lib/site-url';
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireUser(req,['ADMIN']),{id}=await context.params;
 const {action}=z.object({action:z.enum(['RESET_LINK','REVOKE_SESSIONS'])}).strict().parse(await req.json());
 await rateLimit('admin-security:'+actor.id,20,900);
 const token=randomBytes(32).toString('hex'),codeHash=createHash('sha256').update(token).digest('hex');
 const base=configuredSiteUrl();if(action==='RESET_LINK'&&!base)throw new ApiError(503,'CONFIGURATION_REQUIRED','Configure the site address first.');
 const person=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${id} FOR UPDATE`;
  const user=await tx.user.findUnique({where:{id}});
  if(!user||user.role==='ADMIN'||id===actor.id)throw new ApiError(403,'FORBIDDEN','These controls manage student and teacher accounts only.');
  if(action==='RESET_LINK'){
   if(user.status!=='ACTIVE')throw new ApiError(409,'ACCOUNT_INACTIVE','Activate the account before creating a reset link.');
   const identifier='reset:'+user.email;
   await tx.authChallenge.upsert({where:{identifier},create:{identifier,codeHash,name:id,expiresAt:new Date(Date.now()+1800000)},update:{codeHash,name:id,attempts:0,expiresAt:new Date(Date.now()+1800000)}});
  }else await tx.userSession.deleteMany({where:{userId:id}});
  await tx.auditLog.create({data:{userId:actor.id,action:action==='RESET_LINK'?'ADMIN_RESET_LINK_CREATED':'ADMIN_SESSIONS_REVOKED',resource:'User',resourceId:id}});
  return user;
 });
 let resetUrl:string|undefined;
 if(action==='RESET_LINK'){const url=new URL('/account',base!);url.searchParams.set('action','RESET');url.searchParams.set('email',person.email);url.searchParams.set('token',token);resetUrl=url.toString();}
 return NextResponse.json({success:true,resetUrl,message:action==='RESET_LINK'?'Single-use reset link created. It expires in 30 minutes.':'All sessions revoked.'},{headers:{'Cache-Control':'no-store'}});
}catch(error){return apiError(error);}}
