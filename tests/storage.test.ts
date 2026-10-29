import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: class { send = mocks.send; }, PutObjectCommand: class { constructor(public input: unknown) {} }, GetObjectCommand: class { constructor(public input: unknown) {} } }));
import { validateAsset, validateStorageKey, uploadEducationalAsset } from '@/lib/storage';
describe('Asset boundaries', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it('performs a real storage adapter upload before returning a URL', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', 'test'); vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key'); vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret'); mocks.send.mockResolvedValue({});
    const result = await uploadEducationalAsset(Buffer.from('%PDF-1.7\n'), 'exam.pdf', 'application/pdf');
    expect(mocks.send).toHaveBeenCalledOnce(); expect(result.storageKey).toMatch(/^private\/resources\//); expect(result.url).toContain('/api/assets/private/');
    mocks.send.mockRejectedValue(new Error('Object store unavailable'));
    await expect(uploadEducationalAsset(Buffer.from('%PDF-1.7\n'), 'exam.pdf', 'application/pdf')).rejects.toThrow('unavailable');
  });
  it('rejects MIME spoofing and active SVG content', () => {
    expect(() => validateAsset(Buffer.from('<script>'), 'application/pdf')).toThrow();
    expect(() => validateAsset(Buffer.from('<svg onload="alert(1)"/>'), 'image/svg+xml')).toThrow();
    expect(() => validateAsset(Buffer.from('%PDF-1.7\n'), 'application/pdf')).not.toThrow();
  });
  it('rejects storage path traversal', () => {
    expect(() => validateStorageKey('private/resources/../../.env')).toThrow();
    expect(() => validateStorageKey('private/resources/123e4567-e89b-12d3-a456-426614174000-source.pdf')).not.toThrow();
  });
  it('reports partial cloud configuration rather than silently writing local files', async () => {
    vi.stubEnv('R2_ACCOUNT_ID','test'); vi.stubEnv('R2_ACCESS_KEY_ID',''); vi.stubEnv('R2_SECRET_ACCESS_KEY','');
    await expect(uploadEducationalAsset(Buffer.from('%PDF-1.7\n'),'exam.pdf','application/pdf')).rejects.toMatchObject({code:'STORAGE_NOT_CONFIGURED'});
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
