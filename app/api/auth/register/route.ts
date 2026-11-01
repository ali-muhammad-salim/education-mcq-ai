import { Prisma } from '@prisma/client';
import { sessionTokenHash } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { assertOrigin, rateLimit } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const input = z.object({ email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(12).max(256), name: z.string().trim().min(1).max(160), role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT') }).parse(await req.json());
    await rateLimit('register:' + input.email, 3, 3600);
    if (await prisma.user.findUnique({ where: { email: input.email } })) throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account with this email already exists.');
    // Educator privileges are granted by an administrator, never self-selected.
    const user = await prisma.user.create({ data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password), role: 'STUDENT', emailVerified: false } });
    const token = generateToken(), expiresAt = new Date(Date.now() + 7 * 86400000);
    await prisma.userSession.create({ data: { userId: user.id, token: sessionTokenHash(token), expiresAt } });
    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    response.cookies.set('mcqs_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
    return response;
  } catch (error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002' && String(error.meta?.target).includes('email')) return apiError(new ApiError(409,'ACCOUNT_EXISTS','An account with this email already exists. Sign in instead.'));
    return apiError(error);
  }
}
