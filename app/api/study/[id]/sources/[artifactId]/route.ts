import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { readEducationalAsset } from "@/lib/storage";
import { assertStudyEvidence } from "@/services/study/library";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> },
) {
  try {
    const { id, artifactId } = await params;
    const { note } = await prisma.$transaction((tx) =>
      assertStudyEvidence(tx, id),
    );
    if (note.status !== "PUBLISHED")
      throw new ApiError(
        404,
        "STUDY_NOT_FOUND",
        "This source is not published.",
      );
    const source = note.sources.find((s) => s.artifactId === artifactId);
    if (!source)
      throw new ApiError(
        404,
        "STUDY_SOURCE_NOT_FOUND",
        "Source is not cited by this resource.",
      );
    const region = req.nextUrl.searchParams.get("region");
    let key = source.artifact.sourceImageKey;
    if (region !== null) {
      const index = z.coerce.number().int().min(0).max(1000).parse(region);
      const data = z
        .object({
          crops: z.array(
            z.object({ region: z.number(), storageKey: z.string() }),
          ),
        })
        .parse(source.artifact.data);
      const crop = data.crops.find((c) => c.region === index);
      if (!crop)
        throw new ApiError(
          404,
          "FIGURE_NOT_FOUND",
          "Original figure is unavailable.",
        );
      key = crop.storageKey;
    }
    const asset = await readEducationalAsset(key);
    return new NextResponse(new Uint8Array(asset.buffer), {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
