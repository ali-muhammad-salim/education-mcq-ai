import { NextRequest, NextResponse } from "next/server";
import {
  getClassSubjects,
  normalizeBoardId,
  SUPPORTED_BOARDS,
} from "@/lib/boardHierarchy";
import { apiError, ApiError } from "@/lib/api";
export async function GET(req: NextRequest) {
  try {
    const board = normalizeBoardId(
      req.nextUrl.searchParams.get("board") || "akueb",
    );
    if (!SUPPORTED_BOARDS.some((b) => b.id === board))
      throw new ApiError(404, "BOARD_NOT_FOUND", "Board unavailable.");
    const classes = await Promise.all(
      (["IX", "X", "XI", "XII"] as const).map(async (grade) => {
        const data = await getClassSubjects(board, grade);
        return {
          roman: grade,
          subjects: (data?.subjects || []).map((s) => ({
            name: s.name,
            slug: s.slug,
            icon: s.icon,
            available: s.available,
          })),
        };
      }),
    );
    return NextResponse.json(
      { classes },
      { headers: { "Cache-Control": "public, max-age=15" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
