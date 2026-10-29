import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { lockedTransaction } from '@/repositories/transaction';
const policySchema = z.object({
  releaseAt: z.string().datetime().nullable().optional(),
  resultVisibility: z.enum(['IMMEDIATE','MANUAL_RELEASE','SCHEDULED']).optional(),
  showCorrectAnswers: z.boolean().optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  maxAttempts: z.number().int().min(1).max(100).optional(), allowRetries: z.boolean().optional(),
  randomizeQuestions: z.boolean().optional(), randomizeOptions: z.boolean().optional(),
  tabMonitoringEnabled: z.boolean().optional(),
  visibility: z.enum(['PUBLIC','UNLISTED','PRIVATE']).optional(),
  scheduleStart: z.string().datetime().nullable().optional(), scheduleEnd: z.string().datetime().nullable().optional(),
}).strict();
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, ['TEACHER','ADMIN']), { id } = await context.params;
    const quiz = await prisma.quiz.findUnique({ where: { id }, include: { settings: true } });
    if (!quiz || (user.role !== 'ADMIN' && quiz.teacherId !== user.id)) throw new ApiError(403,'FORBIDDEN','You cannot manage this assessment.');
    return NextResponse.json({ quiz: { id: quiz.id, code: quiz.code, title: quiz.title, status: quiz.status, durationMin: quiz.durationMin, visibility: quiz.visibility, scheduleStart: quiz.scheduleStart, scheduleEnd: quiz.scheduleEnd, settings: quiz.settings } }, { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await context.params;
    const input = policySchema.parse(await req.json());
    await lockedTransaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${id} FOR UPDATE`;
      const quiz = await tx.quiz.findUnique({ where: { id }, include: { settings: true } });
      if (!quiz || (user.role !== 'ADMIN' && quiz.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot manage this assessment.');
      const legacyRelease = input.resultVisibility === undefined && (Object.keys(input).length === 0 || Object.keys(input).every(key => ['releaseAt','showCorrectAnswers'].includes(key)));
      const policy = input.resultVisibility || (legacyRelease ? input.releaseAt ? 'SCHEDULED' : 'IMMEDIATE' : quiz.settings?.resultVisibility || 'MANUAL_RELEASE');
      const releaseDate = input.releaseAt === undefined && !legacyRelease ? quiz.settings?.resultReleaseDate || null : input.releaseAt ? new Date(input.releaseAt) : null;
      if (policy === 'SCHEDULED' && !releaseDate) throw new ApiError(400,'DATE_REQUIRED','Choose a result release date.');
      const start = input.scheduleStart === undefined ? quiz.scheduleStart : input.scheduleStart ? new Date(input.scheduleStart) : null;
      const end = input.scheduleEnd === undefined ? quiz.scheduleEnd : input.scheduleEnd ? new Date(input.scheduleEnd) : null;
      if (start && end && start >= end) throw new ApiError(400,'INVALID_SCHEDULE','The closing time must be after the opening time.');
      const { releaseAt: _releaseAt, resultVisibility: _policy, durationMin, visibility, scheduleStart: _start, scheduleEnd: _end, ...preferences } = input;
      const data = { ...preferences, resultVisibility: policy, resultReleaseDate: releaseDate, immediateFeedback: policy === 'IMMEDIATE' };
      await tx.quiz.update({ where: { id }, data: { durationMin, visibility, scheduleStart: start, scheduleEnd: end } });
      await tx.quizSetting.upsert({ where: { quizId: id }, create: { quizId: id, ...data }, update: data });
      await tx.auditLog.create({ data: { userId: user.id, action: 'QUIZ_SHARING_UPDATED', resource: 'Quiz', resourceId: id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
