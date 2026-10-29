import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { ingestionPayloadSchema } from '@/services/ingestion/upload';
import { enqueueJob } from '@/services/jobs/queue';
import { assertAIWorkerAvailable } from '@/services/ai/readiness';
export async function POST(req: NextRequest) {
  try { const user = await requireUser(req, ['ADMIN']), input = ingestionPayloadSchema.parse(await req.json());
    if (input.resourceType === 'all_defaults') throw new ApiError(400, 'SOURCE_REQUIRED', 'Upload a specific source document for evidence review.');
    await assertAIWorkerAvailable('INGESTION');
    const job = await enqueueJob(user.id, 'INGESTION', input);
    return NextResponse.json({ success: true, jobId: job.id, status: job.status }, { status: 202 });
  } catch (error) { return apiError(error); }
}
