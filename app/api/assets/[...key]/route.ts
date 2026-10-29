import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { readEducationalAsset, validateStorageKey } from '@/lib/storage';
export async function GET(req: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await context.params, value = validateStorageKey(key.join('/'));
    if (value.startsWith('private/')) await requireUser(req, ['ADMIN']);
    const asset = await readEducationalAsset(value);
    return new NextResponse(new Uint8Array(asset.buffer), { headers: { 'Content-Type': asset.mimeType, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': value.startsWith('private/') ? 'private, no-store' : 'public, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) { return apiError(error); }
}
