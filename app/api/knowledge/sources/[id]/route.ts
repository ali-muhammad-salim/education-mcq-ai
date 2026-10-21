import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/security';
import { ApiError, apiError } from '@/lib/api';
import { readEducationalAsset } from '@/lib/storage';
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(req, ['TEACHER', 'ADMIN']);
    const { id } = await context.params;
    const source = await prisma.knowledgeArtifact.findFirst({ where: { id, status: 'APPROVED', document: { status: 'NEEDS_REVIEW' } }, include: { document: { select: { sha256: true, resourceType: true } } } });
    if (!source) throw new ApiError(404, 'APPROVED_SOURCE_NOT_FOUND', 'This source is not available or its approval was withdrawn.');
    if (req.nextUrl.searchParams.get('format') === 'image') {
      const image = await readEducationalAsset(source.sourceImageKey);
      return new NextResponse(new Uint8Array(image.buffer), { headers: { 'Content-Type': image.mimeType, 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
    }
    return NextResponse.json({ id: source.id, pageNumber: source.pageNumber, content: source.content, contentHash: source.contentHash, sourceSha256: source.document.sha256, resourceType: source.document.resourceType }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
