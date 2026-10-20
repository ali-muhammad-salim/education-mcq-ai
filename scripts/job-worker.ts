import prisma from '../lib/prisma';
import { claimJob } from '../services/jobs/queue';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma, DurableJob } from '@prisma/client';
import { generateQuestions } from '../services/ai/generate';
import { ingestionPayloadSchema } from '../services/ingestion/upload';
import { readEducationalAsset } from '../lib/storage';
import { ApiError } from '../lib/api';
import { submitAttempt } from '../services/assessment/service';
import { z } from 'zod';

let stopping = false;
let controller: AbortController | undefined;
process.on('SIGTERM', () => { stopping = true; controller?.abort(); });
process.on('SIGINT', () => { stopping = true; controller?.abort(); });
async function ingest(job: DurableJob, signal: AbortSignal): Promise<Prisma.InputJsonValue> {
  const input = ingestionPayloadSchema.parse(job.payload), folder = path.join(process.cwd(), 'data', 'jobs', job.id);
  await fs.mkdir(folder, { recursive: true });
  let source = 'none', keyFilePath: string | undefined;
  if (input.storageKey) { source = path.join(folder, 'source.pdf'); await fs.writeFile(source, (await readEducationalAsset(input.storageKey)).buffer); }
  if (input.keyStorageKey) { keyFilePath = path.join(folder, 'answer-key.pdf'); await fs.writeFile(keyFilePath, (await readEducationalAsset(input.keyStorageKey)).buffer); }
  const progressFile = path.join(folder, 'progress.json');
  const args = input.resourceType === 'textbook'
    ? ['-m', 'services.ingestion', source, '--doc-type', 'BOOK']
    : [path.join('services', 'ingestion', 'unified_runner.py'), input.resourceType, source, JSON.stringify({ ...input.meta, keyFilePath })];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.PYTHON_EXECUTABLE || 'python', args, { cwd: process.cwd(), shell: false, windowsHide: true, signal, stdio: 'ignore', env: { ...process.env, INGEST_PROGRESS_FILE: progressFile } });
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Ingestion exceeded its time limit')); }, 60 * 60 * 1000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); if (code === 0) resolve(); else reject(new Error('Ingestion worker failed')); });
  });
  if (input.resourceType === 'textbook') return { message: 'Textbook regions persisted by the ingestion repository.', storageKey: input.storageKey || '' };
  const output: unknown = JSON.parse(await fs.readFile(progressFile, 'utf8'));
  const { z } = await import('zod');
  const checked = z.object({ status: z.literal('COMPLETED'), results: z.record(z.string(), z.json()) }).parse(output);
  return checked.results;
}
async function run() {
  console.log('Durable worker started');
  while (!stopping) {
    const kinds = z.array(z.enum(['AI_GENERATION', 'INGESTION', 'EXAM_FINALIZE', 'EXAM_GRADE'])).min(1).parse((process.env.WORKER_KINDS || 'AI_GENERATION,INGESTION,EXAM_FINALIZE,EXAM_GRADE').split(',').map(s => s.trim()));
    const job = await claimJob(kinds);
    if (!job) { await new Promise(resolve => setTimeout(resolve, 2000)); continue; }
    controller = new AbortController();
    const lease = { id: job.id, leaseToken: job.leaseToken, status: 'RUNNING' };
    const heartbeat = setInterval(() => { void prisma.durableJob.updateMany({ where: lease, data: { lockedAt: new Date() } }).then(updated => { if (!updated.count) controller?.abort(); }).catch(() => controller?.abort()); }, 30000);
    try {
      let result: Prisma.InputJsonValue;
      if (job.kind === 'AI_GENERATION') result = await generateQuestions(job.ownerId, job.payload, job.id, controller.signal);
      else if (job.kind === 'INGESTION') result = await ingest(job, controller.signal);
      else if (job.kind === 'EXAM_FINALIZE' || job.kind === 'EXAM_GRADE') {
        const payload = z.object({ quizId: z.string(), attemptId: z.string() }).parse(job.payload);
        const user = await prisma.user.findUniqueOrThrow({ where: { id: job.ownerId } });
        result = await submitAttempt(payload.quizId, user, payload.attemptId);
      } else throw new ApiError(400, 'UNKNOWN_JOB', 'Unsupported job type.');
      if (controller.signal.aborted) throw new Error('Job lease lost');
      await prisma.durableJob.updateMany({ where: lease, data: { status: 'COMPLETED', result, error: null, lockedAt: null, leaseToken: null } });
      console.log('Job completed', job.id);
      if (process.env.WORKER_ONCE === '1') stopping = true;
    } catch (error) {
      const retry = !(error instanceof ApiError && error.status < 500) && job.attempts < 3;
      await prisma.durableJob.updateMany({ where: lease, data: { status: retry ? 'QUEUED' : 'FAILED', availableAt: new Date(Date.now() + 10000 * job.attempts), lockedAt: null, leaseToken: null, error: error instanceof ApiError ? error.message : 'Processing failed. Check worker logs and configuration.' } });
      console.error('Job failed', job.id, error instanceof Error ? error.name : 'unknown');
      if (process.env.WORKER_ONCE === '1') stopping = true;
    } finally { clearInterval(heartbeat); controller = undefined; }
  }
}
run().catch(error => { console.error('Worker stopped', error instanceof Error ? error.name : 'unknown'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
