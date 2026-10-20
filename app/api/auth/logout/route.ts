import { sessionTokenHash } from '@/lib/auth';
import { assertOrigin } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    assertOrigin(req);
    const token = req.cookies.get('mcqs_session')?.value;
    if (token) {
      await prisma.userSession.deleteMany({ where: { token: sessionTokenHash(token) } });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('mcqs_session');
    return response;
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
