import prisma from '../lib/prisma';
import { claimJob } from '../services/jobs/queue';
import { Prisma, DurableJob } from '@prisma/client';
import { ApiError } from '../lib/api';
import { AIBackpressure } from '../services/ai/provider';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

let stopping = false;
let controller: AbortController | undefined;
process.on('SIGTERM', () => { stopping = true; controller?.abort(); });
process.on('SIGINT', () => { stopping = true; controller?.abort(); });
async function run() {
  console.log('Durable worker started');
  const kinds = z.array(z.enum(['AI_GENERATION', 'INGESTION', 'AI_EMBEDDING', 'STUDY_GENERATION', 'EXAM_FINALIZE', 'EXAM_GRADE'])).min(1).parse((process.env.WORKER_KINDS || 'AI_GENERATION,INGESTION,AI_EMBEDDING,STUDY_GENERATION,EXAM_FINALIZE,EXAM_GRADE').split(',').map(s => s.trim()));
  if (process.env.NODE_ENV === 'production' && kinds.some(k => k.startsWith('EXAM_')) && kinds.some(k => !k.startsWith('EXAM_'))) throw new Error('Production assessment and AI jobs must use separate workers.');
  const workerId = randomUUID();
  const heartbeatWorker = async () => {
    await prisma.workerHeartbeat.upsert({ where: { id: workerId }, create: { id: workerId, kinds, seenAt: new Date() }, update: { seenAt: new Date() } });
    await prisma.workerHeartbeat.deleteMany({ where: { seenAt: { lt: new Date(Date.now() - 86400000) } } });
  };
  await heartbeatWorker();
  const workerPulse = setInterval(() => { void heartbeatWorker().catch(() => console.error('Worker heartbeat failed')); }, 30000);
  try {
  while (!stopping) {
    const job = await claimJob(kinds);
    if (!job) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
    controller = new AbortController();
    const lease = { id: job.id, leaseToken: job.leaseToken, status: 'RUNNING' };
    const heartbeat = setInterval(() => { void prisma.durableJob.updateMany({ where: lease, data: { lockedAt: new Date() } }).then(updated => { if (!updated.count) controller?.abort(); }).catch(() => controller?.abort()); }, 30000);
    try {
      let result: Prisma.InputJsonValue;
      if (job.kind === 'AI_GENERATION') result = await (await import('../services/ai/generate')).generateQuestions(job.ownerId, job.payload, job.id, controller.signal);
      else if (job.kind === 'INGESTION') {
        const task=job.payload&&typeof job.payload==='object'&&!Array.isArray(job.payload)?job.payload.task:undefined;
        result=task==='COMPILE_LEARNING'?await (await import('../services/materials/compile-paper')).compileReviewedPaper(job,controller.signal):task==='ENHANCE_DIAGRAM'?await (await import('../services/ingestion/enhance-diagram')).enhanceReviewedDiagram(job,controller.signal):await (await import('../services/ingestion/trusted')).ingestTrustedDocument(job,controller.signal);
      }
      else if (job.kind === 'STUDY_GENERATION') result = await (await import('../services/study/library')).generateStudyResource(job.ownerId, z.object({ noteId: z.string() }).parse(job.payload).noteId, job.id, controller.signal);
      else if (job.kind === 'AI_EMBEDDING') result = await (await import('../services/knowledge/search')).indexApprovedArtifact(z.object({ artifactId: z.string() }).parse(job.payload).artifactId, controller.signal);
      else if (job.kind === 'EXAM_FINALIZE' || job.kind === 'EXAM_GRADE') {
        const payload = z.object({ quizId: z.string(), attemptId: z.string() }).parse(job.payload);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: job.ownerId } });
        result = await (await import('../services/assessment/service')).submitAttempt(payload.quizId, user, payload.attemptId);
      } else throw new ApiError(400, 'UNKNOWN_JOB', 'Unsupported job type.');
      if (controller.signal.aborted) throw new Error('Job lease lost');
      await prisma.durableJob.updateMany({ where: lease, data: { status: 'COMPLETED', result, error: null, lockedAt: null, leaseToken: null } });
      console.log('Job completed', job.id);
      if (process.env.WORKER_ONCE === '1') stopping = true;
    } catch (error) {
      const deferred = error instanceof AIBackpressure;
      const retry = deferred || (!(error instanceof ApiError && error.status < 500) && job.attempts < 3);
      await prisma.durableJob.updateMany({ where: lease, data: { status: retry ? 'QUEUED' : 'FAILED', availableAt: error instanceof AIBackpressure ? error.retryAt : new Date(Date.now() + 10000 * job.attempts), ...(deferred ? { attempts: { decrement: 1 } } : {}), lockedAt: null, leaseToken: null, error: error instanceof ApiError ? error.message : 'Processing failed. Check worker logs and configuration.' } });
      if (!retry && job.kind === 'STUDY_GENERATION') {
        const payload = z.object({ noteId: z.string() }).safeParse(job.payload);
        if (payload.success) await prisma.studyNote.updateMany({ where: { id: payload.data.noteId, ownerId: job.ownerId, status: 'DRAFT' }, data: { status: 'FAILED', staleReason: error instanceof ApiError ? error.message : 'Generation failed. Review the source scope and retry as a new revision.' } });
      }
      if (error instanceof AIBackpressure) console.log('AI job deferred', job.id, error.retryAt.toISOString());
      else console.error('Job failed', job.id, error instanceof ApiError ? { code: error.code, status: error.status } : error instanceof Error ? error.name : 'unknown');
      if (process.env.WORKER_ONCE === '1') stopping = true;
    } finally { clearInterval(heartbeat); controller = undefined; }
  }
  } finally { clearInterval(workerPulse); await prisma.workerHeartbeat.deleteMany({ where: { id: workerId } }); }
}
run().catch(error => { console.error('Worker stopped', error instanceof Error ? error.name : 'unknown'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
