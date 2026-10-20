import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await context.params;
    const input = z.object({ releaseAt: z.string().datetime().optional(), showCorrectAnswers: z.boolean().default(false) }).parse(await req.json());
    await serializable(async tx => {
      const quiz = await tx.quiz.findUnique({ where: { id } });
      if (!quiz || (user.role !== 'ADMIN' && quiz.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot release these results.');
      const data = { resultVisibility: input.releaseAt ? 'SCHEDULED' : 'IMMEDIATE', resultReleaseDate: input.releaseAt ? new Date(input.releaseAt) : new Date(), showCorrectAnswers: input.showCorrectAnswers };
      await tx.quizSetting.upsert({ where: { quizId: id }, create: { quizId: id, ...data }, update: data });
      await tx.auditLog.create({ data: { userId: user.id, action: 'RESULTS_RELEASED', resource: 'Quiz', resourceId: id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
