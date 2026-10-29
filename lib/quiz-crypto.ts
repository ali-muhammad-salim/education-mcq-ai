/**
 * Isomorphic, synchronous reveal obfuscation for quiz answers.
 *
 * Correct answers are encrypted server-side (services/assessment/scoring.ts) and
 * decrypted in the browser only after a question has been answered. The payload
 * therefore has to be reversible on the client, so this is obfuscation rather
 * than a server-held secret: it keeps answer keys out of plaintext network
 * payloads and binds each blob to its question id.
 */

const REVEAL_SECRET = 'rise-quiz-reveal-v1';

export interface QuestionReveal {
  correctOptionId?: string;
  correctLetter: string;
  explanation: string;
  optionFeedback?: Record<string, string>;
  unit?: string;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function keyByte(seed: string, index: number): number {
  const block = fnv1a(`${seed}:${Math.floor(index / 4)}`);
  return (block >>> ((index % 4) * 8)) & 0xff;
}

function toBinaryString(bytes: Uint8Array): string {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(toBinaryString(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function xor(bytes: Uint8Array, seed: string): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[i] ^ keyByte(seed, i);
  return out;
}

function seedFor(questionId: string): string {
  return `${REVEAL_SECRET}|${questionId}`;
}

export function encryptQuestionReveal(questionId: string, reveal: QuestionReveal): string {
  const seed = seedFor(questionId);
  const json = JSON.stringify(reveal);
  const bytes = new TextEncoder().encode(json);
  const checksum = fnv1a(`${seed}|${json}`).toString(36);
  return `v1.${checksum}.${encodeBase64(xor(bytes, seed))}`;
}

export function decryptQuestionReveal(questionId: string, blob?: string | null): QuestionReveal | null {
  if (!blob) return null;
  const parts = blob.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;

  const [, checksum, encoded] = parts;
  const seed = seedFor(questionId);

  try {
    const json = new TextDecoder().decode(xor(decodeBase64(encoded), seed));
    if (fnv1a(`${seed}|${json}`).toString(36) !== checksum) return null;
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.correctLetter !== 'string') return null;
    return parsed as QuestionReveal;
  } catch {
    return null;
  }
}
