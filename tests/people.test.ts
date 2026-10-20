import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {NextRequest} from 'next/server';
import {randomUUID,createHash} from 'node:crypto';
import {summarizeTopics} from '@/services/people/insights';
const url=process.env.TEST_DATABASE_URL;
if(url&&!new URL(url).pathname.includes('_test'))throw Error('Dedicated test database required');
describe.skipIf(!url)('Scoped people profiles and personal revision',()=>{
 let db:PrismaClient,quizId:string,otherQuizId:string,attemptId:string,foreignAttemptId:string;
 const users:Record<string,{id:string;email:string;name:string;role:'ADMIN'|'TEACHER'|'STUDENT'}>={},tokens:Record<string,string>={};
 const suffix=randomUUID(),priorOrigin=process.env.APP_URL;
 const ctx=(id:string)=>({params:Promise.resolve({id})});
 function req(path:string,who:string,body?:unknown){return new NextRequest('http://localhost'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+tokens[who],origin:'http://localhost','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
 beforeAll(async()=>{
  process.env.DATABASE_URL=url;process.env.APP_URL='http://localhost';db=new PrismaClient({datasources:{db:{url}}});
  for(const [key,role] of [['admin','ADMIN'],['teacher','TEACHER'],['other','TEACHER'],['student','STUDENT'],['stranger','STUDENT']] as const){
   const u=await db.user.create({data:{name:key,email:key+'-'+suffix+'@example.test',role,passwordHash:'never-return-this-hash',...(key==='student'?{googleId:'private-google-id-'+suffix}:{})}});users[key]={...u,role};tokens[key]=randomUUID();await db.userSession.create({data:{userId:u.id,token:createHash('sha256').update(tokens[key]).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
  }
  const service=await import('@/services/assessment/service');
  for(const [owner,topic] of [['teacher','Kinematics'],['other','Optics']]){
   const q=await db.quiz.create({data:{teacherId:users[owner].id,title:'Profile '+topic,status:'PUBLISHED',visibility:'PUBLIC',totalMarks:2,settings:{create:{showCorrectAnswers:true,aiGradingMode:'OFF'}},questions:{create:{orderIndex:1,marks:2,questionData:{stemText:'Which answer?',questionType:'MCQ_SINGLE',topicName:topic,options:[{id:'a',text:'Correct',isCorrect:true},{id:'b',text:'Incorrect',isCorrect:false}]}}}}});
   const attempt=await service.startAttempt(q.id,users.student);await service.saveAnswer(q.id,users.student,{attemptId:attempt.id,questionId:attempt.questions[0].id,version:0,answerPayload:{selectedOptionId:'b'}});await service.submitAttempt(q.id,users.student,attempt.id);
   if(owner==='teacher'){quizId=q.id;attemptId=attempt.id;}else{otherQuizId=q.id;foreignAttemptId=attempt.id;}
  }
 });
 afterAll(async()=>{
  if(!db)return;const ids=Object.values(users).map(u=>u.id);
  const quizzes=await db.quiz.findMany({where:{teacherId:{in:ids}},select:{id:true}}),quizIds=quizzes.map(q=>q.id);
  await db.quizAttempt.deleteMany({where:{quizId:{in:quizIds}}});await db.quizAssignment.deleteMany({where:{quizId:{in:quizIds}}});await db.quiz.deleteMany({where:{id:{in:quizIds}}});await db.classroom.deleteMany({where:{teacherId:{in:ids}}});await db.auditLog.deleteMany({where:{userId:{in:ids}}});await db.durableJob.deleteMany({where:{ownerId:{in:ids}}});await db.authChallenge.deleteMany({where:{name:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();const{default:shared}=await import('@/lib/prisma');await shared.$disconnect();if(priorOrigin===undefined)delete process.env.APP_URL;else process.env.APP_URL=priorOrigin;
 });
 it('limits teacher directories and never exposes hashes or OAuth identifiers',async()=>{
  const {GET}=await import('@/app/api/people/route');
  const r=await GET(req('/api/people?q='+suffix,'teacher'));expect(r.status).toBe(200);const body=await r.json();expect(body.people.map((p:{id:string})=>p.id)).toEqual([users.student.id]);expect(body.people[0].signIn).toEqual({google:true,password:true});expect(JSON.stringify(body)).not.toMatch(/never-return-this-hash|private-google-id/);
  expect((await GET(req('/api/people','student'))).status).toBe(403);
 });
 it('hides unrelated profiles and another teacher’s attempts while retaining admin access',async()=>{
  const {GET}=await import('@/app/api/people/[id]/route');
  const body=await(await GET(req('/api/people/'+users.student.id,'teacher'),ctx(users.student.id))).json();expect(body.summary.attempts).toBe(1);expect(body.summary.topics.map((t:{topic:string})=>t.topic)).toEqual(['Kinematics']);
  expect((await GET(req('/api/people/'+users.stranger.id,'teacher'),ctx(users.stranger.id))).status).toBe(404);
  const admin=await(await GET(req('/api/people/'+users.student.id,'admin'),ctx(users.student.id))).json();expect(admin.summary.attempts).toBe(2);
  expect(JSON.stringify(admin)).not.toMatch(/never-return-this-hash|private-google-id/);
 });
 it('reviews selected wrong answers and correct keys only within the educator scope',async()=>{
  const {GET}=await import('@/app/api/people/[id]/attempts/[attemptId]/route');
  const context=(attemptId:string)=>({params:Promise.resolve({id:users.student.id,attemptId})});
  const r=await GET(req('/api/people/review','teacher'),context(attemptId));expect(r.status).toBe(200);const body=await r.json();expect(body.attempt.questions[0].answer.answerPayload.selectedOptionId).toBe('b');expect(body.attempt.questions[0].content.options[0].isCorrect).toBe(true);
  expect((await GET(req('/api/people/review','teacher'),context(foreignAttemptId))).status).toBe(404);expect((await GET(req('/api/people/review','student'),context(attemptId))).status).toBe(403);
 });
 it('assigns an idempotent private revision using missed items and enforces enrollment',async()=>{
  const {POST}=await import('@/app/api/people/[id]/assignments/route');const body={action:'REVISION',topic:'Kinematics',count:10,requestId:randomUUID()};
  const first=await POST(req('/api/people/assign','teacher',body),ctx(users.student.id));expect(first.status).toBe(200);const created=await first.json();const repeated=await(await POST(req('/api/people/assign','teacher',body),ctx(users.student.id))).json();expect(repeated.quizId).toBe(created.quizId);
  const quiz=await db.quiz.findUniqueOrThrow({where:{id:created.quizId},include:{questions:true,assignments:true}});expect(quiz.visibility).toBe('PRIVATE');expect(quiz.questions).toHaveLength(1);expect(quiz.assignments).toHaveLength(1);
  const {startAttempt}=await import('@/services/assessment/service');await expect(startAttempt(quiz.id,users.student)).resolves.toHaveProperty('id');await expect(startAttempt(quiz.id,users.stranger)).rejects.toThrow();
  expect((await POST(req('/api/people/assign','teacher',{...body,action:'ASSIGN',quizId:otherQuizId}),ctx(users.student.id))).status).toBe(404);
  expect((await POST(req('/api/people/assign','teacher',body),ctx(users.stranger.id))).status).toBe(404);
 });
 it('creates audited single-use admin reset links without email and revokes sessions after use',async()=>{
  const {POST}=await import('@/app/api/admin/users/[id]/security/route');
  expect((await POST(req('/api/admin/security','teacher',{action:'RESET_LINK'}),ctx(users.student.id))).status).toBe(403);
  expect((await POST(req('/api/admin/security','admin',{action:'RESET_LINK'}),ctx(users.admin.id))).status).toBe(403);
  const r=await POST(req('/api/admin/security','admin',{action:'RESET_LINK'}),ctx(users.student.id));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store');const link=new URL((await r.json()).resetUrl);
  const {POST:recover}=await import('@/app/api/auth/recovery/route');const payload={action:'RESET',email:users.student.email,token:link.searchParams.get('token'),password:'New-Test-Password-42!'};
  expect((await recover(req('/api/auth/recovery','student',payload))).status).toBe(200);expect(await db.userSession.count({where:{userId:users.student.id}})).toBe(0);expect((await recover(req('/api/auth/recovery','student',payload))).status).toBe(400);
  const {verifyPassword}=await import('@/lib/passwords');expect(await verifyPassword(payload.password,(await db.user.findUniqueOrThrow({where:{id:users.student.id}})).passwordHash!)).toBe(true);expect(await db.auditLog.count({where:{userId:users.admin.id,action:'ADMIN_RESET_LINK_CREATED'}})).toBe(1);
 });
 it('does not misclassify measurement units as academic topics',()=>{
  const result=summarizeTopics([{id:'fixture',questionSnapshot:[{id:'q',orderIndex:1,marks:2,content:{stemText:'Force?',questionType:'NUMERICAL',correctAnswerText:'10',unit:'N'}}],answers:[{questionId:'q',score:0}]}]);expect(result.topics[0].topic).toBe('Topic not mapped');expect(result.unmapped).toBe(1);
 });
});
