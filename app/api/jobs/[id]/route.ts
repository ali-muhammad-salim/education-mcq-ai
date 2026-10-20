import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError, ApiError } from '@/lib/api';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req), { id } = await context.params;
    const job = await prisma.durableJob.findUnique({ where: { id }, select: { id: true, ownerId: true, kind: true, status: true, result: true, error: true, attempts: true, updatedAt: true } });
    if (!job || (job.ownerId !== user.id && user.role !== 'ADMIN')) throw new ApiError(404, 'JOB_NOT_FOUND', 'Job not found.');
    return NextResponse.json({ success: true, job }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
