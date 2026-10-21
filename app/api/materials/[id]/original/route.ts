import { NextRequest, NextResponse } from "next/server";
import { publicMaterial } from "@/services/materials/catalog";
import { educationalAssetInfo,streamEducationalAsset } from "@/lib/storage";
import { apiError } from "@/lib/api";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const document = await publicMaterial((await params).id);
    const asset = await educationalAssetInfo(document.storageKey);
    const headers = {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="original.pdf"',
    };
    const range = req.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const total = asset.size;
      if (!match || (!match[1] && !match[2]))
        return new NextResponse(null, {
          status: 416,
          headers: { ...headers, "Content-Range": "bytes */" + total },
        });
      const start = match[1]
        ? Number(match[1])
        : Math.max(0, total - Number(match[2]));
      const end =
        match[1] && match[2]
          ? Math.min(Number(match[2]), total - 1)
          : total - 1;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= total ||
        end < start
      )
        return new NextResponse(null, {
          status: 416,
          headers: { ...headers, "Content-Range": "bytes */" + total },
        });
      return new NextResponse(
        await streamEducationalAsset(document.storageKey,{start,end}),
        {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Content-Length": String(end - start + 1),
          },
        },
      );
    }
    return new NextResponse(await streamEducationalAsset(document.storageKey), {
      headers: { ...headers, "Content-Length": String(asset.size) },
    });
  } catch (error) {
    return apiError(error);
  }
}
