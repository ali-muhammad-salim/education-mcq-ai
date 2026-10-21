import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
export async function assertAIWorkerAvailable(kind: 'INGESTION' | 'AI_GENERATION' | 'STUDY_GENERATION') {
  if (process.env.NODE_ENV !== 'production') return;
  const worker = await prisma.workerHeartbeat.findFirst({ where: { kinds: { has: kind }, seenAt: { gt: new Date(Date.now() - 90000) } }, select: { id: true } });
  if (!worker) throw new ApiError(503, 'AI_WORKER_OFFLINE', 'AI processing is temporarily offline. Please retry once the document worker is available.');
}
