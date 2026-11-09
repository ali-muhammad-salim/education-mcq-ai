import { sessionTokenHash } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { assertOrigin, rateLimit } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { isEmailConfigured, sendTransactionalEmail } from '@/lib/email';
import { sessionMeta } from '@/lib/session-meta';
export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const input = z.object({ action: z.enum(['send', 'verify']), identifier: z.string().trim().email().max(254).transform(s => s.toLowerCase()), otp: z.string().regex(/^\d{6}$/).optional(), name: z.string().trim().min(1).max(160).default('Student') }).parse(await req.json());
    await rateLimit('otp:' + input.action + ':' + input.identifier, input.action === 'send' ? 3 : 10, 600);
    if (input.action === 'send') {
      if (!isEmailConfigured()) throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email sign-in is unavailable. Please use your password or Google sign-in.');
      const code = randomInt(100000, 1000000).toString(), codeHash = createHash('sha256').update(code).digest('hex');
      await prisma.authChallenge.upsert({ where: { identifier: input.identifier }, create: { identifier: input.identifier, codeHash, name: input.name, expiresAt: new Date(Date.now() + 600000) }, update: { codeHash, name: input.name, attempts: 0, expiresAt: new Date(Date.now() + 600000) } });
      const sent = await sendTransactionalEmail({ to: input.identifier, subject: 'Your sign-in code', html: '<p>Your sign-in code is <strong>' + code + '</strong>. It expires in 10 minutes.</p>' });
      if (!sent.success) { await prisma.authChallenge.deleteMany({ where: { identifier: input.identifier, codeHash } }); throw new ApiError(503, 'EMAIL_FAILED', 'Could not deliver the sign-in code.'); }
      return NextResponse.json({ success: true, message: 'Sign-in code sent.' });
    }
    if (!input.otp) throw new ApiError(400, 'CODE_REQUIRED', 'Enter the sign-in code.');
    const meta = sessionMeta(req);
    const verified = await serializable(async tx => {
      const challenge = await tx.authChallenge.findUnique({ where: { identifier: input.identifier } });
      if (!challenge || challenge.expiresAt < new Date() || challenge.attempts >= 5) return null;
      const digest = createHash('sha256').update(input.otp!).digest();
      if (!timingSafeEqual(digest, Buffer.from(challenge.codeHash, 'hex'))) { await tx.authChallenge.update({ where: { identifier: input.identifier }, data: { attempts: { increment: 1 } } }); return null; }
      await tx.authChallenge.delete({ where: { identifier: input.identifier } });
      const user = await tx.user.upsert({ where: { email: input.identifier }, create: { email: input.identifier, name: challenge.name, emailVerified: true }, update: { emailVerified: true } });
      if (user.status !== 'ACTIVE') return null;
      const token = generateToken(), expiresAt = new Date(Date.now() + 7 * 86400000);
      await tx.userSession.create({ data: { userId: user.id, token: sessionTokenHash(token), expiresAt, ...meta } });
      return { user, token, expiresAt };
    });
    if (!verified) throw new ApiError(401, 'INVALID_CODE', 'Code is invalid or expired.');
    const { user, token, expiresAt } = verified;
    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set('mcqs_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: expiresAt });
    return response;
  } catch (error) { return apiError(error); }
}
