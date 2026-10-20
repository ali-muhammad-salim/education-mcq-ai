import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { requirePerson,attemptScope } from '@/services/people/access';
import { summarizeTopics } from '@/services/people/insights';
import { insightSample } from '@/services/people/data';
export async function GET(req:NextRequest,context:{params:Promise<{id:string}>}){try{
 const actor=await requireUser(req,['ADMIN','TEACHER']),{id}=await context.params;
 const page=z.coerce.number().int().min(1).max(10000).parse(req.nextUrl.searchParams.get('page')||1);
 const person=await requirePerson(actor,id),where=attemptScope(actor,id);
 const [total,attempts,recent,scores,classrooms,sessions,teaching,requests,teachingClassrooms]=await Promise.all([
 prisma.quizAttempt.count({where}),
 prisma.quizAttempt.findMany({
  where, skip:(page-1)*12, take:12, orderBy:[{startedAt:'desc'},{id:'desc'}],
  select:{id:true,status:true,startedAt:true,submittedAt:true,totalScore:true,attemptNumber:true,
    quiz:{select:{id:true,title:true,totalMarks:true,teacher:{select:{name:true}}}}
  }
 }),
 insightSample(actor,id),
 prisma.quizAttempt.aggregate({where:{...where,status:'GRADED'},_count:true,_avg:{totalScore:true}}),
 prisma.classroomMembership.findMany({where:{studentId:id,...(actor.role==='ADMIN'?{}:{classroom:{teacherId:actor.id}})},take:50,select:{status:true,classroom:{select:{id:true,name:true,status:true,teacher:{select:{name:true}}}}}}),
 actor.role==='ADMIN'?prisma.userSession.aggregate({where:{userId:id},_max:{createdAt:true},_count:true}):null,
 person.role==='TEACHER'?prisma.quiz.findMany({where:{teacherId:id},take:20,orderBy:{createdAt:'desc'},select:{id:true,title:true,status:true,_count:{select:{attempts:true}}}}):[],
 actor.role==='ADMIN'?prisma.auditLog.findFirst({where:{userId:id,action:{in:['TEACHER_ACCESS_REQUESTED','TEACHER_ACCESS_REJECTED']}},orderBy:{createdAt:'desc'},select:{action:true,details:true}}):null,
 person.role==='TEACHER'?prisma.classroom.findMany({where:{teacherId:id},take:20,orderBy:{createdAt:'desc'},select:{id:true,name:true,status:true,_count:{select:{memberships:{where:{status:'ENROLLED'}},quizzes:true}}}}):[],
 ]);
 const {passwordHash,googleId,...safePerson}=person;
 return NextResponse.json({success:true,person:{...safePerson,signIn:{google:Boolean(googleId),password:Boolean(passwordHash)},sessions:sessions?{recorded:sessions._count,lastRecordedAt:sessions._max.createdAt}:null,teacherRequest:person.role==='STUDENT'&&requests?.action==='TEACHER_ACCESS_REQUESTED'?requests.details:null},summary:{attempts:total,graded:scores._count,averageRawScore:scores._avg.totalScore,analysisWindow:recent.length,...summarizeTopics(recent)},attempts,page,pageSize:12,classrooms,teaching,teachingClassrooms});
}catch(error){return apiError(error);}}
