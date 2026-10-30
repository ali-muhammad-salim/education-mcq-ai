import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import type { AccountStatus } from '@prisma/client';
export { hashPassword, verifyPassword } from '@/lib/passwords';
export interface AuthUser {
  id: string; email: string; name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status?: AccountStatus;
  avatarUrl?: string | null;
}

const sessionCache = new Map<string, { user: AuthUser; cachedUntil: number }>();
const SESSION_CACHE_TTL_MS = 15_000;

export function invalidateSession(tokenHash: string) { sessionCache.delete(tokenHash); }
export function invalidateUserSessions(userId: string) {
  for (const [hash, entry] of sessionCache) if (entry.user.id === userId) sessionCache.delete(hash);
}

export function generateToken(): string { return crypto.randomBytes(32).toString('hex'); }
export function sessionTokenHash(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }
export async function getSessionUser(req: NextRequest, _legacyRole?: 'STUDENT' | 'TEACHER') {
  const token = req.cookies.get('mcqs_session')?.value || req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const hashed = sessionTokenHash(token);
  const nowMs = Date.now();
  if (!process.env.VITEST) {
    const cached = sessionCache.get(hashed);
    if (cached && cached.cachedUntil > nowMs) return cached.user;
  }
  const session = await prisma.userSession.findUnique({ where: { token: hashed }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
    sessionCache.delete(hashed);
    return null;
  }
  if (!process.env.VITEST) {
    if (sessionCache.size > 4096) sessionCache.clear();
    sessionCache.set(hashed, {
      user: session.user,
      cachedUntil: Math.min(nowMs + SESSION_CACHE_TTL_MS, session.expiresAt.getTime()),
    });
  }
  return session.user;
}
