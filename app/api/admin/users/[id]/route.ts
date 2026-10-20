import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
import { serializable } from '@/repositories/transaction';
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireUser(req, ['ADMIN']), { id } = await context.params;
    const input = z.object({ role: z.enum(['STUDENT', 'TEACHER']).optional(), status: z.enum(['ACTIVE', 'SUSPENDED']).optional(), rejectTeacherRequest: z.boolean().optional() }).strict().parse(await req.json());
    if (id === admin.id) throw new ApiError(400, 'SELF_CHANGE', 'Use a separate administrator for account changes.');
    await serializable(async tx => {
      const user = await tx.user.findUnique({ where: { id } });
      if (!user || user.role === 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'This endpoint manages student and teacher accounts only.');
      await tx.user.update({ where: { id }, data: { role: input.role, status: input.status } });
      if (input.rejectTeacherRequest) await tx.auditLog.create({ data: { userId: id, action: 'TEACHER_ACCESS_REJECTED', resource: 'User', resourceId: id, details: { reviewerId: admin.id } } });
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({ data: { userId: admin.id, action: 'ACCOUNT_UPDATED', resource: 'User', resourceId: id, details: input } });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
