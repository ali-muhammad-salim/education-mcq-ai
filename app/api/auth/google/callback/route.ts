import { sessionTokenHash } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import {
  getBaseUrl,
  exchangeGoogleCodeForTokens,
  getGoogleUserProfile,
  verifyOAuthState
} from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const fallbackRedirectUri = `${baseUrl}/api/auth/google/callback`;

  try {
    const error = req.nextUrl.searchParams.get('error');
    if (error) {
      console.warn('Google OAuth returned error:', error);
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    const code = req.nextUrl.searchParams.get('code');
    const stateParam = req.nextUrl.searchParams.get('state');

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL('/?auth_error=missing_code_or_state', baseUrl)
      );
    }

    // Decode and parse state payload
    let stateData: { token: string; sig?: string; redirectUri?: string; role: 'STUDENT' | 'TEACHER'; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        new URL('/?auth_error=invalid_state', baseUrl)
      );
    }

    // Verify anti-CSRF state token via cookie OR HMAC signature
    const storedStateCookie = req.cookies.get('google_oauth_state')?.value;
    const cookieMatches = storedStateCookie && storedStateCookie === stateData.token;
    const signatureValid = stateData.sig ? verifyOAuthState(stateData.token, stateData.sig) : false;

    if (!cookieMatches) {
      console.error('CSRF state verification failed');
      return NextResponse.redirect(
        new URL('/?auth_error=csrf_verification_failed', baseUrl)
      );
    }

    // Use the exact redirectUri that was sent during the authorization request
    const tokenRedirectUri = fallbackRedirectUri;

    // Exchange authorization code for Google access token
    const tokenData = await exchangeGoogleCodeForTokens(code, tokenRedirectUri);
    const googleProfile = await getGoogleUserProfile(tokenData.access_token);
    if (!googleProfile.verified_email) throw new Error('Google email is not verified');

    const email = googleProfile.email.toLowerCase();

    // Check if user already exists by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleProfile.id },
          { email: email }
        ]
      }
    });

    const chosenRole = 'STUDENT';

    if (!user) {
      // Create new user account via Google
      user = await prisma.user.create({
        data: {
          email,
          name: googleProfile.name || email.split('@')[0],
          googleId: googleProfile.id,
          avatarUrl: googleProfile.picture || null,
          role: chosenRole,
          status: 'ACTIVE',
          emailVerified: true
        }
      });
    } else {
      // Link Google ID and update avatar/verification if missing, ensuring admin if official email
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleProfile.id,
          avatarUrl: googleProfile.picture || user.avatarUrl,
          emailVerified: true,
        }
      });
    }

    if (user.status !== 'ACTIVE') throw new Error('Account is not active');
    // Create session in userSession table
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: sessionTokenHash(sessionToken),
        expiresAt,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown'
      }
    });

    // Determine target redirect destination
    let destination = stateData.returnUrl || '/';
    if (destination === '/' || destination === '') {
      destination = user.role === 'TEACHER'
        ? '/dashboard/teacher'
        : user.role === 'ADMIN'
        ? '/admin/users'
        : '/dashboard/student';
    }

    // Ensure safe relative destination
    if (!destination.startsWith('/') || destination.startsWith('//') || new URL(destination, baseUrl).origin !== new URL(baseUrl).origin) {
      destination = '/';
    }

    const response = NextResponse.redirect(new URL(destination, baseUrl));

    // Set mcqs_session cookie
    response.cookies.set('mcqs_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt
    });

    // Clear temporary anti-CSRF state cookie
    response.cookies.delete('google_oauth_state');

    return response;
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(err.message || 'oauth_callback_failed')}`, baseUrl)
    );
  }
}
