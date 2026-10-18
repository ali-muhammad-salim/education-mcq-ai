import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDemoUsers } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const token = req.cookies.get('mcqs_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const session = await prisma.userSession.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            avatarUrl: true
          }
        }
      }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: session.user
    });
  } catch (err: any) {
    console.error('Auth verification error:', err);
    return NextResponse.json({ user: null });
  }
}
