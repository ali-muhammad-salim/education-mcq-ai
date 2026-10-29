import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser, rateLimit } from "@/lib/security";
import { ApiError, apiError } from "@/lib/api";
import { assertAIWorkerAvailable } from "@/services/ai/readiness";
import {
  assertStudyEvidence,
  scheduleStudyPack,
  validateStudyCitations,
} from "@/services/study/library";
import {
  studyContentHashInput,
  studyContentSchema,
  studyPackSchema,
} from "@/services/study/contracts";

export async function GET(req: NextRequest) {
  try {
    await requireUser(req, ["ADMIN"]);
    const id = req.nextUrl.searchParams.get("id"),
      documentId = req.nextUrl.searchParams.get("documentId");
    if (id) {
      const note = await prisma.studyNote.findFirstOrThrow({
        where: {
          id: z.string().max(80).parse(id),
          sourceDocumentId: { not: null },
        },
        include: {
          topic: true,
          sources: {
            include: {
              artifact: {
                select: {
                  id: true,
                  pageNumber: true,
                  sourceImageKey: true,
                  contentHash: true,
                  status: true,
                },
              },
            },
          },
        },
      });
      return NextResponse.json(
        { note },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (documentId) {
      const doc = await prisma.knowledgeDocument.findFirstOrThrow({
        where: {
          id: z.string().max(80).parse(documentId),
          resourceType: "textbook",
        },
        select: {
          id: true,
          syllabusVersionId: true,
          autoStudyResources: true,
          totalPages: true,
          artifacts: { select: { status: true } },
        },
      });
      const topics = doc.syllabusVersionId
        ? await prisma.topic.findMany({
            where: { syllabusVersionId: doc.syllabusVersionId },
            select: { id: true, name: true, topicNumber: true },
            orderBy: { id: "asc" },
            take: 501,
          })
        : [];
      return NextResponse.json(
        { document: doc, topics },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const query = z
      .object({
        cursor: z.string().max(80).optional(),
        documentsCursor: z.string().max(80).optional(),
        status: z
          .enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "FAILED"])
          .default("PENDING_REVIEW"),
      })
      .parse(Object.fromEntries(req.nextUrl.searchParams));
    const [notes, documents] = await Promise.all([
      prisma.studyNote.findMany({
        where: { sourceDocumentId: { not: null }, status: query.status },
        select: {
          id: true,
          title: true,
          kind: true,
          status: true,
          revision: true,
          partIndex: true,
          partTotal: true,
          sourceDocumentId: true,
          topic: { select: { name: true } },
        },
        orderBy: { id: "asc" },
        take: 21,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      prisma.knowledgeDocument.findMany({
        where: { resourceType: "textbook", status: "NEEDS_REVIEW" },
        select: {
          id: true,
          storageKey: true,
          totalPages: true,
          subject: {
            select: { name: true, academicClass: { select: { level: true } } },
          },
        },
        orderBy: { id: "asc" },
        take: 21,
        ...(query.documentsCursor
          ? { cursor: { id: query.documentsCursor }, skip: 1 }
          : {}),
      }),
    ]);
    const jobs = await prisma.durableJob.findMany({
      where: { id: { in: notes.slice(0, 20).map((n) => "study:" + n.id) } },
      select: { id: true, status: true, error: true, availableAt: true },
    });
    return NextResponse.json(
      {
        notes: notes.slice(0, 20),
        nextCursor: notes.length > 20 ? notes[19].id : null,
        documents: documents
          .slice(0, 20)
          .map((d) => ({
            ...d,
            storageKey: undefined,
            fileName: d.storageKey.split("/").pop()?.slice(37),
          })),
        documentsCursor: documents.length > 20 ? documents[19].id : null,
        jobs,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req, ["ADMIN"]);
    await rateLimit("study-pack:" + user.id, 10, 3600);
    await assertAIWorkerAvailable("STUDY_GENERATION");
    const input = studyPackSchema.parse(await req.json());
    const result = await prisma.$transaction(
      (tx) => scheduleStudyPack(tx, user.id, input),
      { timeout: 15000 },
    );
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req, ["ADMIN"]);
    const input = z
      .object({
        id: z.string().max(80),
        contentHash: z.string().length(64),
        action: z.enum(["PUBLISH", "REJECT"]),
        note: z.string().trim().min(30).max(4000),
        content: studyContentSchema.optional(),
      })
      .parse(await req.json());
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"study-review:" + input.id}))`;
      const original = await tx.studyNote.findUniqueOrThrow({
        where: { id: input.id },
      });
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${["study-publication", original.sourceDocumentId, original.topicId, original.kind].join(":")}))`;
      if (
        !original.sourceDocumentId ||
        original.contentHash !== input.contentHash ||
        (input.action === "PUBLISH" && original.status !== "PENDING_REVIEW") ||
        (input.action === "REJECT" && original.status === "REJECTED")
      )
        throw new ApiError(
          409,
          "STUDY_REVIEW_CHANGED",
          "Refresh this resource before reviewing it.",
        );
      if (
        input.action === "PUBLISH" &&
        (await tx.studyNote.count({
          where: {
            sourceDocumentId: original.sourceDocumentId,
            topicId: original.topicId,
            kind: original.kind,
            status: "PUBLISHED",
            revision: { gt: original.revision },
          },
        }))
      )
        throw new ApiError(
          409,
          "STUDY_NEWER_REVISION_EXISTS",
          "A newer revision is already published. Review that version or generate a new revision.",
        );
      let content = input.content || studyContentSchema.parse(original.blocks);
      if (input.action === "PUBLISH") {
        const checked = await assertStudyEvidence(tx, input.id);
        const slos = await tx.sLO.findMany({
          where: { subtopic: { topicId: original.topicId } },
          select: { id: true },
        });
        validateStudyCitations(
          content,
          checked.note.sources.map((s) => ({
            id: s.artifactId,
            data: s.artifact.data,
          })),
          slos.map((s) => s.id),
        );
      } else content = studyContentSchema.parse(original.blocks);
      const contentHash = createHash("sha256")
        .update(studyContentHashInput(content))
        .digest("hex");
      const status = input.action === "PUBLISH" ? "PUBLISHED" : "REJECTED";
      await tx.studyNote.update({
        where: { id: original.id },
        data: {
          status,
          title: content.title,
          blocks: content,
          content: content.blocks
            .map((b) => [b.heading, b.text, ...b.steps].join("\n"))
            .join("\n\n"),
          contentHash,
          reviewerId: user.id,
          reviewedAt: new Date(),
          reviewNote: input.note,
        },
      });
      const readyParts = await tx.studyNote.count({
        where: {
          sourceDocumentId: original.sourceDocumentId,
          topicId: original.topicId,
          kind: original.kind,
          revision: original.revision,
          status: "PUBLISHED",
        },
      });
      if (status === "PUBLISHED" && readyParts === original.partTotal) {
        const old = await tx.studyNote.findMany({
          where: {
            revision: { not: original.revision },
            sourceDocumentId: original.sourceDocumentId,
            topicId: original.topicId,
            kind: original.kind,
            status: "PUBLISHED",
          },
          select: { id: true },
        });
        if (old.length) {
          await tx.studyNote.updateMany({
            where: { id: { in: old.map((n) => n.id) } },
            data: {
              status: "REJECTED",
              reviewerId: user.id,
              reviewedAt: new Date(),
              reviewNote: "Replaced by reviewed study revision " + original.id,
            },
          });
          await tx.auditLog.createMany({
            data: old.map((n) => ({
              userId: user.id,
              action: "STUDY_REVISION_REPLACED",
              resource: "StudyNote",
              resourceId: n.id,
              details: { replacementId: original.id },
            })),
          });
        }
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STUDY_" + status,
          resource: "StudyNote",
          resourceId: original.id,
          details: {
            previousHash: input.contentHash,
            contentHash,
            note: input.note,
          },
        },
      });
      return {
        id: original.id,
        status,
        ready: status === "PUBLISHED" && readyParts === original.partTotal,
        remainingParts: Math.max(0, original.partTotal - readyParts),
      };
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
