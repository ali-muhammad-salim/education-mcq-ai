import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError } from '@/lib/api';
import { generationSchema } from '@/services/ai/generate';
import { enqueueJob } from '@/services/jobs/queue';
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']); await rateLimit('ai:' + user.id, 10, 3600);
    const input = generationSchema.parse(await req.json()), job = await enqueueJob(user.id, 'AI_GENERATION', input);
    return NextResponse.json({ success: true, jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) { return apiError(error); }
}
