import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { publishedStudyWhere } from "@/services/study/navigation";
import { studyKinds } from "@/services/study/contracts";

export async function GET(req: NextRequest) {
  try {
    const input = z
      .object({
        board: z.string().min(1).max(100).default("AKU-EB"),
        classLevel: z.coerce.number().int().min(1).max(12).default(9),
        subject: z.string().min(1).max(160).default("Physics"),
        kind: z.enum(studyKinds).optional(),
        topicId: z.string().max(80).optional(),
        cursor: z.string().max(80).optional(),
      })
      .parse(Object.fromEntries(req.nextUrl.searchParams));
    const rows = await prisma.$queryRaw<
      {
        id: string;
        title: string;
        kind: string;
        topicId: string;
        chapter: string;
        reviewedAt: Date;
        revision: number;
        partIndex: number;
        partTotal: number;
      }[]
    >(Prisma.sql`
      SELECT n.id,n.title,n.kind,n."topicId",t.name AS chapter,n."reviewedAt",n.revision,n."partIndex",n."partTotal" FROM "StudyNote" n
      JOIN "KnowledgeDocument" d ON d.id=n."sourceDocumentId" JOIN "Topic" t ON t.id=n."topicId"
      JOIN "SyllabusVersion" v ON v.id=n."syllabusVersionId" AND v.id=t."syllabusVersionId" AND v.id=d."syllabusVersionId"
      JOIN "Subject" s ON s.id=v."subjectId" JOIN "Class" c ON c.id=s."classId" JOIN "Programme" p ON p.id=c."programmeId" JOIN "Board" b ON b.id=p."boardId"
      WHERE ${publishedStudyWhere}
      AND regexp_replace(lower(b."shortCode"),'[^a-z0-9]','','g')=${input.board.toLowerCase().replace(/[^a-z0-9]/g, "")} AND c.level=${input.classLevel} AND lower(s.name)=lower(${input.subject})
      ${input.kind ? Prisma.sql`AND n.kind=${input.kind}` : Prisma.empty} ${input.topicId ? Prisma.sql`AND n."topicId"=${input.topicId}` : Prisma.empty} ${input.cursor ? Prisma.sql`AND n.id > ${input.cursor}` : Prisma.empty}
      ORDER BY n.id LIMIT 25`);
    return NextResponse.json(
      {
        resources: rows.slice(0, 24),
        nextCursor: rows.length > 24 ? rows[23].id : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
