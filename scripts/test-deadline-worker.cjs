const {PrismaClient}=require('@prisma/client');
const {randomUUID}=require('node:crypto');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.includes('_test')) throw new Error('A dedicated TEST_DATABASE_URL is required.');
const db=new PrismaClient({datasources:{db:{url}}});
const queued=process.env.TEST_QUEUED==='1';
const id=randomUUID(); let teacherId,studentId,quizId,jobId,child;
async function main() {
  const teacher=await db.user.create({data:{email:'deadline-teacher-'+id+'@example.test',name:'Deadline test teacher',role:'TEACHER'}});teacherId=teacher.id;
  const student=await db.user.create({data:{email:'deadline-student-'+id+'@example.test',name:'Deadline test student'}});studentId=student.id;
  const content={questionType:'MCQ_SINGLE',stemText:'Deadline worker test',options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B',isCorrect:false}]};
  const quiz=await db.quiz.create({data:{teacherId,title:'Disposable deadline worker test',status:'PUBLISHED',visibility:'PUBLIC',questions:{create:{orderIndex:1,marks:2,questionData:content}}},include:{questions:true}});quizId=quiz.id;
  const attempt=await db.quizAttempt.create({data:{quizId,studentId,...(queued?{status:'SUBMITTED',submittedAt:new Date(Date.now()-2000)}:{}),startedAt:new Date(Date.now()-120000),deadline:new Date(Date.now()-60000),questionSnapshot:[{id:quiz.questions[0].id,orderIndex:1,marks:2,content}],answers:{create:{questionId:quiz.questions[0].id,answerPayload:{selectedOptionId:'a'},version:1}}}});
  if(queued) await db.assessmentEvent.create({data:{attemptId:attempt.id,eventType:'SUBMITTED',metadata:{queued:true}}});
  const job=await db.durableJob.create({data:{ownerId:studentId,kind:queued?'EXAM_GRADE':'EXAM_FINALIZE',availableAt:new Date(Date.now()-1000),payload:{quizId,attemptId:attempt.id}}});jobId=job.id;
  child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/job-worker.ts'],{windowsHide:true,stdio:'ignore',env:{...process.env,DATABASE_URL:url,WORKER_KINDS:queued?'EXAM_GRADE':'EXAM_FINALIZE',WORKER_ONCE:'0'}});
  let childError;child.once('error',error=>{childError=error;});
  const begin=Date.now(); let finished;
  while(Date.now()-begin<45000) {
    if(childError) throw childError;
    finished=await db.durableJob.findUniqueOrThrow({where:{id:jobId}});
    if(finished.status==='COMPLETED'||finished.status==='FAILED') break;
    if(child.exitCode!==null) throw new Error('Deadline worker exited before processing the fixture.');
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert.equal(finished.status,'COMPLETED','Deadline worker must finalize without a browser submission.');
  const stored=await db.quizAttempt.findUniqueOrThrow({where:{id:attempt.id},include:{events:{where:{eventType:'SUBMITTED'}}}});
  assert.equal(stored.status,'GRADED');assert.equal(stored.totalScore,2);assert.equal(stored.events.length,1);
  const report={date:new Date().toISOString(),scenario:queued?'Separate grading worker processes a durable submission receipt.':'Separate deadline worker finalizes expired persisted answers with no browser open.',jobStatus:finished.status,attemptStatus:stored.status,score:stored.totalScore,singleFinalization:stored.events.length===1,elapsedMs:Date.now()-begin};
  fs.writeFileSync('docs/verification/'+(queued?'grading-worker':'deadline-worker')+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(child&&child.exitCode===null) {child.kill('SIGTERM');await new Promise(resolve=>{child.once('exit',resolve);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');resolve();},5000).unref();});}
  if(jobId)await db.durableJob.deleteMany({where:{id:jobId}});
  if(quizId){await db.quizAttempt.deleteMany({where:{quizId}});await db.quiz.delete({where:{id:quizId}});}
  await db.user.deleteMany({where:{id:{in:[teacherId,studentId].filter(Boolean)}}});await db.$disconnect();
});
