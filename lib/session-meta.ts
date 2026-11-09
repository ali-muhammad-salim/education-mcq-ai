import { NextRequest } from 'next/server';

export function sessionMeta(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ipAddress = (forwarded || req.headers.get('x-real-ip') || '').slice(0, 64) || null;
  const userAgent = req.headers.get('user-agent')?.slice(0, 400) || null;
  return { ipAddress, userAgent };
}
