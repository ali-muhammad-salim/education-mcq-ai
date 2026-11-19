import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  userSession: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  auditLog: { findFirst: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ default: db }));
import { getSessionUser } from '@/lib/auth';
import { requireUser } from '@/lib/security';
import { GET } from '@/app/api/account/route';

const user = { id: 'user-1', email: 'teacher@example.test', name: 'Teacher', role: 'TEACHER', status: 'ACTIVE' };
const session = () => ({ token: 'hashed', expiresAt: new Date(Date.now() + 60000), user: { ...user } });
let token = 0;
const request = () => new NextRequest('http://localhost/api/account', { headers: { authorization: `Bearer session-${++token}` } });

beforeEach(() => {
  vi.resetAllMocks();
  // Exercise the same path as a deployed server, not the old test-only cache bypass.
  vi.stubEnv('VITEST', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('Authoritative session validation', () => {
  it('rejects a revoked session on the very next request', async () => {
    const req = request();
    db.userSession.findUnique.mockResolvedValueOnce(session()).mockResolvedValueOnce(null);
    expect(await getSessionUser(req)).toMatchObject({ id: user.id });
    expect(await getSessionUser(req)).toBeNull();
  });
  it('rejects a suspended account immediately', async () => {
    const req = request();
    db.userSession.findUnique.mockResolvedValueOnce(session()).mockResolvedValueOnce({ ...session(), user: { ...user, status: 'SUSPENDED' } });
    expect(await getSessionUser(req)).not.toBeNull();
    await expect(requireUser(req)).rejects.toMatchObject({ status: 401 });
  });
  it('does not reuse teacher permissions after a role change', async () => {
    const req = request();
    db.userSession.findUnique.mockResolvedValueOnce(session()).mockResolvedValueOnce({ ...session(), user: { ...user, role: 'STUDENT' } });
    expect(await requireUser(req, ['TEACHER'])).toMatchObject({ role: 'TEACHER' });
    await expect(requireUser(req, ['TEACHER'])).rejects.toMatchObject({ status: 403 });
  });
  it('rejects expired sessions', async () => {
    db.userSession.findUnique.mockResolvedValue({ ...session(), expiresAt: new Date(0) });
    expect(await getSessionUser(request())).toBeNull();
  });
});

describe('Account session totals', () => {
  it('reports all active sessions even when the device list is limited', async () => {
    db.userSession.findUnique.mockResolvedValue(session());
    db.user.findUnique.mockResolvedValue(user);
    db.auditLog.findFirst.mockResolvedValue(null);
    db.userSession.findMany.mockResolvedValue(Array.from({ length: 20 }, (_, i) => ({ id: `device-${i}`, token: 'private-hash' })));
    db.userSession.count.mockResolvedValue(21);
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.activeSessions).toBe(21);
    expect(body.sessions).toHaveLength(20);
    expect(JSON.stringify(body.sessions)).not.toContain('private-hash');
    expect(db.userSession.count).toHaveBeenCalledWith({ where: { userId: user.id, expiresAt: { gt: expect.any(Date) } } });
  });
});
