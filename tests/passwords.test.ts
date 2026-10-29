import { describe, expect, it } from 'vitest';
import { pbkdf2Sync } from 'node:crypto';
import { hashPassword, verifyPassword } from '@/lib/passwords';
describe('Password migration', () => {
  it('salts new password hashes and rejects the wrong password', async () => {
    const a = await hashPassword('A strong test password'), b = await hashPassword('A strong test password');
    expect(a).not.toBe(b); expect(a).toMatch(/^scrypt:/);
    expect(await verifyPassword('A strong test password', a)).toBe(true); expect(await verifyPassword('incorrect', a)).toBe(false);
  });
  it('verifies existing PBKDF2 accounts for a password upgrade', async () => {
    const salt = 'a'.repeat(32), legacy = salt + ':' + pbkdf2Sync('legacy-password', salt, 1000, 64, 'sha512').toString('hex');
    expect(await verifyPassword('legacy-password', legacy)).toBe(true); expect(await verifyPassword('wrong', legacy)).toBe(false);
    expect(await verifyPassword('anything', 'malformed')).toBe(false);
  });
});
