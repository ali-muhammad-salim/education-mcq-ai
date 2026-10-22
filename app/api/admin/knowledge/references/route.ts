import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { parseGrade } from '@/services/ingestion/trusted';
export async function GET(req: NextRequest) {
  try {
const user = await requireUser(req, ['ADMIN']); const scope = z.object({ board: z.string().max(160), classLevel: z.string().max(80), subject: z.string().max(160) }).parse(Object.fromEntries(req.nextUrl.searchParams));
    const papers = await prisma.knowledgeDocument.findMany({ where: { ownerId: user.id, resourceType: { in: ['past_paper', 'model_paper'] }, subject: { name: { equals: scope.subject, mode: 'insensitive' }, academicClass: { level: parseGrade(scope.classLevel), programme: { board: { shortCode: { equals: scope.board, mode: 'insensitive' } } } } } }, select: { id: true, catalogMetadata: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ papers: papers.map(p => ({ id: p.id, title: (p.catalogMetadata as Record<string, unknown> | null)?.title || p.id })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
