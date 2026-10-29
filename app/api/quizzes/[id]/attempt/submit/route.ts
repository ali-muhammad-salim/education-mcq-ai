import { withAssessmentCapacity } from '@/services/assessment/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { submitSchema } from '@/lib/validations/assessment';
import { submitFromBrowser } from '@/services/assessment/service';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAssessmentCapacity(3, async () => {
  try { const user = await requireUser(req); const { id } = await context.params;
    const input = submitSchema.parse(await req.json());
    const receipt = await submitFromBrowser(id, user, input.attemptId);
    return NextResponse.json({ success: true, ...receipt }, { status: receipt.status === 'SUBMITTED' ? 202 : 200 });
  } catch (error) { return apiError(error); }
  });
}
