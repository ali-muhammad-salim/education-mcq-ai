import { NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import prisma from '@/lib/prisma';
import { createHash } from 'node:crypto';
import { configuredSiteUrl } from '@/lib/site-url';
export function assertOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const expected = new URL(configuredSiteUrl() || req.url).origin;
    if (req.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== expected)) throw new ApiError(403, 'INVALID_ORIGIN', 'Cross-site request rejected.');
  }
}
export async function requireUser(req: NextRequest, roles?: readonly string[]) {
  assertOrigin(req);
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Please sign in to continue.');
  if (roles && !roles.includes(user.role)) throw new ApiError(403, 'FORBIDDEN', 'You do not have permission for this action.');
  return user;
}
export async function rateLimit(key: string, maximum: number, seconds: number, amount=1) {
  if(!Number.isSafeInteger(amount)||amount<1||amount>maximum)throw new ApiError(429,'RATE_LIMITED','This request exceeds the permitted allowance.');
  const now = new Date(), expires = new Date(now.getTime() + seconds * 1000), digest = createHash('sha256').update(key).digest('hex');
  const [entry] = await prisma.$queryRaw<{ count: number }[]>`INSERT INTO "RequestLimit" ("key", "count", "expiresAt") VALUES (${digest}, ${amount}, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestLimit"."expiresAt" <= ${now} THEN ${amount} ELSE LEAST("RequestLimit"."count" + ${amount}, ${maximum + 1}) END,
      "expiresAt" = CASE WHEN "RequestLimit"."expiresAt" <= ${now} THEN ${expires} ELSE "RequestLimit"."expiresAt" END
    RETURNING "count"`;
  if (entry.count > maximum) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
}
