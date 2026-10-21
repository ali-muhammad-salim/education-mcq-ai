import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/security";
import { ApiError, apiError } from "@/lib/api";
import { readEducationalAsset } from "@/lib/storage";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> },
) {
  try {
    await requireUser(req, ["ADMIN"]);
    const { id, artifactId } = await params;
    const source = await prisma.studyNoteSource.findUniqueOrThrow({
      where: { noteId_artifactId: { noteId: id, artifactId } },
      include: { artifact: true },
    });
    const region = z.coerce
      .number()
      .int()
      .min(0)
      .max(1000)
      .parse(req.nextUrl.searchParams.get("region"));
    const data = z
      .object({
        crops: z.array(
          z.object({ region: z.number(), storageKey: z.string() }),
        ),
      })
      .parse(source.artifact.data);
    const crop = data.crops.find((c) => c.region === region);
    if (!crop)
      throw new ApiError(
        404,
        "FIGURE_NOT_FOUND",
        "Original figure is unavailable.",
      );
    const asset = await readEducationalAsset(crop.storageKey);
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
