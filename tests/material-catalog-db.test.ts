import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes("_test"))
  throw Error("Dedicated test database required");
describe.skipIf(!url)("Reviewed material publication", () => {
  let db: PrismaClient,
    ownerId: string,
    boardId: string,
    programmeId: string,
    classId: string,
    subjectId: string,
    documentId: string,
    pageId: string,
    root: string;
  const unique = randomUUID();
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    root = await fs.mkdtemp(path.join(os.tmpdir(), "material-catalog-test-"));
    vi.stubEnv("ASSET_ROOT", root);
    db = new PrismaClient({ datasources: { db: { url } } });
    ownerId = (
      await db.user.create({
        data: {
          email: unique + "@example.test",
          name: "Catalog admin",
          role: "ADMIN",
        },
      })
    ).id;
    boardId = (
      await db.board.create({
        data: {
          name: "Catalog test",
          country: "Pakistan",
          shortCode: "CAT-" + unique,
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
    const { uploadEducationalAsset } = await import("@/lib/storage");
    const asset = await uploadEducationalAsset(
      Buffer.from("%PDF-1.4\nCATALOG-TEST\n%%EOF"),
      "test.pdf",
      "application/pdf",
    );
    documentId = (
      await db.knowledgeDocument.create({
        data: {
          ownerId,
          subjectId,
          resourceType: "past_paper",
          sha256: createHash("sha256").update(unique).digest("hex"),
          storageKey: asset.storageKey,
          totalPages: 1,
          status: "NEEDS_REVIEW",
          pipelineVersion: unique,
          catalogMetadata: { title: "Test original" },
        },
      })
    ).id;
    pageId = (
      await db.knowledgeArtifact.create({
        data: {
          documentId,
          pageNumber: 1,
          status: "PENDING_REVIEW",
          content: "Reviewed content",
          contentHash: "a".repeat(64),
          sourceImageKey: asset.storageKey,
          data: { checksComplete: true },
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (db) {
      if (documentId) {
        await db.knowledgeArtifact.deleteMany({ where: { documentId } });
        await db.knowledgeDocument.deleteMany({ where: { id: documentId } });
      }
      if (subjectId) await db.subject.deleteMany({ where: { id: subjectId } });
      if (classId)
        await db.academicClass.deleteMany({ where: { id: classId } });
      if (programmeId)
        await db.programme.deleteMany({ where: { id: programmeId } });
      if (boardId) await db.board.deleteMany({ where: { id: boardId } });
      if (ownerId) await db.user.deleteMany({ where: { id: ownerId } });
      await db.$disconnect();
      (await import("@/lib/prisma")).default.$disconnect();
    }
    const base = path.resolve(os.tmpdir());
    if (
      root &&
      path.resolve(root).startsWith(base + path.sep) &&
      path.basename(root).startsWith("material-catalog-test-")
    )
      await fs.rm(root, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });
  it("stays private until publication was requested and every page is approved", async () => {
    const { publicMaterial } = await import("@/services/materials/catalog");
    await expect(publicMaterial(documentId)).rejects.toMatchObject({
      status: 404,
    });
    await db.knowledgeDocument.update({
      where: { id: documentId },
      data: { publishAfterReview: true },
    });
    await expect(publicMaterial(documentId)).rejects.toMatchObject({
      status: 404,
    });
    await db.knowledgeArtifact.update({
      where: { id: pageId },
      data: {
        status: "APPROVED",
        reviewerId: ownerId,
        reviewedAt: new Date(),
        reviewNote: "Compared against original source page.",
      },
    });
    expect((await publicMaterial(documentId)).id).toBe(documentId);
  });
  it("serves the exact original, supports PDF ranges and rejects foreign page IDs", async () => {
    const { GET } = await import("@/app/api/materials/[id]/original/route");
    const context = { params: Promise.resolve({ id: documentId }) };
    const result = await GET(
      new NextRequest(
        "http://localhost/api/materials/" + documentId + "/original",
        { headers: { range: "bytes=0-4" } },
      ),
      context,
    );
    expect(result.status).toBe(206);
    expect(await result.text()).toBe("%PDF-");
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(
      (
        await GET(
          new NextRequest("http://localhost", {
            headers: { range: "bytes=999999-" },
          }),
          context,
        )
      ).status,
    ).toBe(416);
    const { GET: page } = await import(
      "@/app/api/materials/[id]/pages/[pageId]/route"
    );
    expect(
      (
        await page(new NextRequest("http://localhost"), {
          params: Promise.resolve({ id: documentId, pageId: randomUUID() }),
        })
      ).status,
    ).toBe(404);
  });
  it("withdraws original access immediately when evidence is reopened or page coverage is incomplete", async () => {
    const { publicMaterial } = await import("@/services/materials/catalog");
    await db.knowledgeArtifact.update({
      where: { id: pageId },
      data: { status: "PENDING_REVIEW" },
    });
    await expect(publicMaterial(documentId)).rejects.toMatchObject({
      status: 404,
    });
    await db.knowledgeArtifact.update({
      where: { id: pageId },
      data: { status: "APPROVED" },
    });
    await db.knowledgeDocument.update({
      where: { id: documentId },
      data: { totalPages: 2 },
    });
    await expect(publicMaterial(documentId)).rejects.toMatchObject({
      status: 404,
    });
    await db.knowledgeDocument.update({
      where: { id: documentId },
      data: { totalPages: 1, publishAfterReview: false },
    });
    await expect(publicMaterial(documentId)).rejects.toMatchObject({
      status: 404,
    });
  });
});
