import { randomBytes, scrypt, pbkdf2, timingSafeEqual } from 'node:crypto';
const deriveScrypt = (password: string, salt: string, length: number): Promise<Buffer> => new Promise((resolve, reject) => scrypt(password, salt, length, (error, key) => error ? reject(error) : resolve(key)));
const deriveLegacy = (password: string, salt: string, iterations: number, length: number, digest: string): Promise<Buffer> => new Promise((resolve, reject) => pbkdf2(password, salt, iterations, length, digest, (error, key) => error ? reject(error) : resolve(key)));
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveScrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(key).toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split(':');
    const modern = parts[0] === 'scrypt';
    if (parts.length !== (modern ? 3 : 2)) return false;
    const salt = parts[modern ? 1 : 0], encoded = parts[modern ? 2 : 1];
    if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(encoded)) return false;
    const key = modern ? await deriveScrypt(password, salt, 64) : await deriveLegacy(password, salt, 1000, 64, 'sha512');
    return timingSafeEqual(Buffer.from(key), Buffer.from(encoded, 'hex'));
  } catch { return false; }
}
