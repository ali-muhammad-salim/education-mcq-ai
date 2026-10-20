import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ApiError } from '@/lib/api';
export interface UploadResult { url: string; storageKey: string; fileSize: number; mimeType: string }
const root = () => path.resolve(process.env.ASSET_ROOT || path.join(process.cwd(), 'data', 'assets'));
function client() {
  const account = process.env.R2_ACCOUNT_ID, accessKeyId = process.env.R2_ACCESS_KEY_ID, secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if ((account || accessKeyId || secretAccessKey) && !(account && accessKeyId && secretAccessKey)) throw new ApiError(503, 'STORAGE_NOT_CONFIGURED', 'Complete the object storage credentials before uploading.');
  if (account && accessKeyId && secretAccessKey) return new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
  if (process.env.NODE_ENV === 'production' && !process.env.ASSET_ROOT) throw new ApiError(503, 'STORAGE_NOT_CONFIGURED', 'Configure object storage or a persistent ASSET_ROOT.');
  return null;
}
export function validateAsset(buffer: Buffer, mimeType: string) {
  if (!buffer.length || buffer.length > 50 * 1024 * 1024) throw new ApiError(400, 'INVALID_FILE_SIZE', 'Files must be between 1 byte and 50 MB.');
  const valid = mimeType === 'application/pdf' ? buffer.subarray(0, 5).toString() === '%PDF-' : mimeType === 'image/png' ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : mimeType === 'image/jpeg' ? buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 : mimeType === 'image/webp' ? buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' : false;
  if (!valid) throw new ApiError(400, 'INVALID_FILE_TYPE', 'File contents do not match a supported PDF or image type.');
}
export function validateStorageKey(key: string) {
  if (!/^(private|public)\/resources\/[a-f0-9-]{36}-[A-Za-z0-9._-]{1,160}$/.test(key)) throw new ApiError(400, 'INVALID_ASSET_KEY', 'Invalid asset key.');
  return key;
}
export async function uploadEducationalAsset(buffer: Buffer, filename: string, mimeType: string, isPublic = false): Promise<UploadResult> {
  validateAsset(buffer, mimeType);
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(-150) || 'document.pdf';
  const storageKey = `${isPublic ? 'public' : 'private'}/resources/${randomUUID()}-${safeName}`, s3 = client();
  if (s3) await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'education-mcq-hub', Key: storageKey, Body: buffer, ContentType: mimeType, CacheControl: isPublic ? 'public, max-age=3600' : 'private, no-store' }));
  else { const file = path.join(root(), storageKey); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, buffer, { flag: 'wx' }); }
  return { storageKey, url: '/api/assets/' + storageKey, fileSize: buffer.length, mimeType };
}
export async function readEducationalAsset(key: string) {
  validateStorageKey(key); const s3 = client();
  if (s3) {
    const object = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME || 'education-mcq-hub', Key: key }));
    if (!object.Body) throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found.');
    return { buffer: Buffer.from(await object.Body.transformToByteArray()), mimeType: object.ContentType || 'application/octet-stream' };
  }
  return { buffer: await fs.readFile(path.join(root(), key)), mimeType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream' };
}
