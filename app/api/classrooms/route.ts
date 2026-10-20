import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser, rateLimit } from '@/lib/security';
import { apiError } from '@/lib/api';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
export async function GET(req: NextRequest) {
  try { const user = await requireUser(req, ['TEACHER', 'ADMIN']);
    return NextResponse.json({ success: true, classrooms: await prisma.classroom.findMany({ where: user.role === 'ADMIN' ? {} : { teacherId: user.id }, take: 100, orderBy: { createdAt: 'desc' }, include: { _count: { select: { memberships: { where: { status: 'ENROLLED' } }, quizzes: true } } } }) });
  } catch (error) { return apiError(error); }
}
export async function POST(req: NextRequest) {
  try { const user = await requireUser(req, ['TEACHER', 'ADMIN']); await rateLimit('class-create:' + user.id, 30, 3600);
    const input = z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(4000).optional(), boardId: z.string().max(160).default('AKU-EB'), gradeLevel: z.coerce.number().int().min(1).max(12).default(9), academicYear: z.string().max(40).default(String(new Date().getUTCFullYear())) }).parse(await req.json());
    const classroom = await prisma.classroom.create({ data: { name: input.name, description: input.description, boardId: input.boardId, classLevel: input.gradeLevel, session: input.academicYear, code: randomBytes(4).toString('hex').toUpperCase(), teacherId: user.id } });
    return NextResponse.json({ success: true, classroom });
  } catch (error) { return apiError(error); }
}
