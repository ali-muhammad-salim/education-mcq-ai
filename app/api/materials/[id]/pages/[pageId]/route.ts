import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { publicMaterial } from "@/services/materials/catalog";
import { educationalAssetInfo,streamEducationalAsset } from "@/lib/storage";
import { ApiError, apiError } from "@/lib/api";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pageId: string }> },
) {
  try {
    const { id, pageId } = await params;
    await publicMaterial(id);
    const page = await prisma.knowledgeArtifact.findFirst({
      where: { id: pageId, documentId: id },
      select: { sourceImageKey: true },
    });
    if (!page)
      throw new ApiError(404, "PAGE_NOT_FOUND", "Source page unavailable.");
    const asset = await educationalAssetInfo(page.sourceImageKey);
    return new NextResponse(await streamEducationalAsset(page.sourceImageKey), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
