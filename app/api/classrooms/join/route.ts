import { NextRequest, NextResponse } from 'next/server';
import { requireUser, rateLimit } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { z } from 'zod';
export async function POST(req: NextRequest) {
  try { const user = await requireUser(req, ['STUDENT']); await rateLimit('class-join:' + user.id, 20, 900);
    const { code } = z.object({ code: z.string().trim().min(6).max(20).transform(v => v.toUpperCase()) }).parse(await req.json());
    const result = await serializable(async tx => {
      const classroom = await tx.classroom.findUnique({ where: { code } });
      if (!classroom || classroom.status !== 'ACTIVE') throw new ApiError(404, 'CLASS_UNAVAILABLE', 'This classroom is unavailable. Ask your teacher for an active code.');
      const where = { classroomId_studentId: { classroomId: classroom.id, studentId: user.id } };
      const existing = await tx.classroomMembership.findUnique({ where });
      if (existing?.status === 'REMOVED') throw new ApiError(403, 'MEMBERSHIP_REMOVED', 'Your enrollment was removed. Ask the teacher to restore access.');
      const membership = await tx.classroomMembership.upsert({ where, create: { classroomId: classroom.id, studentId: user.id, status: 'ENROLLED' }, update: { status: 'ENROLLED' } });
      return { membership, classroom: { id: classroom.id, name: classroom.name }, alreadyMember: existing?.status === 'ENROLLED' };
    });
    return NextResponse.json({ success: true, ...result, message: 'Enrolled in ' + result.classroom.name });
  } catch (error) { return apiError(error); }
}
