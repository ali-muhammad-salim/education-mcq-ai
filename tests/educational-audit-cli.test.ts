import { afterEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ text: '$x^2$' }));
vi.mock('../lib/paperDataService', () => ({
  getAllStandardPapers: () => [{ paperCode: 'TEST-P1' }],
  getFallbackPaper: () => ({
    paperCode: 'TEST-P1',
    questions: [{ questionNumber: '1', questionText: fixture.text, sourceRegion: {} }],
  }),
}));
vi.mock('node:fs', async importOriginal => ({
  ...await importOriginal<typeof import('node:fs')>(),
  readFileSync: () => '[]',
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const originalExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('educational formatting audit exit status', () => {
  it('fails the command when unsupported formulas are reported', async () => {
    fixture.text = '$\\definitelyUnsupportedCommand{x}$';
    process.exitCode = undefined;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('../scripts/verify-educational-formatting');
    expect(process.exitCode).toBe(1);
  });

  it('succeeds when every formula is supported', async () => {
    fixture.text = '$x^2$';
    process.exitCode = undefined;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await import('../scripts/verify-educational-formatting');
    expect(process.exitCode ?? 0).toBe(0);
  });
});
