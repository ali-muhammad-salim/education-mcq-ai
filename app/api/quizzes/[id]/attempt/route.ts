import { withAssessmentCapacity } from '@/services/assessment/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError } from '@/lib/api';
import { startAttempt, recoverAttempt } from '@/services/assessment/service';
import { z } from 'zod';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAssessmentCapacity(1, async () => {
  try { const user = await requireUser(req); await rateLimit('attempt-start:' + user.id, 120, 3600); const { id } = await context.params;
    const input = z.object({ practiceDurationMin: z.number().int().min(1).max(180).optional(), practiceUntimed: z.boolean().optional() }).parse(await req.json());
    return NextResponse.json({ success: true, attempt: await startAttempt(id, user, input) });
  } catch (error) { return apiError(error); }
  });
}
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(req); const { id } = await context.params;
    return NextResponse.json({ success: true, ...await recoverAttempt(id, user) });
  } catch (error) { return apiError(error); }
}
