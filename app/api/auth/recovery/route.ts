import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { assertOrigin, rateLimit, requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { hashPassword } from '@/lib/passwords';
import { isEmailConfigured, sendTransactionalEmail } from '@/lib/email';
import { configuredSiteUrl } from '@/lib/site-url';
import { invalidateUserSessions } from '@/lib/auth';
export async function POST(req: NextRequest) {
  try { assertOrigin(req);
    const input = z.object({ action: z.enum(['SEND_RESET','RESET','SEND_VERIFY','VERIFY']), email: z.string().trim().email().max(254).transform(s => s.toLowerCase()).optional(), token: z.string().regex(/^[a-f0-9]{64}$/).optional(), password: z.string().min(12).max(256).optional() }).parse(await req.json());
    const verification = input.action.includes('VERIFY');
    const user = verification ? await requireUser(req) : null;
    const email = user?.email || input.email;
    if (!email) throw new ApiError(400, 'EMAIL_REQUIRED', 'Enter your email address.');
    await rateLimit('recovery:' + input.action + ':' + email, input.action.startsWith('SEND') ? 3 : 10, 900);
    const identifier = (verification ? 'verify:' : 'reset:') + email;
    if (input.action.startsWith('SEND')) {
      if (!isEmailConfigured()) throw new ApiError(503, 'EMAIL_UNAVAILABLE', 'Email delivery is unavailable. Contact the site administrator.');
      const account = await prisma.user.findUnique({ where: { email } });
      if (account?.status === 'ACTIVE') {
        const token = randomBytes(32).toString('hex'), codeHash = createHash('sha256').update(token).digest('hex');
        await prisma.authChallenge.upsert({ where: { identifier }, create: { identifier, codeHash, name: account.id, expiresAt: new Date(Date.now() + 1800000) }, update: { codeHash, name: account.id, attempts: 0, expiresAt: new Date(Date.now() + 1800000) } });
        const origin = configuredSiteUrl();
        if (!origin) throw new ApiError(503, 'CONFIGURATION_REQUIRED', 'The site address must be configured before sending account links.');
        const url = new URL('/account', origin); url.searchParams.set('action', verification ? 'VERIFY' : 'RESET'); url.searchParams.set('token', token); url.searchParams.set('email', email);
        const sent = await sendTransactionalEmail({ to: email, subject: verification ? 'Verify your email' : 'Reset your password', html: '<p>Use this single-use link within 30 minutes:</p><p><a href="' + url.toString().replaceAll('&', '&amp;') + '">' + (verification ? 'Verify email' : 'Reset password') + '</a></p><p>If you did not request this, ignore this email.</p>' });
        if (!sent.success) { await prisma.authChallenge.deleteMany({ where: { identifier, codeHash } }); throw new ApiError(503, 'EMAIL_FAILED', 'Unable to deliver email. Please retry later.'); }
      }
      return NextResponse.json({ success: true, message: 'If an active account exists, an email has been sent.' });
    }
    if (!input.token || (!verification && !input.password)) throw new ApiError(400, 'TOKEN_REQUIRED', 'Use a valid link and supply the required information.');
    const passwordHash = !verification ? await hashPassword(input.password!) : undefined;
    let resetUserId: string | null = null;
    await serializable(async tx => {
      const challenge = await tx.authChallenge.findUnique({ where: { identifier } });
      if (!challenge || challenge.expiresAt <= new Date() || !timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), createHash('sha256').update(input.token!).digest())) throw new ApiError(400, 'LINK_EXPIRED', 'This link is invalid, expired, or already used. Request a new link.');
      const account = await tx.user.findUnique({ where: { email } });
      if (!account || account.status !== 'ACTIVE' || account.id !== challenge.name) throw new ApiError(400, 'LINK_EXPIRED', 'This link is unavailable.');
      await tx.authChallenge.delete({ where: { identifier } });
      await tx.user.update({ where: { id: account.id }, data: verification ? { emailVerified: true } : { passwordHash } });
      if (!verification) { await tx.userSession.deleteMany({ where: { userId: account.id } }); resetUserId = account.id; }
      await tx.auditLog.create({ data: { userId: account.id, action: verification ? 'EMAIL_VERIFIED' : 'PASSWORD_RESET', resource: 'User', resourceId: account.id } });
    });
    if (resetUserId) invalidateUserSessions(resetUserId);
    const response = NextResponse.json({ success: true, message: verification ? 'Email verified.' : 'Password reset. Sign in with your new password.' });
    if (!verification) response.cookies.delete('mcqs_session');
    return response;
  } catch (error) { return apiError(error); }
}
