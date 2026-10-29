import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
if (url && !new URL(url).pathname.includes("_test"))
  throw Error("Dedicated test database required");
describe.skipIf(!url)("First upload catalogue registration", () => {
  let db: PrismaClient;
  let before: { boards: string[]; programmes: string[]; classes: string[] };
  const name = "Synthetic scope " + randomUUID();
  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    db = new PrismaClient({ datasources: { db: { url } } });
    before = {
      boards: (await db.board.findMany({ select: { id: true } })).map(
        (row) => row.id,
      ),
      programmes: (await db.programme.findMany({ select: { id: true } })).map(
        (row) => row.id,
      ),
      classes: (await db.academicClass.findMany({ select: { id: true } })).map(
        (row) => row.id,
      ),
    };
  });
  afterAll(async () => {
    if (!db || !before) return;
    const subject = await db.subject.findFirst({ where: { name } });
    if (subject) {
      const academicClass = await db.academicClass.findUniqueOrThrow({
        where: { id: subject.classId },
        include: { programme: true },
      });
      await db.subject.delete({ where: { id: subject.id } });
      if (!before.classes.includes(academicClass.id))
        await db.academicClass.delete({ where: { id: academicClass.id } });
      if (!before.programmes.includes(academicClass.programmeId))
        await db.programme.delete({ where: { id: academicClass.programmeId } });
      if (!before.boards.includes(academicClass.programme.boardId))
        await db.board.delete({
          where: { id: academicClass.programme.boardId },
        });
    }
    await db.$disconnect();
  });
  it("serializes simultaneous first uploads without inventing a syllabus", async () => {
    const { ensureUploadScope } = await import("@/services/materials/scope");
    const input = { board: "FBISE", classLevel: "Class XII", subject: name };
    const results = await Promise.all([
      ensureUploadScope(input),
      ensureUploadScope(input),
    ]);
    expect(results[0]).toEqual(results[1]);
    const subjects = await db.subject.findMany({
      where: { name },
      include: {
        syllabusVersions: true,
        academicClass: { include: { programme: { include: { board: true } } } },
      },
    });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].syllabusVersions).toHaveLength(0);
    expect(subjects[0].academicClass.level).toBe(12);
    expect(subjects[0].academicClass.programme.board.shortCode).toBe("FBISE");
  });
  it("rejects unsupported boards and classes before registration", async () => {
    const { ensureUploadScope } = await import("@/services/materials/scope");
    await expect(
      ensureUploadScope({ board: "made-up", classLevel: "IX", subject: name }),
    ).rejects.toMatchObject({ code: "INVALID_CATALOG_SCOPE" });
    await expect(
      ensureUploadScope({ board: "FBISE", classLevel: "XIII", subject: name }),
    ).rejects.toMatchObject({ code: "INVALID_CATALOG_SCOPE" });
  });
});
