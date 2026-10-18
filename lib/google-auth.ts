import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email?: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

// Secret used to cryptographically sign OAuth state tokens to prevent CSRF
const STATE_SECRET = process.env.SESSION_SECRET || 'rise-learner-oauth-state-secret-2026';

export function signOAuthState(token: string): string {
  return crypto.createHmac('sha256', STATE_SECRET).update(token).digest('hex');
}

export function verifyOAuthState(token: string, signature: string): boolean {
  try {
    const expected = signOAuthState(token);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Robust resolution for Google Client ID (case-insensitive & trimmed)
export function getGoogleClientId(): string | undefined {
  if (process.env.GOOGLE_CLIENT_ID?.trim()) return process.env.GOOGLE_CLIENT_ID.trim();
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()) return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.trim();
  if (process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()) return process.env.GOOGLE_OAUTH_CLIENT_ID.trim();
  if (process.env.GOOGLE_ID?.trim()) return process.env.GOOGLE_ID.trim();

  // Dynamic search across process.env for keys with extra spaces or different casing
  for (const [key, val] of Object.entries(process.env)) {
    const cleanKey = key.trim().toUpperCase();
    if (cleanKey.includes('GOOGLE') && cleanKey.includes('CLIENT') && cleanKey.includes('ID')) {
      if (val && val.trim().length > 0) return val.trim();
    }
  }
  return undefined;
}

// Robust resolution for Google Client Secret (case-insensitive & trimmed)
export function getGoogleClientSecret(): string | undefined {
  if (process.env.GOOGLE_CLIENT_SECRET?.trim()) return process.env.GOOGLE_CLIENT_SECRET.trim();
  if (process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()) return process.env.GOOGLE_OAUTH_CLIENT_SECRET.trim();
  if (process.env.GOOGLE_SECRET?.trim()) return process.env.GOOGLE_SECRET.trim();

  // Dynamic search across process.env for keys with extra spaces or different casing
  for (const [key, val] of Object.entries(process.env)) {
    const cleanKey = key.trim().toUpperCase();
    if (cleanKey.includes('GOOGLE') && (cleanKey.includes('SECRET') || cleanKey.includes('KEY'))) {
      if (val && val.trim().length > 0) return val.trim();
    }
  }
  return undefined;
}

export function isGoogleAuthEnabled(): boolean {
  const cid = getGoogleClientId();
  const csec = getGoogleClientSecret();
  return Boolean(cid && csec && cid.length > 5 && csec.length > 5);
}

export function getBaseUrl(req?: NextRequest): string {
  // If explicitly set in environment, use it
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim().length > 0) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '');
  }

  // If request is provided, inspect host headers
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host) {
      // Any public domain (not localhost) must always use https
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const proto = isLocal ? 'http' : 'https';
      return `${proto}://${host}`;
    }
  }

  // Sensible default fallback for production
  return 'https://riselearner.com';
}

export function getGoogleOAuthUrl(options: {
  role?: 'STUDENT' | 'TEACHER';
  returnUrl?: string;
  baseUrl: string;
}): { url: string; stateToken: string } {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured');
  }

  const stateToken = crypto.randomBytes(24).toString('hex');
  const signature = signOAuthState(stateToken);
  const redirectUri = `${options.baseUrl}/api/auth/google/callback`;

  const statePayload = {
    token: stateToken,
    sig: signature,
    redirectUri,
    role: options.role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
    returnUrl: options.returnUrl || '/'
  };

  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', state);

  return {
    url: authUrl.toString(),
    stateToken
  };
}

export async function exchangeGoogleCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; id_token?: string }> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  return data;
}

export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const data = await res.json();
  if (!res.ok || !data.email) {
    throw new Error('Failed to retrieve user profile from Google');
  }

  return data;
}
