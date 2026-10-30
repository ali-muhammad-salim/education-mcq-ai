import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { assertOrigin, requireUser, rateLimit } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { invalidateSession, invalidateUserSessions, sessionTokenHash } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/passwords';
import { z } from 'zod';

function currentTokenHash(req: NextRequest) {
  const token = req.cookies.get('mcqs_session')?.value || req.headers.get('authorization')?.replace(/^Bearer /, '');
  return token ? sessionTokenHash(token) : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const hash = currentTokenHash(req);
    const [profile, request, sessions, activeSessions] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, emailVerified: true, role: true, createdAt: true } }),
      prisma.auditLog.findFirst({ where: { userId: user.id, action: { in: ['TEACHER_ACCESS_REQUESTED', 'TEACHER_ACCESS_REJECTED'] } }, orderBy: { createdAt: 'desc' }, select: { action: true, createdAt: true } }),
      prisma.userSession.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, token: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true } }),
      prisma.userSession.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
    ]);
    return NextResponse.json({
      success: true,
      user: profile,
      teacherRequest: request,
      activeSessions,
      sessions: sessions.map(({ token, ...session }) => ({ ...session, current: token === hash })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const user = await requireUser(req);
    await rateLimit('account:' + user.id, 30, 3600);
    const input = z.discriminatedUnion('action', [
      z.object({ action: z.literal('TEACHER_REQUEST'), reason: z.string().trim().min(10).max(2000) }),
      z.object({ action: z.literal('REVOKE_SESSIONS') }),
      z.object({ action: z.literal('REVOKE_SESSION'), sessionId: z.string().uuid() }),
      z.object({ action: z.literal('PROFILE'), name: z.string().trim().min(1).max(160) }),
      z.object({ action: z.literal('CHANGE_PASSWORD'), currentPassword: z.string().min(1).max(256), newPassword: z.string().min(12).max(256) }),
    ]).parse(await req.json());
    const hash = currentTokenHash(req);
    const response = NextResponse.json({ success: true });

    if (input.action === 'PROFILE') {
      await prisma.user.update({ where: { id: user.id }, data: { name: input.name } });
    } else if (input.action === 'REVOKE_SESSIONS') {
      await prisma.userSession.deleteMany({ where: { userId: user.id } });
      invalidateUserSessions(user.id);
      response.cookies.delete('mcqs_session');
    } else if (input.action === 'REVOKE_SESSION') {
      const target = await prisma.userSession.findFirst({ where: { id: input.sessionId, userId: user.id }, select: { id: true, token: true } });
      if (!target) throw new ApiError(404, 'SESSION_NOT_FOUND', 'That device is already signed out.');
      await prisma.userSession.delete({ where: { id: target.id } });
      invalidateSession(target.token);
      const current = target.token === hash;
      const result = NextResponse.json({ success: true, current });
      if (current) result.cookies.delete('mcqs_session');
      return result;
    } else if (input.action === 'CHANGE_PASSWORD') {
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
      if (!account?.passwordHash) throw new ApiError(400, 'NO_PASSWORD', 'This account signs in with Google. Use password recovery to set a password first.');
      if (!await verifyPassword(input.currentPassword, account.passwordHash)) throw new ApiError(400, 'INVALID_PASSWORD', 'Your current password is incorrect.');
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
      await prisma.userSession.deleteMany({ where: { userId: user.id, ...(hash ? { token: { not: hash } } : {}) } });
      invalidateUserSessions(user.id);
    } else {
      await prisma.auditLog.create({ data: { userId: user.id, action: 'TEACHER_ACCESS_REQUESTED', resource: 'User', resourceId: user.id, details: { reason: input.reason } } });
    }
    return response;
  } catch (error) { return apiError(error); }
}
