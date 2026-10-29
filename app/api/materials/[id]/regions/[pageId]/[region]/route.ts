import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { publicMaterial } from '@/services/materials/catalog';
import { apiError, ApiError } from '@/lib/api';
import { educationalAssetInfo, streamEducationalAsset } from '@/lib/storage';
import { approvedEnhancement } from '@/services/ingestion/enhancement-review';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; pageId: string; region: string }> }) {
  try {
    const { id, pageId, region } = await params; await publicMaterial(id);
    const page = await prisma.knowledgeArtifact.findFirst({ where: { id: pageId, documentId: id, status: 'APPROVED' }, select: { data: true, contentHash: true } });
    const result = z.object({ crops: z.array(z.object({ region: z.number().int().nonnegative(), storageKey: z.string() })) }).safeParse(page?.data);
    const index = z.coerce.number().int().nonnegative().parse(region);
    const variant = req.nextUrl.searchParams.get('variant');
    const enhanced = z.object({ enhancements: z.array(approvedEnhancement) }).safeParse(page?.data);
    const approved = enhanced.success ? enhanced.data.enhancements.find(c => c.region === index && c.sourceHash === page?.contentHash) : undefined;
    const original = result.success ? result.data.crops.find(c => c.region === index) : undefined;
    const crop = variant === 'original' ? original : variant === 'enhanced' ? approved : approved || original;
    if (!crop) throw new ApiError(404, 'CROP_UNAVAILABLE', 'This source crop is unavailable.');
    const asset = await educationalAssetInfo(crop.storageKey);
    return new NextResponse(await streamEducationalAsset(crop.storageKey), { headers: { 'Content-Type': asset.mimeType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch (error) { return apiError(error); }
}
