import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
import { z } from 'zod';
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await ctx.params;
    const classroom = await prisma.classroom.findUnique({ where: { id }, include: { memberships: { include: { student: { select: { id: true, name: true, email: true } } }, orderBy: { enrolledAt: 'desc' } }, quizzes: { include: { quiz: { select: { id: true, title: true } } } } } });
    if (!classroom || (user.role !== 'ADMIN' && classroom.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot manage this classroom.');
    return NextResponse.json({ success: true, classroom });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try { const user = await requireUser(req, ['TEACHER', 'ADMIN']), { id } = await ctx.params;
    const input = z.discriminatedUnion('action', [z.object({ action: z.literal('MEMBERSHIP'), studentId: z.string(), status: z.enum(['ENROLLED', 'REMOVED']) }), z.object({ action: z.literal('STATUS'), status: z.enum(['ACTIVE', 'ARCHIVED']) }), z.object({ action: z.literal('ASSIGN'), quizId: z.string(), deadline: z.string().datetime().nullable().optional() }), z.object({ action: z.literal('UNASSIGN'), quizId: z.string() })]).parse(await req.json());
    await serializable(async tx => { const classroom = await tx.classroom.findUnique({ where: { id } });
      if (!classroom || (user.role !== 'ADMIN' && classroom.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'You cannot manage this classroom.');
      if (input.action === 'MEMBERSHIP') await tx.classroomMembership.update({ where: { classroomId_studentId: { classroomId: id, studentId: input.studentId } }, data: { status: input.status } });
      else if (input.action === 'STATUS') await tx.classroom.update({ where: { id }, data: { status: input.status } });
      else { const quiz = await tx.quiz.findUnique({ where: { id: input.quizId } });
        if (!quiz || (user.role !== 'ADMIN' && quiz.teacherId !== user.id)) throw new ApiError(403, 'FORBIDDEN', 'Only the assessment author can manage assignments.');
        if (input.action === 'UNASSIGN') await tx.quizAssignment.deleteMany({ where: { quizId: quiz.id, classroomId: id } });
        else { if (classroom.status !== 'ACTIVE' || quiz.status !== 'PUBLISHED') throw new ApiError(409, 'NOT_ACTIVE', 'Publish the assessment and activate the classroom before assigning it.');
          const deadline = input.deadline ? new Date(input.deadline) : null;
          if (deadline && deadline <= new Date()) throw new ApiError(400, 'INVALID_DEADLINE', 'Choose a future deadline.');
          await tx.quizAssignment.upsert({ where: { quizId_classroomId: { quizId: quiz.id, classroomId: id } }, create: { quizId: quiz.id, classroomId: id, deadline }, update: { deadline } }); }
      }
      await tx.auditLog.create({ data: { userId: user.id, action: 'CLASSROOM_' + input.action, resource: 'Classroom', resourceId: id, details: input } });
    }); return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
