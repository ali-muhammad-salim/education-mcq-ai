import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser,rateLimit } from '@/lib/security';
import { apiError,ApiError } from '@/lib/api';
import { requirePerson } from '@/services/people/access';
import { revisionQuestions } from '@/services/people/insights';
import { revisionSample } from '@/services/people/data';
export async function GET(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireUser(req,['ADMIN','TEACHER']),{id}=await context.params;await requirePerson(actor,id);
 const q=z.string().max(160).parse(req.nextUrl.searchParams.get('q')||'');
 const quizzes=await prisma.quiz.findMany({where:{status:'PUBLISHED',...(actor.role==='ADMIN'?{}:{teacherId:actor.id}),...(q?{title:{contains:q,mode:'insensitive'}}:{})},take:30,orderBy:{createdAt:'desc'},select:{id:true,title:true,totalMarks:true}});
 return NextResponse.json({success:true,quizzes});
}catch(error){return apiError(error);}}
export async function POST(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireUser(req,['ADMIN','TEACHER']),{id}=await context.params;
 const person=await requirePerson(actor,id);
 if(person.role!=='STUDENT'||person.status!=='ACTIVE')throw new ApiError(409,'ACTIVE_STUDENT_REQUIRED','Choose an active student.');
 await rateLimit('personal-assignment:'+actor.id,60,3600);
 const input=z.object({action:z.enum(['ASSIGN','REVISION']),quizId:z.string().optional(),topic:z.string().max(160).optional(),count:z.number().int().min(1).max(20).default(10),classLevel:z.number().int().min(9).max(12).default(9),deadline:z.string().datetime().nullable().optional(),requestId:z.string().uuid()}).strict().parse(await req.json());
 if(input.deadline&&new Date(input.deadline)<=new Date())throw new ApiError(400,'INVALID_DEADLINE','Choose a future deadline.');
 const original=input.action==='ASSIGN'?await prisma.quiz.findFirst({where:{id:input.quizId||'',status:'PUBLISHED',...(actor.role==='ADMIN'?{}:{teacherId:actor.id})}}):null;
 if(input.action==='ASSIGN'&&!original)throw new ApiError(404,'QUIZ_NOT_FOUND','Choose an available published assessment.');
 const recent=input.action==='REVISION'?await revisionSample(actor,id,input.topic):[];
 const questions=revisionQuestions(recent,input.topic,input.count);
 if(input.action==='REVISION'&&!questions.length)throw new ApiError(422,'NO_REVISION_ITEMS','No graded missed questions match this selection.');
 const classCode='PERSONAL-'+createHash('sha256').update(JSON.stringify([actor.id,id,input.classLevel])).digest('hex').slice(0,32);
 const revisionCode='REV-'+createHash('sha256').update(JSON.stringify([actor.id,id,input.requestId])).digest('hex').slice(0,40);
 const quiz=await prisma.$transaction(async tx=>{
  const classroom=await tx.classroom.upsert({where:{code:classCode},create:{code:classCode,teacherId:actor.id,name:'Personal practice — '+person.name.slice(0,100),classLevel:input.classLevel},update:{status:'ACTIVE'}});
  await tx.classroomMembership.upsert({where:{classroomId_studentId:{classroomId:classroom.id,studentId:id}},create:{classroomId:classroom.id,studentId:id},update:{status:'ENROLLED'}});
  const selected=original||await tx.quiz.upsert({where:{code:revisionCode},update:{},create:{code:revisionCode,teacherId:actor.id,title:'Revision: '+(input.topic||'Missed questions').slice(0,160),description:'Personal revision from graded missed questions. Reuses recorded questions; no new AI questions are generated.',visibility:'PRIVATE',status:'PUBLISHED',durationMin:Math.max(10,questions.length*2),totalMarks:questions.reduce((n,q)=>n+q.marks,0),settings:{create:{allowRetries:true,maxAttempts:3,showCorrectAnswers:true,immediateFeedback:true,resultVisibility:'IMMEDIATE',aiGradingMode:'OFF'}},questions:{create:questions.map((q,i)=>({orderIndex:i+1,marks:q.marks,questionData:q.content}))}}});
  if(selected.teacherId!==actor.id&&actor.role!=='ADMIN')throw new ApiError(403,'FORBIDDEN','This assessment belongs to another teacher.');
  await tx.quizAssignment.upsert({where:{quizId_classroomId:{quizId:selected.id,classroomId:classroom.id}},create:{quizId:selected.id,classroomId:classroom.id,deadline:input.deadline?new Date(input.deadline):null},update:{deadline:input.deadline?new Date(input.deadline):null}});
  await tx.auditLog.create({data:{userId:actor.id,action:input.action==='REVISION'?'PERSONAL_REVISION_ASSIGNED':'PERSONAL_QUIZ_ASSIGNED',resource:'User',resourceId:id,details:{quizId:selected.id,classroomId:classroom.id,topic:input.topic||null}}});
  return selected;
 });
 return NextResponse.json({success:true,quizId:quiz.id,message:'Assigned. The student will see this in their classrooms and assessments.'});
}catch(error){return apiError(error);}}
