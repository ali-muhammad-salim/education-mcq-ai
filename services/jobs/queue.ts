import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { Prisma, DurableJob } from '@prisma/client';
export function enqueueJob(ownerId: string, kind: 'AI_GENERATION' | 'INGESTION' | 'AI_EMBEDDING', payload: Prisma.InputJsonValue) {
  return prisma.durableJob.create({ data: { ownerId, kind, payload } });
}
export async function claimJob(kinds: readonly string[]) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('durable-job-claim'))`;
    const cutoff = new Date(Date.now() - 120000);
    await tx.durableJob.updateMany({ where: { kind: { in: [...kinds] }, status: 'RUNNING', lockedAt: { lt: cutoff }, attempts: { gte: 3 } }, data: { status: 'FAILED', error: 'Worker lease expired after the maximum number of attempts.' } });
    const jobs = await tx.$queryRaw<DurableJob[]>`SELECT j.* FROM "DurableJob" j WHERE j."kind" IN (${Prisma.join(kinds)}) AND j."attempts" < 3 AND ((j."status" = 'QUEUED' AND j."availableAt" <= timezone('UTC', NOW())) OR (j."status" = 'RUNNING' AND j."lockedAt" < timezone('UTC', NOW()) - INTERVAL '120 seconds')) AND (j."kind" <> 'INGESTION' OR NOT EXISTS (SELECT 1 FROM "DurableJob" other WHERE other."kind" = 'INGESTION' AND other."status" = 'RUNNING' AND other."lockedAt" >= timezone('UTC', NOW()) - INTERVAL '120 seconds')) ORDER BY CASE WHEN j."kind" IN ('EXAM_FINALIZE','EXAM_GRADE') THEN 0 ELSE 1 END, j."createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!jobs[0]) return null;
    return tx.durableJob.update({ where: { id: jobs[0].id }, data: { status: 'RUNNING', lockedAt: new Date(), leaseToken: randomUUID(), attempts: { increment: 1 } } });
  });
}
