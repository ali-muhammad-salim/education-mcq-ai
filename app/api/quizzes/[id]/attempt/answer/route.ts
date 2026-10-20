import { withAssessmentCapacity } from '@/services/assessment/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { saveAnswerSchema } from '@/lib/validations/assessment';
import { saveAnswer } from '@/services/assessment/service';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAssessmentCapacity(2, async () => {
  try { const user = await requireUser(req); const { id } = await context.params;
    const input = saveAnswerSchema.parse(await req.json());
    return NextResponse.json({ success: true, ...await saveAnswer(id, user, input) });
  } catch (error) { return apiError(error); }
  });
}
