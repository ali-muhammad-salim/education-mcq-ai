import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ slos: vi.fn(), versions: vi.fn(), passages: vi.fn(), audit: vi.fn(), auditFind: vi.fn(), doubt: vi.fn(), model: vi.fn(), checkpoint: vi.fn(), saveCheckpoint: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { syllabusVersion: { findMany: mocks.versions }, sLO: { findMany: mocks.slos }, aIGeneration: { create: mocks.audit, findUnique: mocks.auditFind }, $transaction: async (fn: (tx: unknown) => unknown) => fn({ aIGeneration: { create: mocks.audit } }), durableJob: { findUnique: mocks.checkpoint, updateMany: mocks.saveCheckpoint } } }));
vi.mock('@/services/knowledge/search', () => ({ searchApprovedKnowledge: mocks.passages }));
vi.mock('@/services/ai/provider', async original => ({ ...await original<typeof import('@/services/ai/provider')>(), modelJson: mocks.model }));
vi.mock('@/lib/aiDoubtStore', async original => ({ ...await original<typeof import('@/lib/aiDoubtStore')>(), addDoubtItem: mocks.doubt }));
import { generateQuestions } from '@/services/ai/generate';
const candidate = { questionType: 'MCQ_SINGLE', stemText: 'Which is the SI unit of force?', sloId: 'slo-1', cognitiveLevel: 'Knowledge', sourceIds: ['source-1'], options: [{ id: 'a', text: 'Newton', isCorrect: true }, { id: 'b', text: 'Watt', isCorrect: false }, { id: 'c', text: 'Second', isCorrect: false }, { id: 'd', text: 'Metre', isCorrect: false }] };
describe('AI content trust', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_VERIFIER_MODEL', 'verifier'); mocks.versions.mockResolvedValue([{ id: 'version-1' }]);
    mocks.slos.mockResolvedValue([{ id: 'slo-1', code: '1.1', description: 'Measure force', subtopic: { topic: { syllabusVersionId: 'version-1' } } }]);
    mocks.passages.mockResolvedValue([{ id: 'source-1', content: 'Force is measured in newtons.', pageNumber: 1, documentId: 'document-1', sourceSha256: 'source-hash', contentHash: 'content-hash' }]);
    mocks.doubt.mockImplementation(async (_owner, data, id) => ({ id: id || 'review-1', data, status: 'PENDING_REVIEW' }));
    mocks.audit.mockResolvedValue({}); mocks.auditFind.mockResolvedValue(null); mocks.checkpoint.mockResolvedValue(null); mocks.saveCheckpoint.mockResolvedValue({ count: 1 });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it('never fabricates fallback content without curriculum evidence', async () => {
    mocks.slos.mockResolvedValue([]);
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow('syllabus'); expect(mocks.model).not.toHaveBeenCalled();
  });
  it('does not mix learning outcomes from different syllabus versions', async () => {
    mocks.versions.mockResolvedValue([{ id: 'one' }, { id: 'two' }]);
    await expect(generateQuestions('owner', { count: 1 })).rejects.toMatchObject({ code: 'AMBIGUOUS_CURRICULUM' }); expect(mocks.model).not.toHaveBeenCalled();
  });
  it('replays a completed generation audit without spending quota or writing duplicates', async () => {
    mocks.auditFind.mockResolvedValue({ normalizedOutput: [{ ...candidate, reviewId: 'existing-review', verificationStatus: 'PENDING_REVIEW', confidenceScore: null, hasDoubt: false, doubtReason: 'Educator approval required.' }] });
    const result = await generateQuestions('owner', {}, 'completed-job'); expect(result.questions[0].reviewId).toBe('existing-review'); expect(mocks.model).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled(); expect(mocks.slos).not.toHaveBeenCalled();
  });
  it('requires relevant approved sources before spending model quota', async () => {
    mocks.passages.mockResolvedValue([]);
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow('approved'); expect(mocks.model).not.toHaveBeenCalled();
  });
  it('records unavailable independent verification and retains source provenance', async () => {
    mocks.model.mockResolvedValueOnce({ value: [candidate], model: 'generator' }).mockRejectedValueOnce(Error('offline'));
    const result = await generateQuestions('owner', { count: 1 }, 'job-1');
    expect(result.questions[0]).toMatchObject({ verificationStatus: 'PENDING_REVIEW', confidenceScore: null, hasDoubt: true, reviewId: 'job-1:0' });
    expect(mocks.doubt.mock.calls[0][1].evidence[0]).toMatchObject({ id: 'source-1', pageNumber: 1, contentHash: 'content-hash' });
  });
  it('rejects invented citations', async () => {
    mocks.model.mockResolvedValueOnce({ value: [{ ...candidate, sourceIds: ['invented'] }], model: 'generator' });
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow('unavailable evidence'); expect(mocks.doubt).not.toHaveBeenCalled();
  });
  it('rejects an invalid answer key', async () => {
    mocks.model.mockResolvedValueOnce({ value: [{ ...candidate, options: candidate.options.map(o => ({ ...o, isCorrect: false })) }], model: 'generator' });
    await expect(generateQuestions('owner', { count: 1 })).rejects.toThrow(); expect(mocks.doubt).not.toHaveBeenCalled();
  });
  it('compares the entire multi-select set, not its first correct option', async () => {
    mocks.model.mockResolvedValueOnce({ value: [{ ...candidate, questionType: 'MCQ_MULTIPLE', options: candidate.options.map((o, i) => ({ ...o, isCorrect: i < 2 })) }], model: 'generator' }).mockResolvedValueOnce({ value: [{ index: 0, answer: 'a', answerIds: ['a'], grounded: true, aligned: true, reasoning: 'Only one selected' }], model: 'verifier' });
    const result = await generateQuestions('owner', { count: 1, questionTypes: ['MCQ_MULTIPLE'] });
    expect(result.questions[0].hasDoubt).toBe(true);
  });
  it('accepts reordered complete sets but still requires educator approval', async () => {
    mocks.model.mockResolvedValueOnce({ value: [{ ...candidate, questionType: 'MCQ_MULTIPLE', options: candidate.options.map((o, i) => ({ ...o, isCorrect: i < 2 })) }], model: 'generator' }).mockResolvedValueOnce({ value: [{ index: 0, answer: '', answerIds: ['b', 'a'], grounded: true, aligned: true, reasoning: 'Both are required' }], model: 'verifier' });
    const result = await generateQuestions('owner', { count: 1, questionTypes: ['MCQ_MULTIPLE'] });
    expect(result.questions[0]).toMatchObject({ hasDoubt: false, verificationStatus: 'PENDING_REVIEW' });
  });
  it('compares numerical answers using the question tolerance', async () => {
    mocks.model.mockResolvedValueOnce({ value: [{ ...candidate, questionType: 'NUMERICAL', options: [], correctAnswerText: '10', numericalTolerance: 0.05 }], model: 'generator' }).mockResolvedValueOnce({ value: [{ index: 0, answer: '10.01', answerIds: [], grounded: true, aligned: true, reasoning: 'Rounded result' }], model: 'verifier' });
    const result = await generateQuestions('owner', { count: 1, questionTypes: ['NUMERICAL'] }); expect(result.questions[0].hasDoubt).toBe(false);
  });
  it('does not label same-model self-checking as independent verification', async () => {
    vi.stubEnv('GEMINI_VERIFIER_MODEL', 'generator'); mocks.model.mockResolvedValueOnce({ value: [candidate], model: 'generator' });
    const result = await generateQuestions('owner', { count: 1 }); expect(result.questions[0].hasDoubt).toBe(true); expect(mocks.model).toHaveBeenCalledTimes(1);
  });
  it('rejects a verifier alias that resolves to the actual generator model', async () => {
    mocks.model.mockResolvedValueOnce({ value: [candidate], model: 'generator' }).mockResolvedValueOnce({ value: [{ index: 0, answer: 'a', answerIds: [], grounded: true, aligned: true, reasoning: 'Self-check' }], model: 'generator' });
    const result = await generateQuestions('owner', { count: 1 }); expect(result.questions[0].hasDoubt).toBe(true);
  });

});
