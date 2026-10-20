import { NextRequest, NextResponse } from 'next/server';
import {
  getBaseUrl,
  getGoogleOAuthUrl,
  isGoogleAuthEnabled,
  getGoogleClientId,
  getGoogleClientSecret
} from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  try {
    const checkOnly = req.nextUrl.searchParams.get('check');
    if (checkOnly === '1') {
      return NextResponse.json({ enabled: isGoogleAuthEnabled() });
    }

    const baseUrl = getBaseUrl(req);

    if (!isGoogleAuthEnabled()) {
      return NextResponse.redirect(
        new URL('/?auth_error=google_not_configured', baseUrl)
      );
    }

    const roleParam = req.nextUrl.searchParams.get('role');
    const role = roleParam === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/';

    const { url, stateToken } = getGoogleOAuthUrl({
      role,
      returnUrl,
      baseUrl
    });

    const response = NextResponse.redirect(url);

    // Save temporary anti-CSRF state token in an httpOnly cookie (valid for 10 minutes)
    response.cookies.set('google_oauth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600 // 10 minutes
    });

    return response;
  } catch (err: any) {
    console.error('Failed to initiate Google OAuth:', err);
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(err.message || 'google_auth_failed')}`, baseUrl)
    );
  }
}
