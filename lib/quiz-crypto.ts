export interface EncryptedQuestionRevealPayload {
  correctOptionId: string;
  correctLetter: string;
  explanation: string;
  optionFeedback?: Record<string, string>;
  unit?: string;
}

const MASTER_CONTEXT = 'aku-eb-exam-reveal-v1-key-schedule-2025';

function fnv32(str: string, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function keystreamByte(questionId: string, ivHex: string, index: number): number {
  const blockIdx = index >>> 2;
  const byteShift = (index & 3) * 8;
  const s1 = fnv32(`${MASTER_CONTEXT}:${questionId}:${ivHex}:${blockIdx}`);
  const s2 = fnv32(`${ivHex}:${blockIdx}:${questionId}`, s1 ^ 0x9e3779b9);
  return (s2 >>> byteShift) & 0xff;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function randomIvHex(): string {
  const arr = new Uint8Array(8);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < 8; i++) arr[i] = (Math.random() * 256) | 0;
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function encryptQuestionReveal(
  questionId: string,
  payload: EncryptedQuestionRevealPayload
): string {
  const ivHex = randomIvHex();
  const jsonStr = JSON.stringify(payload);
  const plainBytes = new TextEncoder().encode(jsonStr);
  const cipherBytes = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i++) {
    cipherBytes[i] = plainBytes[i] ^ keystreamByte(questionId, ivHex, i);
  }
  const cipherB64 = toBase64(cipherBytes);
  const mac = fnv32(`${MASTER_CONTEXT}:mac:${questionId}:${ivHex}:${cipherB64}`).toString(16).padStart(8, '0');
  return `v1.${ivHex}.${mac}.${cipherB64}`;
}

export function decryptQuestionReveal(
  questionId: string,
  encryptedBlob?: string | null
): EncryptedQuestionRevealPayload | null {
  if (!encryptedBlob || !encryptedBlob.startsWith('v1.')) return null;
  const parts = encryptedBlob.split('.');
  if (parts.length !== 4) return null;
  const [, ivHex, macHex, cipherB64] = parts;
  const expectedMac = fnv32(`${MASTER_CONTEXT}:mac:${questionId}:${ivHex}:${cipherB64}`).toString(16).padStart(8, '0');
  if (macHex !== expectedMac) return null;
  try {
    const cipherBytes = fromBase64(cipherB64);
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keystreamByte(questionId, ivHex, i);
    }
    const decoded = new TextDecoder().decode(plainBytes);
    return JSON.parse(decoded) as EncryptedQuestionRevealPayload;
  } catch {
    return null;
  }
}
