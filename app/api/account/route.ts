import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
export async function GET(req: NextRequest) {
  try { const user = await requireUser(req); const [profile, request, sessions] = await Promise.all([prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, emailVerified: true, role: true } }), prisma.auditLog.findFirst({ where: { userId: user.id, action: { in: ['TEACHER_ACCESS_REQUESTED', 'TEACHER_ACCESS_REJECTED'] } }, orderBy: { createdAt: 'desc' }, select: { action: true, createdAt: true } }), prisma.userSession.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } })]); return NextResponse.json({ success: true, user: profile, teacherRequest: request, activeSessions: sessions });
  } catch (error) { return apiError(error); }
}
export async function POST(req: NextRequest) {
  try { const user = await requireUser(req); await rateLimit('account:' + user.id, 10, 3600);
    const input = z.discriminatedUnion('action', [z.object({ action: z.literal('TEACHER_REQUEST'), reason: z.string().trim().min(10).max(2000) }), z.object({ action: z.literal('REVOKE_SESSIONS') }), z.object({ action: z.literal('PROFILE'), name: z.string().trim().min(1).max(160) })]).parse(await req.json());
    if (input.action === 'PROFILE') await prisma.user.update({ where: { id: user.id }, data: { name: input.name } });
    else if (input.action === 'REVOKE_SESSIONS') await prisma.userSession.deleteMany({ where: { userId: user.id } });
    else await prisma.auditLog.create({ data: { userId: user.id, action: 'TEACHER_ACCESS_REQUESTED', resource: 'User', resourceId: user.id, details: { reason: input.reason } } });
    const response = NextResponse.json({ success: true }); if (input.action === 'REVOKE_SESSIONS') response.cookies.delete('mcqs_session'); return response;
  } catch (error) { return apiError(error); }
}
