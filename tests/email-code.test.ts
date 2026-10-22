import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';

const delivery = vi.hoisted(() => ({ configured: true, success: true, html: '' }));
vi.mock('@/lib/email', () => ({
  isEmailConfigured: () => delivery.configured,
  sendTransactionalEmail: async (payload: { html: string }) => { delivery.html = payload.html; return { success: delivery.success }; },
}));
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes('_test')) throw new Error('A dedicated test database is required.');
describe.skipIf(!url)('Email code authentication', () => {
  const suffix = randomUUID(), emails: string[] = [];
  let db: PrismaClient;
  const email = () => { const value = `otp-${emails.length}-${suffix}@example.test`; emails.push(value); return value; };
  const request = (identifier: string, action: string, otp?: string) => new NextRequest('http://localhost/api/auth/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, action, otp }) });
  beforeAll(() => { process.env.DATABASE_URL = url; db = new PrismaClient({ datasources: { db: { url } } }); });
  afterAll(async () => {
    if (!db) return;
    const users = await db.user.findMany({ where: { email: { in: emails } } });
    await db.userSession.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.authChallenge.deleteMany({ where: { identifier: { in: emails } } });
    await db.requestLimit.deleteMany({ where: { key: { in: emails.flatMap(value => ['send', 'verify'].map(action => createHash('sha256').update(`otp:${action}:${value}`).digest('hex'))) } } });
    await db.$disconnect();
    const { default: shared } = await import('@/lib/prisma'); await shared.$disconnect();
  });
  it('stores only the hash, rejects a wrong code, consumes a valid code once and creates a session', async () => {
    const { POST } = await import('@/app/api/auth/otp/route'), identifier = email();
    expect((await POST(request(identifier, 'send'))).status).toBe(200);
    const code = delivery.html.match(/<strong>(\d{6})<\/strong>/)![1];
    const challenge = await db.authChallenge.findUniqueOrThrow({ where: { identifier } });
    expect(challenge.codeHash).toBe(createHash('sha256').update(code).digest('hex'));
    expect((await POST(request(identifier, 'verify', '000000'))).status).toBe(401);
    const verified = await POST(request(identifier, 'verify', code));
    expect(verified.status).toBe(200); expect(verified.headers.get('set-cookie')).toContain('HttpOnly');
    expect((await verified.json()).user.role).toBe('STUDENT');
    expect((await POST(request(identifier, 'verify', code))).status).toBe(401);
  });
  it('locks the challenge after five wrong guesses', async () => {
    const { POST } = await import('@/app/api/auth/otp/route'), identifier = email();
    await POST(request(identifier, 'send')); const code = delivery.html.match(/<strong>(\d{6})<\/strong>/)![1];
    for (let i = 0; i < 5; i++) expect((await POST(request(identifier, 'verify', '000000'))).status).toBe(401);
    expect((await POST(request(identifier, 'verify', code))).status).toBe(401);
  });
  it('rejects an expired code', async () => {
    const { POST } = await import('@/app/api/auth/otp/route'), identifier = email();
    await POST(request(identifier, 'send')); const code = delivery.html.match(/<strong>(\d{6})<\/strong>/)![1];
    await db.authChallenge.update({ where: { identifier }, data: { expiresAt: new Date(0) } });
    expect((await POST(request(identifier, 'verify', code))).status).toBe(401);
  });
  it('does not pretend an undelivered email was sent and removes the unusable challenge', async () => {
    const { POST } = await import('@/app/api/auth/otp/route'), identifier = email();
    delivery.success = false;
    try { expect((await POST(request(identifier, 'send'))).status).toBe(503); expect(await db.authChallenge.findUnique({ where: { identifier } })).toBeNull(); }
    finally { delivery.success = true; }
  });
  it('fails clearly when the provider is not configured', async () => {
    const { POST } = await import('@/app/api/auth/otp/route'); delivery.configured = false;
    try { expect((await POST(request(email(), 'send'))).status).toBe(503); }
    finally { delivery.configured = true; }
  });
});
