import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ['ADMIN']);
    const input = z.object({ q: z.string().max(160).default(''), cursor: z.string().optional() }).parse(Object.fromEntries(req.nextUrl.searchParams));
    const users = await prisma.user.findMany({ where: input.q ? { OR: [{ email: { contains: input.q, mode: 'insensitive' } }, { name: { contains: input.q, mode: 'insensitive' } }] } : {},
      take: 51, orderBy: { id: 'asc' }, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), select: { id: true, name: true, email: true, role: true, status: true, emailVerified: true } });
    const requests = await prisma.auditLog.findMany({ where: { userId: { in: users.map(u => u.id) }, action: { in: ['TEACHER_ACCESS_REQUESTED', 'TEACHER_ACCESS_REJECTED'] } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, users: users.slice(0, 50).map(u => { const request = requests.find(r => r.userId === u.id); return { ...u, teacherRequest: u.role === 'STUDENT' && request?.action === 'TEACHER_ACCESS_REQUESTED' ? (request.details as {reason?:string})?.reason || 'Access requested' : undefined }; }), nextCursor: users.length > 50 ? users[49].id : null });
  } catch (error) { return apiError(error); }
}
