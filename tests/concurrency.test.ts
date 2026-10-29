import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes('_test')) throw new Error('Use a dedicated test database.');
describe.skipIf(!url)('Independent assessment transactions', () => {
  const suffix = randomUUID(), userIds: string[] = [];
  let db: PrismaClient, quizId: string;
  let students: {id:string;email:string;name:string;role:'STUDENT'}[];
  const limitKey = 'parallel-limit:' + suffix;
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = new PrismaClient({datasources:{db:{url}}});
    const teacher = await db.user.create({data:{email:'parallel-teacher-'+suffix+'@example.test',name:'Teacher',role:'TEACHER'}}); userIds.push(teacher.id);
    students = Array.from({length:12},(_,i) => ({id:randomUUID(), email:'parallel-'+i+'-'+suffix+'@example.test',name:'Student',role:'STUDENT'}));
    userIds.push(...students.map(s=>s.id)); await db.user.createMany({data:students});
    const quiz = await db.quiz.create({data:{teacherId:teacher.id,title:'Parallel exam',status:'PUBLISHED',visibility:'PUBLIC',durationMin:15,settings:{create:{maxAttempts:1}},questions:{create:Array.from({length:40},(_,i)=>({orderIndex:i+1,marks:1,questionData:{stemText:'Item '+i,questionType:'MCQ_SINGLE',options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B',isCorrect:false}]}}))}}}); quizId=quiz.id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.durableJob.deleteMany({where:{ownerId:{in:userIds}}});
    if (quizId) {await db.quizAttempt.deleteMany({where:{quizId}}); await db.quiz.delete({where:{id:quizId}});}
    await db.user.deleteMany({where:{id:{in:userIds}}});
    await db.requestLimit.deleteMany({where:{key:createHash('sha256').update(limitKey).digest('hex')}});
    await db.$disconnect(); const {default:shared}=await import('@/lib/prisma'); await shared.$disconnect();
  });
  it('starts different students together and deduplicates simultaneous starts for the same student', async () => {
    const {startAttempt}=await import('@/services/assessment/service');
    const attempts=await Promise.all(students.flatMap(s=>[startAttempt(quizId,s),startAttempt(quizId,s)]));
    for(let i=0;i<students.length;i++) expect(attempts[i*2].id).toBe(attempts[i*2+1].id);
    expect(await db.quizAttempt.count({where:{quizId}})).toBe(students.length);
    expect(await db.durableJob.count({where:{ownerId:{in:students.map(s=>s.id)},kind:'EXAM_FINALIZE'}})).toBe(students.length);
  });
  it('preserves answer version conflicts and single finalization during independent bursts', async () => {
    const {startAttempt,saveAnswer,submitAttempt}=await import('@/services/assessment/service');
    await Promise.all(students.map(async s => {
      const a=await startAttempt(quizId,s), questionId=a.questions[0].id;
      const writes=await Promise.allSettled(['a','b'].map(selectedOptionId=>saveAnswer(quizId,s,{attemptId:a.id,questionId,version:0,answerPayload:{selectedOptionId}})));
      expect(writes.filter(w=>w.status==='fulfilled')).toHaveLength(1);
      await Promise.all([submitAttempt(quizId,s,a.id),submitAttempt(quizId,s,a.id)]);
      const stored=await db.quizAttempt.findUniqueOrThrow({where:{id:a.id},include:{answers:true,events:{where:{eventType:'SUBMITTED'}}}});
      expect(stored.status).toBe('GRADED'); expect(stored.answers).toHaveLength(40); expect(stored.events).toHaveLength(1);
      const answer=stored.answers.find(q=>q.questionId===questionId)!;
      expect(answer.version).toBe(1); expect(stored.totalScore).toBe((answer.answerPayload as {selectedOptionId:string}).selectedOptionId==='a'?1:0);
    }));
  });
  it('enforces one shared rate-limit window atomically under contention', async () => {
    const {rateLimit}=await import('@/lib/security');
    const results=await Promise.allSettled(Array.from({length:25},()=>rateLimit(limitKey,5,60)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);
    for(const result of results) if(result.status==='rejected') expect(result.reason.code).toBe('RATE_LIMITED');
    const key=createHash('sha256').update(limitKey).digest('hex');
    await db.requestLimit.update({where:{key},data:{expiresAt:new Date(Date.now()-1000)}});
    await expect(rateLimit(limitKey,5,60)).resolves.toBeUndefined();
    expect((await db.requestLimit.findUniqueOrThrow({where:{key}})).count).toBe(1);
  });
  it('keeps cleared and unanswered items at zero with negative and manual grading enabled', async () => {
    const {startAttempt,saveAnswer,submitAttempt}=await import('@/services/assessment/service');
    const quiz=await db.quiz.create({data:{teacherId:userIds[0],title:'Cleared answer',status:'PUBLISHED',visibility:'PUBLIC',settings:{create:{negativeMarking:true,negativeMarkValue:1,manualGradingRequired:true}},questions:{create:{orderIndex:1,marks:2,questionData:{questionType:'MCQ_SINGLE',stemText:'Select one',options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B',isCorrect:false}]}}}}});
    try {
      const attempt=await startAttempt(quiz.id,students[0]), questionId=attempt.questions[0].id;
      await saveAnswer(quiz.id,students[0],{attemptId:attempt.id,questionId,version:0,answerPayload:{selectedOptionId:'b'}});
      await saveAnswer(quiz.id,students[0],{attemptId:attempt.id,questionId,version:1,answerPayload:{}});
      await submitAttempt(quiz.id,students[0],attempt.id);
      const stored=await db.quizAttempt.findUniqueOrThrow({where:{id:attempt.id},include:{answers:true}});
      expect(stored.totalScore).toBe(0); expect(stored.status).toBe('GRADED'); expect(stored.answers[0].score).toBe(0);
    } finally { await db.quizAttempt.deleteMany({where:{quizId:quiz.id}}); await db.quiz.delete({where:{id:quiz.id}}); }
  });
  it('commits one durable queued receipt, closes answers and retains the receipt through grading', async () => {
    const service=await import('@/services/assessment/service');
    const quiz=await db.quiz.create({data:{teacherId:userIds[0],title:'Queued submission',status:'PUBLISHED',visibility:'PUBLIC',settings:{create:{showCorrectAnswers:true}},questions:{create:{orderIndex:1,marks:2,questionData:{questionType:'MCQ_SINGLE',stemText:'Select one',options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B',isCorrect:false}]}}}}});
    try {
      const a=await service.startAttempt(quiz.id,students[0]), questionId=a.questions[0].id;
      await service.saveAnswer(quiz.id,students[0],{attemptId:a.id,questionId,version:0,answerPayload:{selectedOptionId:'a'}});
      const receipts=await Promise.all([service.acceptSubmission(quiz.id,students[0],a.id),service.acceptSubmission(quiz.id,students[0],a.id)]);
      expect(receipts[0].submittedAt).toEqual(receipts[1].submittedAt);
      expect(await db.durableJob.count({where:{id:'grade-'+a.id,kind:'EXAM_GRADE'}})).toBe(1);
      await expect(service.saveAnswer(quiz.id,students[0],{attemptId:a.id,questionId,version:1,answerPayload:{selectedOptionId:'b'}})).rejects.toThrow();
      const pending=await service.getResults(quiz.id,students[0],a.id);
      expect(pending.processing).toBe(true);expect(pending.canViewCorrectAnswers).toBe(false);expect(JSON.stringify(pending)).not.toContain('isCorrect');
      await Promise.all([service.submitAttempt(quiz.id,students[0],a.id),service.submitAttempt(quiz.id,students[0],a.id)]);
      const final=await service.getResults(quiz.id,students[0],a.id);
      expect(final.score).toBe(2);expect(final.submittedAt).toEqual(receipts[0].submittedAt);
      expect(await db.assessmentEvent.count({where:{attemptId:a.id,eventType:'SUBMITTED'}})).toBe(1);
    } finally {await db.quizAttempt.deleteMany({where:{quizId:quiz.id}});await db.quiz.delete({where:{id:quiz.id}});}
  });
});
