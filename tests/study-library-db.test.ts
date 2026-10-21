import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes("_test"))
  throw Error("Dedicated test database required");
describe.skipIf(!url)("Source-backed study library in PostgreSQL", () => {
  const suffix = randomUUID(),
    token = randomUUID(),
    teacherToken = randomUUID(),
    sha = (s: string) => createHash("sha256").update(s).digest("hex");
  let db: PrismaClient,
    ownerId: string,
    teacherId: string,
    boardId: string,
    programmeId: string,
    classId: string,
    subjectId: string,
    versionId: string,
    topicId: string,
    subtopicId: string,
    sloId: string,
    documentId: string,
    sourceId: string,
    noteId: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    vi.stubEnv("APP_URL", "http://localhost");
    vi.stubEnv("GEMINI_API_KEYS", "study-key-" + suffix);
    vi.stubEnv("GEMINI_MODEL", "study-generator-" + suffix);
    vi.stubEnv("GEMINI_VERIFIER_MODEL", "study-verifier-" + suffix);
    vi.stubEnv("GEMINI_RPM", "50");
    vi.stubEnv("GEMINI_TPM", "100000");
    vi.stubEnv("GEMINI_RPD", "100");
    db = new PrismaClient({ datasources: { db: { url } } });
    ownerId = (
      await db.user.create({
        data: {
          name: "Study educator",
          email: "study-admin-" + suffix + "@example.test",
          role: "ADMIN",
        },
      })
    ).id;
    teacherId = (
      await db.user.create({
        data: {
          name: "Teacher fixture",
          email: "study-teacher-" + suffix + "@example.test",
          role: "TEACHER",
        },
      })
    ).id;
    for (const [userId, value] of [
      [ownerId, token],
      [teacherId, teacherToken],
    ])
      await db.userSession.create({
        data: {
          userId,
          token: sha(value),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
    boardId = (
      await db.board.create({
        data: {
          name: "Study test board",
          shortCode: "STUDY-" + suffix,
          country: "Test",
        },
      })
    ).id;
    programmeId = (
      await db.programme.create({ data: { boardId, name: "SSC" } })
    ).id;
    classId = (
      await db.academicClass.create({
        data: { programmeId, name: "Class IX", level: 9 },
      })
    ).id;
    subjectId = (
      await db.subject.create({ data: { classId, name: "Physics" } })
    ).id;
    versionId = (
      await db.syllabusVersion.create({
        data: {
          subjectId,
          versionName: "Test",
          isLatest: true,
          validFrom: new Date(),
        },
      })
    ).id;
    topicId = (
      await db.topic.create({
        data: { syllabusVersionId: versionId, name: "Forces" },
      })
    ).id;
    subtopicId = (
      await db.subtopic.create({ data: { topicId, name: "SI force unit" } })
    ).id;
    sloId = (
      await db.sLO.create({
        data: {
          subtopicId,
          code: "TEST.1",
          description: "State the SI unit of force.",
        },
      })
    ).id;
    documentId = (
      await db.knowledgeDocument.create({
        data: {
          ownerId,
          subjectId,
          syllabusVersionId: versionId,
          sha256: sha(suffix),
          storageKey: "private/resources/" + randomUUID() + "-textbook.pdf",
          resourceType: "textbook",
          totalPages: 1,
          pipelineVersion: "study-test",
          status: "NEEDS_REVIEW",
        },
      })
    ).id;
    sourceId = (
      await db.knowledgeArtifact.create({
        data: {
          documentId,
          pageNumber: 1,
          content: "The SI unit of force is the newton.",
          contentHash: sha("original"),
          sourceImageKey: "private/resources/" + randomUUID() + "-page.png",
          data: {
            extraction: {
              text: "The SI unit of force is the newton.",
              continuation: "",
              regions: [
                {
                  kind: "TEXT",
                  box: [10, 10, 200, 900],
                  text: "The SI unit of force is the newton.",
                  labels: [],
                  relationships: [],
                  sloIds: [sloId],
                  uncertainty: "",
                  questionNumber: "",
                },
              ],
            },
            crops: [],
            checksComplete: true,
            conflicts: [],
            pageSha256: sha("page"),
          },
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (!db) return;
    await db.studyNote.deleteMany({ where: { sourceDocumentId: documentId } });
    await db.knowledgeDocument.delete({ where: { id: documentId } });
    await db.sLO.delete({ where: { id: sloId } });
    await db.subtopic.delete({ where: { id: subtopicId } });
    await db.topic.delete({ where: { id: topicId } });
    await db.syllabusVersion.delete({ where: { id: versionId } });
    await db.subject.delete({ where: { id: subjectId } });
    await db.academicClass.delete({ where: { id: classId } });
    await db.programme.delete({ where: { id: programmeId } });
    await db.board.delete({ where: { id: boardId } });
    await db.durableJob.deleteMany({ where: { ownerId } });
    await db.auditLog.deleteMany({ where: { userId: ownerId } });
    await db.userSession.deleteMany({
      where: { userId: { in: [ownerId, teacherId] } },
    });
    await db.user.deleteMany({ where: { id: { in: [ownerId, teacherId] } } });
    for (const model of [
      "study-generator-" + suffix,
      "study-verifier-" + suffix,
    ]) {
      const prefix = sha("unmapped-shared-project:" + model);
      await db.aIProviderBudget.deleteMany({
        where: { id: { startsWith: prefix } },
      });
      await db.aIProviderState.deleteMany({ where: { id: prefix } });
    }
    await db.$disconnect();
    (await import("@/lib/prisma")).default.$disconnect();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const request = (body: unknown, credential = token) =>
    new NextRequest("http://localhost/api/admin/study", {
      method: "PATCH",
      headers: {
        authorization: "Bearer " + credential,
        origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  it("does not schedule study generation from pending original pages", async () => {
    const { scheduleStudyPack } = await import("@/services/study/library");
    await expect(
      db.$transaction((tx) =>
        scheduleStudyPack(tx, ownerId, {
          documentId,
          kinds: ["CHAPTER_NOTES"],
        }),
      ),
    ).rejects.toMatchObject({ code: "BOOK_REVIEW_REQUIRED" });
    expect(
      await db.studyNote.count({ where: { sourceDocumentId: documentId } }),
    ).toBe(0);
    await db.knowledgeArtifact.update({
      where: { id: sourceId },
      data: { status: "APPROVED", reviewerId: ownerId, reviewedAt: new Date() },
    });
  });
  it("queues exactly one draft under concurrent requests and preserves prior revisions", async () => {
    const { scheduleStudyPack } = await import("@/services/study/library");
    const results = await Promise.all(
      [1, 2].map(() =>
        db.$transaction((tx) =>
          scheduleStudyPack(tx, ownerId, {
            documentId,
            kinds: ["CHAPTER_NOTES"],
          }),
        ),
      ),
    );
    expect(results.reduce((n, r) => n + r.queued, 0)).toBe(1);
    noteId = (
      await db.studyNote.findFirstOrThrow({
        where: { sourceDocumentId: documentId },
      })
    ).id;
    expect(
      await db.durableJob.count({
        where: { ownerId, kind: "STUDY_GENERATION" },
      }),
    ).toBe(1);
    await expect(
      db.studyNote.update({
        where: { id: noteId },
        data: { status: "PUBLISHED" },
      }),
    ).rejects.toThrow();
  });
  it("rejects invented citations before saving a draft", async () => {
    const { generateStudyResource } = await import("@/services/study/library");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        title: "Force revision",
                        scopeNote: "Only the supplied source page is covered.",
                        blocks: [
                          {
                            type: "PARAGRAPH",
                            heading: "Force",
                            text: "The unit is newton.",
                            steps: [],
                            sourceIds: ["invented"],
                            sloIds: [sloId],
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        ),
    );
    await db.durableJob.update({
      where: { id: "study:" + noteId },
      data: { status: "RUNNING" },
    });
    await expect(
      generateStudyResource(
        ownerId,
        noteId,
        "study:" + noteId,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "INVALID_STUDY_CITATION" });
    expect(
      (await db.studyNote.findUniqueOrThrow({ where: { id: noteId } })).status,
    ).toBe("DRAFT");
    expect(await db.studyNoteSource.count({ where: { noteId } })).toBe(0);
  });
  it("retains independently checked content as an unpublished draft and replays without provider spend", async () => {
    const { generateStudyResource } = await import("@/services/study/library");
    const content = {
      title: "Force revision",
      scopeNote:
        "Covers the SI force unit from PDF page 1; other force topics are not covered.",
      blocks: [
        {
          type: "PARAGRAPH",
          heading: "SI force unit",
          text: "The SI unit of force is the newton.",
          steps: [],
          sourceIds: [sourceId],
          sloIds: [sloId],
        },
      ],
    };
    const fetch = vi
      .fn()
      .mockImplementation(async (input: string) =>
        Response.json({
          modelVersion: input.includes("study-verifier")
            ? "independent-verifier"
            : "independent-generator",
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      input.includes("study-verifier")
                        ? { checked: true, conflicts: [] }
                        : content,
                    ),
                  },
                ],
              },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      await generateStudyResource(
        ownerId,
        noteId,
        "study:" + noteId,
        new AbortController().signal,
      ),
    ).toMatchObject({ status: "PENDING_REVIEW" });
    const saved = await db.studyNote.findUniqueOrThrow({
      where: { id: noteId },
    });
    expect(saved.reviewedAt).toBeNull();
    expect(await db.studyNoteSource.count({ where: { noteId } })).toBe(1);
    await generateStudyResource(
      ownerId,
      noteId,
      "study:" + noteId,
      new AbortController().signal,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("requires administrator review and a current content hash before publication", async () => {
    const { PATCH } = await import("@/app/api/admin/study/route");
    const note = await db.studyNote.findUniqueOrThrow({
      where: { id: noteId },
    });
    const review = {
      id: noteId,
      contentHash: note.contentHash,
      action: "PUBLISH",
      note: "Compared every statement and source page; checked the curriculum outcome.",
    };
    expect((await PATCH(request(review, teacherToken))).status).toBe(403);
    expect(
      (await PATCH(request({ ...review, contentHash: "0".repeat(64) }))).status,
    ).toBe(409);
    expect((await PATCH(request(review))).status).toBe(200);
    expect(
      await db.auditLog.count({
        where: { resourceId: noteId, action: "STUDY_PUBLISHED" },
      }),
    ).toBe(1);
  });
  it("serves only published, current, correctly scoped resources and hides withdrawn evidence", async () => {
    const { GET: list } = await import("@/app/api/study/route");
    const { GET: read } = await import("@/app/api/study/[id]/route");
    const base =
      "http://localhost/api/study?board=" +
      encodeURIComponent("STUDY-" + suffix) +
      "&subject=Physics&classLevel=";
    expect(
      (await (await list(new NextRequest(base + "9"))).json()).resources.map(
        (r: { id: string }) => r.id,
      ),
    ).toEqual([noteId]);
    expect(
      (await (await list(new NextRequest(base + "10"))).json()).resources,
    ).toEqual([]);
    expect(
      (
        await read(new NextRequest("http://localhost/api/study/" + noteId), {
          params: Promise.resolve({ id: noteId }),
        })
      ).status,
    ).toBe(200);
    await db.syllabusVersion.update({
      where: { id: versionId },
      data: { isLatest: false },
    });
    expect(
      (await (await list(new NextRequest(base + "9"))).json()).resources,
    ).toEqual([]);
    const { scheduleStudyPack } = await import("@/services/study/library");
    await expect(
      db.$transaction((tx) =>
        scheduleStudyPack(tx, ownerId, { documentId, kinds: ["FLASHCARDS"] }),
      ),
    ).rejects.toMatchObject({ code: "BOOK_CURRENT_CURRICULUM_REQUIRED" });
    await db.syllabusVersion.update({
      where: { id: versionId },
      data: { isLatest: true },
    });
    await db.knowledgeArtifact.update({
      where: { id: sourceId },
      data: { status: "REJECTED" },
    });
    expect(
      (await (await list(new NextRequest(base + "9"))).json()).resources,
    ).toEqual([]);
    expect(
      (
        await read(new NextRequest("http://localhost/api/study/" + noteId), {
          params: Promise.resolve({ id: noteId }),
        })
      ).status,
    ).toBe(409);
    await db.knowledgeArtifact.update({
      where: { id: sourceId },
      data: { status: "APPROVED", contentHash: sha("edited") },
    });
    expect(
      (await (await list(new NextRequest(base + "9"))).json()).resources,
    ).toEqual([]);
  });
  it("activates a multipart revision only after every section is reviewed", async () => {
    const { PATCH } = await import("@/app/api/admin/study/route");
    const { GET: read } = await import("@/app/api/study/[id]/route");
    const ids = [randomUUID(), randomUUID()],
      content = {
        title: "Force study section",
        scopeNote: "Only the force unit on the cited page is covered.",
        blocks: [
          {
            type: "PARAGRAPH",
            heading: "Force",
            text: "The force unit is the newton.",
            steps: [],
            sourceIds: [sourceId],
            sloIds: [sloId],
          },
        ],
      };
    const contentHash = sha(JSON.stringify(content));
    for (const [index, id] of ids.entries()) {
      await db.studyNote.create({
        data: {
          id,
          topicId,
          sourceDocumentId: documentId,
          syllabusVersionId: versionId,
          ownerId,
          kind: "CHAPTER_NOTES",
          title: content.title,
          content: "The force unit is the newton.",
          blocks: content,
          contentHash,
          status: "PENDING_REVIEW",
          revision: 2,
          partIndex: index + 1,
          partTotal: 2,
          sources: {
            create: { artifactId: sourceId, contentHash: sha("edited") },
          },
        },
      });
    }
    const review = (id: string) =>
      PATCH(
        request({
          id,
          contentHash,
          action: "PUBLISH",
          note: "Checked the force unit and all references against the original page.",
        }),
      );
    const first = await review(ids[0]);
    expect(first.status).toBe(200);
    expect((await first.json()).ready).toBe(false);
    expect(
      (
        await read(new NextRequest("http://localhost/api/study/" + ids[0]), {
          params: Promise.resolve({ id: ids[0] }),
        })
      ).status,
    ).toBe(409);
    const second = await review(ids[1]);
    expect(second.status).toBe(200);
    expect((await second.json()).ready).toBe(true);
    const published = await read(
      new NextRequest("http://localhost/api/study/" + ids[0]),
      { params: Promise.resolve({ id: ids[0] }) },
    );
    expect(published.status).toBe(200);
    const body = await published.json();
    expect(body.resource.sections).toHaveLength(2);
    expect(JSON.stringify(body)).not.toContain("private/resources/");
    expect(
      (await db.studyNote.findUniqueOrThrow({ where: { id: noteId } })).status,
    ).toBe("REJECTED");
    await db.studyNote.update({
      where: { id: noteId },
      data: { status: "PENDING_REVIEW" },
    });
    const old = await db.studyNote.findUniqueOrThrow({ where: { id: noteId } });
    const stale = await PATCH(
      request({
        id: noteId,
        contentHash: old.contentHash,
        action: "PUBLISH",
        note: "Attempt to publish an older reviewed revision after a newer edition.",
      }),
    );
    expect((await stale.json()).error.code).toBe("STUDY_NEWER_REVISION_EXISTS");
    await expect(
      db.studyNote.update({
        where: { id: ids[0] },
        data: { syllabusVersionId: randomUUID() },
      }),
    ).rejects.toThrow();
  });
  it("automatically queues remaining study types after the final textbook page approval", async () => {
    await db.knowledgeDocument.update({
      where: { id: documentId },
      data: { autoStudyResources: true },
    });
    await db.knowledgeArtifact.update({
      where: { id: sourceId },
      data: { status: "PENDING_REVIEW" },
    });
    const { PATCH } = await import("@/app/api/admin/knowledge/route");
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/knowledge", {
        method: "PATCH",
        headers: {
          authorization: "Bearer " + token,
          origin: "http://localhost",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sourceId,
          contentHash: sha("edited"),
          status: "APPROVED",
          note: "Original page and its force outcome mapping were checked before approving.",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const kinds = await db.studyNote.findMany({
      where: { sourceDocumentId: documentId },
      select: { kind: true },
    });
    expect(new Set(kinds.map((n) => n.kind)).size).toBe(7);
    expect(
      await db.durableJob.count({
        where: { ownerId, kind: "STUDY_GENERATION" },
      }),
    ).toBe(7);
  });
});
