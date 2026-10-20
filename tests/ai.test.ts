import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ slos: vi.fn(), passages: vi.fn(), audit: vi.fn(), doubt: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { sLO: { findMany: mocks.slos }, bookContent: { findMany: mocks.passages }, aIGeneration: { create: mocks.audit } } }));
vi.mock('@/lib/aiDoubtStore', async importOriginal => { const original = await importOriginal<typeof import('@/lib/aiDoubtStore')>(); return { ...original, addDoubtItem: mocks.doubt }; });
import { generateQuestions } from '@/services/ai/generate';
describe('AI content trust', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key'); vi.stubEnv('GEMINI_API_KEYS', ''); vi.stubEnv('GEMINI_MODEL', 'test-model'); vi.stubEnv('GEMINI_MODELS', '');
    mocks.slos.mockResolvedValue([{ id: 'slo-1', code: '1.1', description: 'Measure force' }]);
    mocks.passages.mockResolvedValue([{ id: 'source-1', content: 'Force is measured in newtons.', pageNumber: 1, bookId: 'book-1' }]);
    mocks.doubt.mockImplementation(async (_owner, data, id) => ({ id: id || 'review-1', data, status: 'PENDING_REVIEW' }));
    mocks.audit.mockResolvedValue({});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it('does not generate or fabricate fallback content without curriculum evidence', async () => {
    mocks.slos.mockResolvedValue([]); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow('syllabus'); expect(fetch).not.toHaveBeenCalled(); expect(mocks.doubt).not.toHaveBeenCalled();
  });
  it('records missing independent verification honestly and requires human review', async () => {
    const candidate = { questionType: 'MCQ_SINGLE', stemText: 'What measures force?', sloId: 'slo-1', cognitiveLevel: 'Knowledge', options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }, { id: 'c', text: 'Second', isCorrect: false }, { id: 'd', text: 'Metre', isCorrect: false }] };
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify([candidate]) }] } }] }))).mockResolvedValueOnce(new Response('{}', { status: 400 }));
    vi.stubGlobal('fetch', fetch);
    const result = await generateQuestions('owner', { count: 1 }, 'job-1');
    expect(result.questions[0].verificationStatus).toBe('PENDING_REVIEW'); expect(result.questions[0].confidenceScore).toBeNull(); expect(result.questions[0].hasDoubt).toBe(true);
    expect(result.questions[0].doubtReason).toContain('unavailable'); expect(result.questions[0].reviewId).toBe('job-1:0');
  });
  it('rejects a generated answer key with no correct option', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify([{ questionType: 'MCQ_SINGLE', stemText: 'Invalid question', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] }]) }] } }] }))));
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow(); expect(mocks.doubt).not.toHaveBeenCalled();
  });
});
