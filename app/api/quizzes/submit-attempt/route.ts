import { withAssessmentCapacity } from '@/services/assessment/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
import { submitFromBrowser } from '@/services/assessment/service';
export async function POST(req: NextRequest) {
  return withAssessmentCapacity(3, async () => {
  try { const user = await requireUser(req);
    const input = z.object({ quizId: z.string().min(1), attemptId: z.string().min(1) }).strict().parse(await req.json());
    const receipt = await submitFromBrowser(input.quizId, user, input.attemptId);
    return NextResponse.json({ success: true, ...receipt }, { status: receipt.status === 'SUBMITTED' ? 202 : 200 });
  } catch (error) { return apiError(error); }
  });
}
