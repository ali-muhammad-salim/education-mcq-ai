import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { getFallbackPaper } from '@/lib/paperDataService';

describe('Bundled annual paper originals', () => {
  for (const [code, expectedHash] of [
    ['PHY-IX-2025-P1', '0cbae90b5b2e7964d014c66a2f9b66549bc6acef80c889a7841601e15ba627a4'],
    ['PHY-IX-2025-P2', 'b67e2772dc66efe580c8cdff3ae90238550330748328d2ed9b4798c46b2f9c6f'],
    ['PHY-IX-2024-P1', '5b5c4f4fa5898d25847db9252ce84369067be079d09be21ffe80d4572a162edd'],
    ['PHY-IX-2024-P2', '361acf784bb8ae6ac6bb556e586870d20909a4b42dd18e0f2fd1c7f20f728237'],
    ['PHY-X-2025-P1', '9f9c37787cb2585aa9efabc7c6866f63b05b37db58c8f99d131a3e11abe84bfb'],
    ['PHY-X-2025-P2', '65bf63de4723a0e800e525b8b4e59ac5488c7cc71daa3cdfccf831bf4ea06741'],
  ]) {
    it(code + ' ships its exact original outside ignored runtime uploads', () => {
      const original = getFallbackPaper(code)?.fileUrl;
      expect(original).toMatch(/^\/materials\/ssc\/physics\/ssc-(?:1|2)\//);
      const bytes = readFileSync(path.join(process.cwd(), 'public', original!));
      expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
    });
  }
});
