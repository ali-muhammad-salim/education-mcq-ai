import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, type User } from '@prisma/client';
import { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { snapshotSchema } from '@/services/assessment/scoring';
import { legacyAnswerCases, applyAnswerDecision } from '@/lib/legacyAnswerReview';
const url=process.env.TEST_DATABASE_URL;
if(url&&!new URL(url).pathname.includes('_test'))throw Error('Dedicated test database required');
describe.skipIf(!url)('Admin answer-source decisions',()=>{
  let db:PrismaClient,quizId:string,oldAttempt:string,newAttempt:string;
  const users:Record<string,User>={},tokens:Record<string,string>={},suffix=randomUUID(),priorOrigin=process.env.APP_URL;
  function req(who:string,body?:unknown,origin='http://localhost') {return new NextRequest('http://localhost/api/admin/knowledge/answer-reviews',{method:body?'PATCH':'GET',headers:{authorization:'Bearer '+tokens[who],origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
  beforeAll(async()=>{
    process.env.DATABASE_URL=url;process.env.APP_URL='http://localhost';db=new PrismaClient({datasources:{db:{url}}});
    for(const name of ['admin','first','second','third']){
      users[name]=await db.user.create({data:{name,email:name+suffix+'@example.test',role:name==='admin'?'ADMIN':'STUDENT'}});
      tokens[name]=randomUUID();await db.userSession.create({data:{userId:users[name].id,token:createHash('sha256').update(tokens[name]).digest('hex'),expiresAt:new Date(Date.now()+600000)}});
    }
    const item=legacyAnswerCases.find(row=>row.number===40)!;
    const quiz=await db.quiz.create({data:{code:'PHY-IX-2025-P1',teacherId:users.admin.id,title:'Source decision test',status:'PUBLISHED',visibility:'PUBLIC',totalMarks:1,settings:{create:{showCorrectAnswers:true,allowRetries:true,maxAttempts:100}},questions:{create:{orderIndex:1,marks:1,questionData:{questionType:'MCQ_SINGLE',stemText:item.stem,options:Object.entries(item.options).map(([id,text])=>({id,text,isCorrect:id===item.official}))}}}}});quizId=quiz.id;
  });
  afterAll(async()=>{
    if(!db)return;const ids=Object.values(users).map(user=>user.id);
    await db.quizAttempt.deleteMany({where:{quizId}});await db.quiz.deleteMany({where:{id:quizId}});await db.durableJob.deleteMany({where:{ownerId:{in:ids}}});await db.auditLog.deleteMany({where:{userId:{in:ids}}});await db.userSession.deleteMany({where:{userId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();await(await import('@/lib/prisma')).default.$disconnect();if(priorOrigin===undefined)delete process.env.APP_URL;else process.env.APP_URL=priorOrigin;
  });
  it('requires admin access and rejects cross-site decisions',async()=>{
    const {GET,PATCH}=await import('@/app/api/admin/knowledge/answer-reviews/route');
    expect((await GET(req('first'))).status).toBe(403);
    expect((await PATCH(req('admin',{number:40},'https://attacker.invalid'))).status).toBe(403);
    const response=await GET(req('admin'));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).items).toHaveLength(3);
  });
  it('keeps the sheet until approval, serializes competing decisions and preserves old snapshots',async()=>{
    const {startAttempt}=await import('@/services/assessment/service');
    const old=await startAttempt(quizId,users.first);oldAttempt=old.id;
    const {GET,PATCH}=await import('@/app/api/admin/knowledge/answer-reviews/route');
    const item=(await(await GET(req('admin'))).json()).items.find((row:{number:number})=>row.number===40);
    const payload={number:40,revision:item.revision,status:'APPROVE_CORRECTION',answer:'A',note:'Educator reviewed the original question and approved this correction.'};
    const concurrent=await Promise.all([PATCH(req('admin',payload)),PATCH(req('admin',payload))]);expect(concurrent.map(r=>r.status).sort()).toEqual([200,409]);
    const next=await startAttempt(quizId,users.second);newAttempt=next.id;
    const snapshots=await db.quizAttempt.findMany({where:{id:{in:[oldAttempt,newAttempt]}}});
    const answer=(id:string)=>snapshotSchema.parse(snapshots.find(row=>row.id===id)!.questionSnapshot)[0].content.options.find(option=>option.isCorrect)!.id;
    expect(answer(oldAttempt)).toBe('B');expect(answer(newAttempt)).toBe('A');
    expect((await db.quizQuestion.findFirstOrThrow({where:{quizId}})).questionData).toMatchObject({options:expect.arrayContaining([expect.objectContaining({id:'B',isCorrect:true})])});
  });
  it('can restore the sheet for future attempts without changing a previous corrected snapshot',async()=>{
    const {GET,PATCH}=await import('@/app/api/admin/knowledge/answer-reviews/route');
    const item=(await(await GET(req('admin'))).json()).items.find((row:{number:number})=>row.number===40);
    expect((await PATCH(req('admin',{number:40,revision:item.revision,status:'KEEP_OFFICIAL',answer:'A',note:'Keep the printed sheet while awaiting a board clarification.'}))).status).toBe(200);
    const {startAttempt}=await import('@/services/assessment/service');const attempt=await startAttempt(quizId,users.third);
    const saved=await db.quizAttempt.findUniqueOrThrow({where:{id:attempt.id}});
    expect(snapshotSchema.parse(saved.questionSnapshot)[0].content.options.find(option=>option.isCorrect)!.id).toBe('B');
    const corrected=await db.quizAttempt.findUniqueOrThrow({where:{id:newAttempt}});expect(snapshotSchema.parse(corrected.questionSnapshot)[0].content.options.find(option=>option.isCorrect)!.id).toBe('A');
    expect(await db.auditLog.count({where:{userId:users.admin.id,action:'LEGACY_PAPER_ANSWER_REVIEWED'}})).toBe(2);
  });
  it('never applies a correction to a changed question or different option text',()=>{
    const item=legacyAnswerCases[0],decision={number:item.number,status:'APPROVE_CORRECTION' as const,answer:item.answer,note:'Reviewed explanation',decidedAt:new Date().toISOString(),sourceFingerprint:'fixture'};
    expect(applyAnswerDecision({},item.number,item.stem,item.options,[decision]).correct_answer).toBe(item.answer);
    expect(applyAnswerDecision({},item.number,item.stem+' changed',item.options,[decision])).toEqual({});
    expect(applyAnswerDecision({},item.number,item.stem,{...item.options,C:'Changed option'},[decision])).toEqual({});
  });
});
