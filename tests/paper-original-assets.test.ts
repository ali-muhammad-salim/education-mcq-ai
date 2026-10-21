import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { getFallbackPaper } from '@/lib/paperDataService';

describe('Bundled annual paper originals', () => {
  for (const [code, expectedHash] of [
    ['PHY-IX-2025-P1', '0cbae90b5b2e7964d014c66a2f9b66549bc6acef80c889a7841601e15ba627a4'],
    ['PHY-IX-2025-P2', 'b67e2772dc66efe580c8cdff3ae90238550330748328d2ed9b4798c46b2f9c6f'],
  ]) {
    it(code + ' ships its exact original outside ignored runtime uploads', () => {
      const original = getFallbackPaper(code)?.fileUrl;
      expect(original).toMatch(/^\/materials\/ssc\/physics\/ssc-1\//);
      const bytes = readFileSync(path.join(process.cwd(), 'public', original!));
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
    });
  }
});
