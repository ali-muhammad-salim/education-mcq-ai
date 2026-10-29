import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { apiError } from '@/lib/api';
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    return NextResponse.json({ user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, avatarUrl: user.avatarUrl } : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
