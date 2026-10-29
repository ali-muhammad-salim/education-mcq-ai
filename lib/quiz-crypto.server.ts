import { createCipheriv, createHash, randomBytes } from 'node:crypto';

const processSecret = randomBytes(32);

export function encryptQuestionReveal(questionId: string, reveal: unknown): string {
  const configured = process.env.QUIZ_REVEAL_SECRET || process.env.SESSION_SECRET;
  const key = configured ? createHash('sha256').update(configured).digest() : processSecret;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(questionId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(reveal), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}
