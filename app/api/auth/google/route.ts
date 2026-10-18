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
      const cid = getGoogleClientId();
      const csec = getGoogleClientSecret();
      const detectedKeys = Object.keys(process.env).filter(k => 
        k.toUpperCase().includes('GOOGLE') || k.toUpperCase().includes('OAUTH')
      );

      return NextResponse.json({
        enabled: isGoogleAuthEnabled(),
        hasClientId: Boolean(cid),
        hasClientSecret: Boolean(csec),
        clientIdSnippet: cid ? `${cid.slice(0, 10)}...${cid.slice(-12)}` : null,
        detectedRedirectUri: `${getBaseUrl(req)}/api/auth/google/callback`,
        googleEnvKeysFoundInProcess: detectedKeys,
        instructions: isGoogleAuthEnabled() 
          ? 'Google Auth is active and ready!' 
          : 'Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Dokploy Environment variables and click Redeploy.'
      });
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
