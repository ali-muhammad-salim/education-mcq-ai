import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
import { assertStudyEvidence } from "@/services/study/library";
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await prisma.studyNote.findFirst({
      where: { id, status: "PUBLISHED", sourceDocumentId: { not: null } },
      select: { id: true },
    });
    if (!found)
      throw new ApiError(
        404,
        "STUDY_NOT_FOUND",
        "This study resource is not available.",
      );
    const { note, content } = await prisma.$transaction((tx) =>
      assertStudyEvidence(tx, id),
    );
    if (note.status !== "PUBLISHED")
      throw new ApiError(
        404,
        "STUDY_NOT_FOUND",
        "This study resource is not available.",
      );
    const sections = await prisma.studyNote.findMany({
      where: {
        sourceDocumentId: note.sourceDocumentId,
        topicId: note.topicId,
        kind: note.kind,
        revision: note.revision,
        status: "PUBLISHED",
      },
      select: { id: true, partIndex: true, title: true },
      orderBy: { partIndex: "asc" },
    });
    const subject = await prisma.subject.findUniqueOrThrow({
      where: { id: note.topic.syllabusVersion.subjectId },
      include: {
        academicClass: { include: { programme: { include: { board: true } } } },
      },
    });
    const libraryUrl =
      "/study?" +
      new URLSearchParams({
        board: subject.academicClass.programme.board.shortCode,
        classLevel: String(subject.academicClass.level),
        subject: subject.name,
      });
    return NextResponse.json(
      {
        resource: {
          id: note.id,
          kind: note.kind,
          revision: note.revision,
          partIndex: note.partIndex,
          partTotal: note.partTotal,
          sections,
          libraryUrl,
          syllabusUrl: "/syllabus/" + subject.id,
          chapter: note.topic.name,
          reviewedAt: note.reviewedAt,
          content,
          sources: note.sources.map((s) => ({
            id: s.artifactId,
            pageNumber: s.artifact.pageNumber,
          })),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
