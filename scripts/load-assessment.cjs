/* Local burst benchmark. Creates and removes only its own disposable test records. */
const { PrismaClient } = require('@prisma/client');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const {spawn}=require('node:child_process');
let worker;
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) throw new Error('A dedicated TEST_DATABASE_URL containing _test is required.');
const origin = new URL(process.env.LOAD_BASE_URL || 'http://localhost:3101');
if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:') throw new Error('Benchmark is restricted to a local HTTP preview.');
const levels = (process.env.LOAD_LEVELS || '10,25,50').split(',').map(Number);
if (levels.some(n => !Number.isInteger(n) || n < 1 || n > 200)) throw new Error('Use burst sizes between 1 and 200.');
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const runId = 'load-' + randomUUID(), userIds = [], quizIds = [];
const report = { runId, date: new Date().toISOString(), environment: { platform: process.platform, cpu: os.cpus()[0]?.model, logicalCpus: os.availableParallelism(), memoryGiB: Math.round(os.totalmem() / 2 ** 30), node: process.version }, scenario: 'Same quiz, distinct students, 40 MCQs each. HTTP start burst, HTTP answer-save burst, HTTP submit burst, duplicate-submit burst. No client retries. Answer fixtures seeded before saves.', rounds: [] };
async function request(route, token, body) {
  const begin = performance.now();
  try {
    const response = await fetch(new URL(route, origin), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin.origin, Authorization: 'Bearer ' + token }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    const data = await response.json();
    return { ms: performance.now() - begin, status: response.status, code: data.error?.code, data };
  } catch { return { ms: performance.now() - begin, status: 0, code: 'TRANSPORT_ERROR' }; }
}
function summarize(results, elapsed) {
  const times = results.map(r => r.ms).sort((a,b) => a-b), errors = {};
  for (const r of results.filter(r => ![200,202].includes(r.status))) { const key = r.status + ':' + (r.code || 'UNKNOWN'); errors[key] = (errors[key] || 0) + 1; }
  const percentile = p => Math.round(times[Math.max(0, Math.ceil(times.length*p)-1)] || 0);
  return { requests: results.length, successful: results.filter(r => [200,202].includes(r.status)).length, errors, elapsedMs: Math.round(elapsed), successfulPerSecond: Number((results.filter(r => [200,202].includes(r.status)).length / (elapsed / 1000)).toFixed(1)), p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: percentile(1) };
}
async function burst(items, work) { const start = performance.now(); const results = await Promise.all(items.map(work)); return { results, metrics: summarize(results, performance.now()-start) }; }
async function main() {
  const owner = await db.user.create({ data: { email: runId+'-teacher@example.test', name: 'Disposable load teacher', role: 'TEACHER' } }); userIds.push(owner.id);
  for (const concurrency of levels) {
    const quiz = await db.quiz.create({ data: { title: 'Disposable burst '+runId, code: randomUUID(), teacherId: owner.id, visibility: 'PUBLIC', status: 'PUBLISHED', durationMin: 60, totalMarks: 40, settings: { create: { showCorrectAnswers: false } }, questions: { create: Array.from({length:40}, (_,i) => ({ orderIndex:i+1, marks:1, questionData: { questionType:'MCQ_SINGLE', stemText:'Benchmark item '+(i+1), marks:1, options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B',isCorrect:false}] } })) } }, include: { questions:true } }); quizIds.push(quiz.id);
    const students = [];
    for (let i=0;i<concurrency;i++) {
      const id = randomUUID(), token = randomBytes(32).toString('hex'); userIds.push(id);
      students.push({ id, token });
    }
    await db.user.createMany({ data: students.map(s => ({ id:s.id, email:s.id+'@example.test', name:'Disposable burst student' })) });
    await db.userSession.createMany({ data:students.map(s => ({ userId:s.id, token:createHash('sha256').update(s.token).digest('hex'), expiresAt:new Date(Date.now()+3600000) })) });
    const path = '/api/quizzes/'+quiz.id;
    const started = await burst(students, s => request(path+'/attempt',s.token,{}));
    const active = students.flatMap((s,i) => started.results[i].status === 200 ? [{...s, attempt:started.results[i].data.attempt}] : []);
    await db.quizAnswer.createMany({ data:active.flatMap(s => s.attempt.questions.map(q => ({ attemptId:s.attempt.id, questionId:q.id, answerPayload:{selectedOptionId:'a'}, version:1 }))) });
    const saves = await burst(active,s => request(path+'/attempt/answer',s.token,{attemptId:s.attempt.id,questionId:s.attempt.questions[0].id,version:1,answerPayload:{selectedOptionId:'b'}}));
    const submits = await burst(active,s => request(path+'/attempt/submit',s.token,{attemptId:s.attempt.id}));
    const duplicate = await burst(active,s => request(path+'/attempt/submit',s.token,{attemptId:s.attempt.id}));
    let queueDrainMs;
    if(submits.results.some(r=>r.status===202)) {
      if(process.env.LOAD_DRAIN_WORKER!=='1') throw new Error('Queued mode requires LOAD_DRAIN_WORKER=1 to verify actual grading.');
      const begin=Date.now();
      worker=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/job-worker.ts'],{windowsHide:true,stdio:'ignore',env:{...process.env,DATABASE_URL:databaseUrl,WORKER_KINDS:'EXAM_GRADE',WORKER_ONCE:'0'}});
      while(await db.quizAttempt.count({where:{quizId:quiz.id,status:'SUBMITTED'}})) {
        if(Date.now()-begin>60000 || worker.exitCode!==null) throw new Error('Grading queue did not drain.');
        await new Promise(resolve=>setTimeout(resolve,250));
      }
      worker.kill('SIGTERM');queueDrainMs=Date.now()-begin;
    }
    const stored = await db.quizAttempt.findMany({where:{quizId:quiz.id}, include:{answers:true,events:{where:{eventType:'SUBMITTED'}}}});
    for (const s of stored) {
      const i = active.findIndex(a => a.attempt.id === s.id);
      assert.equal(s.status,'GRADED'); assert.equal(s.totalScore,saves.results[i].status === 200 ? 39 : 40); assert.equal(s.answers.length,40); assert.equal(s.events.length,1);
    }
    const round = { concurrency, mode:queueDrainMs===undefined?'synchronous':'queued',queueDrainMs, starts:started.metrics, saves:saves.metrics, submissions:submits.metrics, duplicateSubmissions:duplicate.metrics, verifiedAttempts:stored.length, correctScoresAndSingleFinalization:true };
    report.rounds.push(round); console.log(JSON.stringify(round));
  }
}
main().catch(error => { report.failure = error.message; process.exitCode=1; console.error(error.message); }).finally(async () => {
  if(worker&&worker.exitCode===null)worker.kill('SIGTERM');
  await db.durableJob.deleteMany({where:{ownerId:{in:userIds}}});
  await db.quizAttempt.deleteMany({where:{quizId:{in:quizIds}}});
  await db.quiz.deleteMany({where:{id:{in:quizIds}}});
  await db.user.deleteMany({where:{id:{in:userIds}}});
  await db.requestLimit.deleteMany({where:{key:{in:userIds.map(id=>createHash('sha256').update('attempt-start:'+id).digest('hex'))}}});
  await db.$disconnect(); fs.mkdirSync('docs/verification',{recursive:true});
  const output = 'docs/verification/'+runId+'.json'; fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n'); console.log('Report: '+output);
});
