import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { getDoubtQueue, resolveDoubtItem, addDoubtItem, doubtDataSchema } from '@/lib/aiDoubtStore';
import prisma from '@/lib/prisma';
import { ApiError } from '@/lib/api';
import { questionSchema } from '@/lib/validations/assessment';
import { z } from 'zod';
export async function GET(req: NextRequest) {
  try { const user = await requireUser(req, ['TEACHER', 'ADMIN']), queue = await getDoubtQueue(user.role === 'ADMIN' ? undefined : user.id);
    return NextResponse.json({ success: true, pendingCount: queue.filter(q => q.status === 'PENDING_REVIEW').length, pending: queue.filter(q => q.status === 'PENDING_REVIEW'), resolved: queue.filter(q => q.status !== 'PENDING_REVIEW') });
  } catch (error) { return apiError(error); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ['TEACHER', 'ADMIN']), body: unknown = await req.json();
    const input = z.discriminatedUnion('action', [
      z.object({ action: z.literal('RESOLVE'), doubtId: z.string(), resolution: z.enum(['APPROVED', 'DISMISSED']), correctedAnswer: z.string().max(4000).optional() }),
      z.object({ action: z.literal('REVISE'), doubtId: z.string(), question: questionSchema }),
      z.object({ action: z.literal('CREATE'), data: doubtDataSchema }),
    ]).parse(body);
    if (input.action === 'REVISE') { const record = await prisma.aIDoubtRecord.findUnique({ where: { id: input.doubtId } }); if (!record || (user.role !== 'ADMIN' && record.ownerId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot revise this question.'); const data = doubtDataSchema.parse(record.data); await prisma.aIDoubtRecord.update({ where: { id: record.id }, data: { status: 'PENDING_REVIEW', data: { ...data, question: input.question, doubtReason: 'Educator revision requires review.' } } }); await prisma.auditLog.create({ data: { userId: user.id, action: 'AI_QUESTION_REVISED', resource: 'AIDoubtRecord', resourceId: record.id } }); return NextResponse.json({ success: true }); }
    const item = input.action === 'RESOLVE' ? await resolveDoubtItem(input.doubtId, user.id, user.role === 'ADMIN', input.resolution, input.correctedAnswer) : await addDoubtItem(user.id, input.data);
    return NextResponse.json({ success: true, item });
  } catch (error) { return apiError(error); }
}
