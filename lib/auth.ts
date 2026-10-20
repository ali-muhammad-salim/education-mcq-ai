import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
export { hashPassword, verifyPassword } from '@/lib/passwords';
export interface AuthUser {
  id: string; email: string; name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  avatarUrl?: string | null;
}
export function generateToken(): string { return crypto.randomBytes(32).toString('hex'); }
export function sessionTokenHash(token: string): string { return crypto.createHash('sha256').update(token).digest('hex'); }
export async function getSessionUser(req: NextRequest, _legacyRole?: 'STUDENT' | 'TEACHER') {
  const token = req.cookies.get('mcqs_session')?.value || req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const session = await prisma.userSession.findUnique({ where: { token: sessionTokenHash(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
  return session.user;
}
