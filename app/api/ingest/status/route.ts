import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
import prisma from '@/lib/prisma';
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req, ['ADMIN']), id = req.nextUrl.searchParams.get('jobId');
    const job = await prisma.durableJob.findFirst({ where: { kind: 'INGESTION', ownerId: user.id, ...(id ? { id } : {}) }, orderBy: { createdAt: 'desc' } });
    const progressSchema = z.object({ percent: z.number().min(0).max(100).default(0), stage: z.string().max(500).default('Processing'), message: z.string().max(2000).default('Processing document'), logs: z.array(z.string().max(4000)).max(200).default([]) });
    let progress: z.infer<typeof progressSchema> | null = null;
    if (job?.status === 'RUNNING' || job?.status === 'QUEUED') { const parsed = progressSchema.safeParse(job.result); if (parsed.success) progress = parsed.data; }
    return NextResponse.json({ success: true, jobId: job?.id, status: job?.status || 'IDLE', percent: job?.status === 'COMPLETED' ? 100 : Math.min(progress?.percent ?? 0, 99), stage: progress?.stage || job?.status || 'Ready', message: job?.error || progress?.message || 'Processing status: ' + (job?.status || 'IDLE'), results: job?.result && typeof job.result === 'object' && !Array.isArray(job.result) ? { ...job.result, slos: job.result.slos ?? job.result.slos_extracted, questions: job.result.questions ?? job.result.extracted_questions } : {}, logs: progress?.logs || [] });
  } catch (error) { return apiError(error); }
}
