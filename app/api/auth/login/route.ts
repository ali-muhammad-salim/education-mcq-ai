import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken, ensureDemoUsers } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const body = await req.json();
    const { email, password, demoRole } = body;

    // Handle Quick Demo Login for testing
    let user;
    if (demoRole) {
      const demoEmail = demoRole.toLowerCase() === 'teacher' 
        ? 'teacher@akueb.edu.pk' 
        : demoRole.toLowerCase() === 'admin'
        ? 'admin@akueb.edu.pk'
        : 'student@akueb.edu.pk';
      user = await prisma.user.findUnique({ where: { email: demoEmail } });
    } else {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is suspended or pending verification' }, { status: 403 });
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: req.headers.get('user-agent') || 'Unknown'
      }
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });

    // Set secure cookie
    response.cookies.set('mcqs_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
