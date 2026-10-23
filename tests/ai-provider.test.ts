import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {createHash} from 'node:crypto';
const state = vi.hoisted(() => ({ find: vi.fn(), upsert: vi.fn(), budgetFind: vi.fn(), budgetUpsert: vi.fn(), execute: vi.fn(), cleanup: vi.fn() }));
vi.mock('@/lib/prisma', () => {
  const tx = { $executeRaw: state.execute, aIProviderState: { findUnique: state.find, upsert: state.upsert }, aIProviderBudget: { findUnique: state.budgetFind, upsert: state.budgetUpsert, deleteMany: state.cleanup } };
  return { default: { ...tx, $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx) } };
});
import { aiRequest, AIBackpressure, modelJson, nextPacificMidnight, providerConfig, independentVerifierModels, modelLimits } from '@/services/ai/provider';
describe('shared AI quota gateway', () => {
  beforeEach(() => { vi.stubEnv('GEMINI_API_KEYS', 'test-key-one,test-key-two,test-key-three,test-key-four'); vi.stubEnv('GEMINI_PROJECT_IDS', 'one,two,three,four'); vi.stubEnv('GEMINI_RPM', '5'); vi.stubEnv('GEMINI_TPM', '32000'); vi.stubEnv('GEMINI_RPD', '100'); state.find.mockResolvedValue(null); state.budgetFind.mockResolvedValue(null); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
  it('retains every configured credential and groups unmapped credentials conservatively', () => {
    expect(providerConfig()).toHaveLength(4); vi.stubEnv('GEMINI_PROJECT_IDS', ''); expect(new Set(providerConfig().map(c => c.project)).size).toBe(1);
  });
  it('disables invalid credentials and can reach the fourth configured key', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(new Response('API_KEY_INVALID', { status: 403 })).mockResolvedValueOnce(new Response('', { status: 401 })).mockResolvedValueOnce(Response.json({ ok: true })); vi.stubGlobal('fetch', fetch);
    expect(await aiRequest('model', 'generateContent', {}, 10)).toEqual({ ok: true });
    expect(fetch.mock.calls[3][1].headers['x-goog-api-key']).toBe('test-key-four'); expect(state.upsert).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.every(([url]) => !String(url).includes('key='))).toBe(true);
  });
  it('defers exhausted project budgets without calling the provider', async () => {
    state.budgetFind.mockResolvedValue({ requests: 5, tokens: 0 }); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(aiRequest('model', 'generateContent', {}, 10)).rejects.toBeInstanceOf(AIBackpressure); expect(fetch).not.toHaveBeenCalled();
  });
  it('does not retry a missing model with every credential', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 404 })); vi.stubGlobal('fetch', fetch);
    await expect(aiRequest('missing-model', 'generateContent', {}, 10)).rejects.toMatchObject({ code: 'AI_MODEL_UNAVAILABLE' }); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('honors provider Retry-After instead of sleeping in the worker', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'only-test-key'); const fetch = vi.fn().mockResolvedValue(new Response('quota', { status: 429, headers: { 'Retry-After': '3600' } })); vi.stubGlobal('fetch', fetch);
    const start = Date.now();
    try { await aiRequest('model', 'generateContent', {}, 10); expect.fail('Expected backpressure'); } catch (error) { expect(error).toBeInstanceOf(AIBackpressure); expect((error as AIBackpressure).retryAt.getTime()).toBeGreaterThanOrEqual(start + 3600000); }
  });
  it('rejects a permanently over-budget request instead of requeueing forever', async () => {
    vi.stubGlobal('fetch', vi.fn()); await expect(aiRequest('model', 'generateContent', {}, 40000)).rejects.toMatchObject({ code: 'AI_CONTEXT_EXCEEDS_BUDGET' });
  });
  it('rejects a truncated response instead of parsing partial educational content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"partial":true}' }] } }] })));
    await expect(modelJson('Extract', {}, undefined, { model: 'test-model' })).rejects.toMatchObject({ code: 'AI_RESPONSE_INCOMPLETE' });
  });
  it('records the resolved provider model version rather than a floating alias', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ modelVersion: 'gemini-resolved-version', candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] })));
    expect((await modelJson('Extract', {}, undefined, { model: 'models/gemini-alias' })).model).toBe('gemini-resolved-version');
  });
  it('preserves valid LaTeX backslashes through structured JSON decoding', async () => {
    const value = { latex: '\\frac{1}{2}' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] })));
    expect((await modelJson('Extract', {}, undefined, { model: 'test-model' })).value).toEqual(value);
  });
  it('uses another configured model after every project exhausts the primary model',async()=>{
    vi.stubEnv('GEMINI_EXTRACTOR_MODELS','primary-model,backup-model');vi.stubEnv('GEMINI_MODELS','unused-legacy-model');
    const scopes=providerConfig().map(c=>createHash('sha256').update(c.project+':primary-model').digest('hex'));
    state.budgetFind.mockImplementation(async({where}:{where:{id:string}})=>scopes.some(scope=>where.id.startsWith(scope))?{requests:5,tokens:0}:null);
    const fetch=vi.fn().mockResolvedValue(Response.json({modelVersion:'backup-resolved',candidates:[{content:{parts:[{text:'{"verified":true}'}]}}]}));vi.stubGlobal('fetch',fetch);
    expect(await modelJson('Read the original',{})).toEqual({value:{verified:true},model:'backup-resolved'});
    expect(fetch).toHaveBeenCalledTimes(1);expect(fetch.mock.calls[0][0]).toContain('/backup-model:generateContent');
  });
  it('retains the earliest retry time when all configured models are exhausted',async()=>{
    vi.stubEnv('GEMINI_API_KEYS','only-key');vi.stubEnv('GEMINI_MODELS','first-model,second-model');
    const fetch=vi.fn().mockResolvedValueOnce(new Response('quota',{status:429,headers:{'Retry-After':'120'}})).mockResolvedValueOnce(new Response('quota',{status:429,headers:{'Retry-After':'30'}}));vi.stubGlobal('fetch',fetch);
    const start=Date.now();
    try{await modelJson('Read',{});expect.fail('Expected deferred work');}catch(error){expect(error).toBeInstanceOf(AIBackpressure);expect((error as AIBackpressure).retryAt.getTime()).toBeGreaterThanOrEqual(start+30000);expect((error as AIBackpressure).retryAt.getTime()).toBeLessThan(start+120000);}
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('falls back for an unavailable model without hiding invalid schemas or truncated responses',async()=>{
    vi.stubEnv('GEMINI_MODELS','missing-model,available-model');
    const fetch=vi.fn().mockResolvedValueOnce(new Response('',{status:404})).mockResolvedValueOnce(Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]}));vi.stubGlobal('fetch',fetch);
    expect((await modelJson('Read',{})).model).toBe('available-model');expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockReset().mockResolvedValue(new Response('',{status:400}));
    await expect(modelJson('Read',{})).rejects.toMatchObject({code:'AI_MODEL_OR_REQUEST_INVALID'});expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockReset().mockResolvedValue(Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]}));
    await expect(modelJson('Read',{})).rejects.toMatchObject({code:'AI_RESPONSE_INCOMPLETE'});expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not globally disable a working key when one model denies project access',async()=>{
    vi.stubEnv('GEMINI_API_KEYS','only-key');vi.stubEnv('GEMINI_MODELS','restricted-model,available-model');
    const fetch=vi.fn().mockResolvedValueOnce(new Response('Model permission denied',{status:403})).mockResolvedValueOnce(Response.json({candidates:[{content:{parts:[{text:'{}'}]}}]}));vi.stubGlobal('fetch',fetch);
    expect((await modelJson('Read',{})).model).toBe('available-model');
    expect(state.upsert.mock.calls.every(([input])=>!input.create.disabled&&!input.update.disabled)).toBe(true);
    expect(fetch.mock.calls.every(([,input])=>input.headers['x-goog-api-key']==='only-key')).toBe(true);
  });
  it('keeps the generator out of the independent verifier pool',()=>{
    vi.stubEnv('GEMINI_VERIFIER_MODEL','legacy-verifier');vi.stubEnv('GEMINI_VERIFIER_MODELS','models/generator,verifier-one,verifier-two,verifier-one');
    expect(independentVerifierModels('generator')).toEqual(['verifier-one','verifier-two']);
  });
  it('uses model-specific limits rather than one quota for different model tiers',async()=>{
    vi.stubEnv('GEMINI_MODEL_LIMITS',JSON.stringify({'flash':{rpm:5,tpm:250000,rpd:20},'lite':{rpm:15,tpm:250000,rpd:500}}));
    expect(modelLimits('models/lite')).toEqual({rpm:15,tpm:250000,rpd:500});
    expect(modelLimits('unconfigured')).toEqual({rpm:5,tpm:32000,rpd:100});
    state.budgetFind.mockImplementation(async({where}:{where:{id:string}})=>where.id.includes(':d:')?{requests:20,tokens:0}:null);
    const fetch=vi.fn().mockResolvedValue(Response.json({ok:true}));vi.stubGlobal('fetch',fetch);
    await expect(aiRequest('flash','generateContent',{},40000)).rejects.toBeInstanceOf(AIBackpressure);expect(fetch).not.toHaveBeenCalled();
    expect(await aiRequest('lite','generateContent',{},40000)).toEqual({ok:true});expect(fetch).toHaveBeenCalledTimes(1);
    vi.stubEnv('GEMINI_MODEL_LIMITS','{"flash":{"rpm":0}}');await expect(aiRequest('flash','generateContent',{},10)).rejects.toMatchObject({code:'INVALID_AI_BUDGET'});
  });
  it.each([['2026-01-01T12:00:00Z', '2026-01-02T08:00:00.000Z'], ['2026-07-01T12:00:00Z', '2026-07-02T07:00:00.000Z'], ['2026-03-08T09:00:00Z', '2026-03-09T07:00:00.000Z']])('resets daily quota at Pacific midnight including DST %s', (now, expected) => { expect(nextPacificMidnight(new Date(now)).toISOString()).toBe(expected); });
});
