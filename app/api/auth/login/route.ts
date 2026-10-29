import { sessionTokenHash } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyPassword, hashPassword, generateToken } from '@/lib/auth';
import { assertOrigin, rateLimit } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const input = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(1).max(256) }).strict().parse(await req.json());
    await rateLimit('login:' + input.email, 10, 900);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) throw new ApiError(401, 'INVALID_LOGIN', 'Invalid email or password.');
    if (user.status !== 'ACTIVE') throw new ApiError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
    if (!user.passwordHash.startsWith('scrypt:')) await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.password) } });
    const token = generateToken(), expiresAt = new Date(Date.now() + 7 * 86400000);
    await prisma.userSession.create({ data: { userId: user.id, token: sessionTokenHash(token), expiresAt } });
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
    response.cookies.set('mcqs_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
    return response;
  } catch (error) { return apiError(error); }
}
