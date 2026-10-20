import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { ingestionPayloadSchema } from '@/services/ingestion/upload';
import { enqueueJob } from '@/services/jobs/queue';
export async function POST(req: NextRequest) {
  try { const user = await requireUser(req, ['ADMIN']), input = ingestionPayloadSchema.parse(await req.json()), job = await enqueueJob(user.id, 'INGESTION', input);
    return NextResponse.json({ success: true, jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) { return apiError(error); }
}
