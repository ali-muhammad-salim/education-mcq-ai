import { withAssessmentCapacity } from '@/services/assessment/capacity';
import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { lockedTransaction } from '@/repositories/transaction';
import { resolveQuiz } from '@/services/assessment/service';
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAssessmentCapacity(0, async () => {
  try {
    const user = await requireUser(req); await rateLimit('events:' + user.id, 120, 60);
    const { id } = await context.params, quiz = await resolveQuiz(id);
    const input = z.object({ attemptId: z.string(), eventType: z.enum(['TAB_HIDDEN', 'FOCUS_LOST', 'HEARTBEAT']), eventId: z.string().uuid() }).parse(await req.json());
    const tabSwitchCount = await lockedTransaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "QuizAttempt" WHERE "id" = ${input.attemptId} FOR UPDATE`;
      const attempt = await tx.quizAttempt.findUnique({ where: { id: input.attemptId } });
      if (!attempt || attempt.studentId !== user.id || attempt.quizId !== quiz.id || attempt.status !== 'IN_PROGRESS') throw new ApiError(403, 'FORBIDDEN', 'Attempt not active or unauthorized.');
      if (await tx.assessmentEvent.findUnique({ where: { id: input.eventId } })) return;
      await tx.assessmentEvent.create({ data: { id: input.eventId, attemptId: attempt.id, eventType: input.eventType } });
      if (input.eventType === 'TAB_HIDDEN' && quiz.settings?.tabMonitoringEnabled) { const updated = await tx.quizAttempt.update({ where: { id: attempt.id }, data: { tabSwitchCount: { increment: 1 } } }); return updated.tabSwitchCount; }
      return attempt.tabSwitchCount;
    });
    return NextResponse.json({ success: true, tabSwitchCount, warningThreshold: quiz.settings?.tabWarningThreshold ?? 3 });
  } catch (error) { return apiError(error); }
  });
}
