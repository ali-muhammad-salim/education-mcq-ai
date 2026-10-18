import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { 
  getBaseUrl, 
  exchangeGoogleCodeForTokens, 
  getGoogleUserProfile 
} from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

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
    let stateData: { token: string; role: 'STUDENT' | 'TEACHER'; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        new URL('/?auth_error=invalid_state', baseUrl)
      );
    }

    // Verify anti-CSRF state token
    const storedStateCookie = req.cookies.get('google_oauth_state')?.value;
    if (!storedStateCookie || storedStateCookie !== stateData.token) {
      console.error('CSRF state token mismatch');
      return NextResponse.redirect(
        new URL('/?auth_error=csrf_verification_failed', baseUrl)
      );
    }

    // Exchange authorization code for Google access token
    const tokenData = await exchangeGoogleCodeForTokens(code, redirectUri);
    const googleProfile = await getGoogleUserProfile(tokenData.access_token);

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

    const chosenRole = stateData.role === 'TEACHER' ? 'TEACHER' : 'STUDENT';

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
      // Link Google ID and update avatar/verification if missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googleProfile.id,
          avatarUrl: googleProfile.picture || user.avatarUrl,
          emailVerified: true
        }
      });
    }

    // Create session in userSession table
    const sessionToken = generateToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: sessionToken,
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
        ? '/admin' 
        : '/dashboard/student';
    }

    // Ensure safe relative destination
    if (!destination.startsWith('/') || destination.startsWith('//')) {
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
