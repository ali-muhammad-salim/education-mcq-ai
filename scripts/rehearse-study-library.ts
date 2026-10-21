/** Live-provider evaluation on a synthetic, explicitly disposable test curriculum. */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes("_test"))
    throw Error("Dedicated TEST_DATABASE_URL required.");
  process.env.DATABASE_URL = url;
  process.env.ASSET_ROOT = path.resolve("data/assets");
  process.env.GEMINI_MODEL = "gemini-3.5-flash-lite";
  process.env.GEMINI_VERIFIER_MODEL = "gemini-3.5-flash";
  process.env.GEMINI_DISTINCT_PROJECTS = "1";
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const owner = await db.user.findUniqueOrThrow({
      where: { email: "ui-review-admin@example.test" },
    });
    const board = await db.board.upsert({
      where: { shortCode: "AI-STUDY-TEST" },
      create: {
        name: "Synthetic study evaluation",
        shortCode: "AI-STUDY-TEST",
        country: "Test",
      },
      update: {},
    });
    const programme = await db.programme.upsert({
      where: { id: "study-eval-programme" },
      create: { id: "study-eval-programme", boardId: board.id, name: "SSC" },
      update: {},
    });
    const cls = await db.academicClass.upsert({
      where: { id: "study-eval-class" },
      create: {
        id: "study-eval-class",
        programmeId: programme.id,
        name: "Class IX",
        level: 9,
      },
      update: {},
    });
    const subject = await db.subject.upsert({
      where: { id: "study-eval-subject" },
      create: { id: "study-eval-subject", classId: cls.id, name: "Physics" },
      update: {},
    });
    const version = await db.syllabusVersion.upsert({
      where: { id: "study-eval-version" },
      create: {
        id: "study-eval-version",
        subjectId: subject.id,
        versionName: "Synthetic only",
        validFrom: new Date(),
        isLatest: true,
      },
      update: {},
    });
    const topic = await db.topic.upsert({
      where: { id: "study-eval-topic" },
      create: {
        id: "study-eval-topic",
        syllabusVersionId: version.id,
        name: "Newton’s second law",
      },
      update: {},
    });
    const subtopic = await db.subtopic.upsert({
      where: { id: "study-eval-subtopic" },
      create: {
        id: "study-eval-subtopic",
        topicId: topic.id,
        name: "Force, mass and acceleration",
      },
      update: {},
    });
    const slo = await db.sLO.upsert({
      where: { id: "study-eval-slo" },
      create: {
        id: "study-eval-slo",
        subtopicId: subtopic.id,
        code: "TEST.FMA",
        description:
          "Use F = ma with mass in kilograms, acceleration in metres per second squared and force in newtons.",
      },
      update: {},
    });
    const folder = path.resolve("data/jobs/study-evaluation");
    await fs.mkdir(folder, { recursive: true });
    const pdf = path.join(folder, "source.pdf"),
      png = path.join(folder, "page.png");
    const text =
      "SYNTHETIC EVALUATION ONLY. Newton’s second law: for constant mass, resultant force F = ma. F is in newtons, mass m is in kilograms, acceleration a is in m/s². Worked example: m = 2 kg, a = 3 m/s². F = ma = 2 × 3 = 6 N. The force is in the acceleration direction. Use resultant force, not just one force where several act.";
    execFileSync(
      process.env.PYTHON_EXECUTABLE || "python",
      [
        "-c",
        "import pymupdf as f,sys; d=f.open(); p=d.new_page(); p.insert_textbox(f.Rect(40,40,550,700),sys.argv[3],fontsize=14); d.save(sys.argv[1]); p.get_pixmap().save(sys.argv[2])",
        pdf,
        png,
        text.replaceAll("’", "'").replaceAll("²", "^2").replaceAll("×", "x"),
      ],
      { windowsHide: true },
    );
    const storage = await import("../lib/storage"),
      bytes = await fs.readFile(pdf),
      sha = createHash("sha256").update(bytes).digest("hex");
    let document = await db.knowledgeDocument.findFirst({
      where: { subjectId: subject.id, pipelineVersion: "study-fixture-v1" },
    });
    if (!document) {
      const source = await storage.uploadEducationalAsset(
          bytes,
          "synthetic-fma-source.pdf",
          "application/pdf",
        ),
        image = await storage.uploadEducationalAsset(
          await fs.readFile(png),
          "synthetic-fma-page.png",
          "image/png",
        );
      document = await db.knowledgeDocument.create({
        data: {
          ownerId: owner.id,
          subjectId: subject.id,
          syllabusVersionId: version.id,
          sha256: sha,
          storageKey: source.storageKey,
          resourceType: "textbook",
          status: "NEEDS_REVIEW",
          totalPages: 1,
          pipelineVersion: "study-fixture-v1",
        },
      });
      const extraction = {
        text,
        continuation: "",
        regions: [
          {
            kind: "TEXT",
            box: [40, 40, 900, 950],
            text,
            labels: [],
            relationships: [],
            sloIds: [slo.id],
            uncertainty: "",
            questionNumber: "",
          },
        ],
      };
      await db.knowledgeArtifact.create({
        data: {
          documentId: document.id,
          pageNumber: 1,
          content: text,
          contentHash: createHash("sha256")
            .update(JSON.stringify(extraction))
            .digest("hex"),
          sourceImageKey: image.storageKey,
          status: "APPROVED",
          reviewerId: owner.id,
          reviewedAt: new Date(),
          reviewNote:
            "Synthetic fixture only: F = ma, 2 kg × 3 m/s² = 6 N; not public academic content.",
          data: {
            extraction,
            crops: [],
            checksComplete: true,
            conflicts: [],
            testOnly: true,
          },
        },
      });
    }
    const { scheduleStudyPack, generateStudyResource } = await import(
      "../services/study/library"
    );
    const { AIBackpressure } = await import("../services/ai/provider");
    await db.$transaction(
      (tx) => scheduleStudyPack(tx, owner.id, { documentId: document!.id }),
      { timeout: 15000 },
    );
    const notes = await db.studyNote.findMany({
      where: { sourceDocumentId: document.id },
      orderBy: { kind: "asc" },
    });
    let deferred: unknown = null;
    for (const note of notes) {
      if (note.status !== "DRAFT") continue;
      const id = "study:" + note.id;
      await db.durableJob.update({
        where: { id },
        data: { status: "RUNNING" },
      });
      try {
        const result = await generateStudyResource(
          owner.id,
          note.id,
          id,
          new AbortController().signal,
        );
        await db.durableJob.update({
          where: { id },
          data: { status: "COMPLETED", result },
        });
        console.log(note.kind + ": PENDING_REVIEW");
      } catch (error) {
        if (error instanceof AIBackpressure) {
          deferred = { retryAt: error.retryAt.toISOString() };
          await db.durableJob.update({
            where: { id },
            data: { status: "QUEUED", availableAt: error.retryAt },
          });
          break;
        }
        throw error;
      }
    }
    const saved = await db.studyNote.findMany({
      where: { sourceDocumentId: document.id },
      select: {
        id: true,
        kind: true,
        status: true,
        generation: true,
        contentHash: true,
        _count: { select: { sources: true } },
      },
    });
    const report = {
      date: new Date().toISOString(),
      testOnly: true,
      fixture: "Synthetic F = ma; 2 kg × 3 m/s² = 6 N.",
      documentId: document.id,
      deferred,
      resources: saved,
      publicResources: saved.filter((n) => n.status === "PUBLISHED").length,
    };
    await fs.writeFile(
      "docs/verification/STUDY-LIBRARY-REHEARSAL-2026-10-21.json",
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify({
        testOnly: true,
        resources: saved.length,
        reviewable: saved.filter((n) => n.status === "PENDING_REVIEW").length,
        deferred,
      }),
    );
  } finally {
    await db.$disconnect();
    (await import("../lib/prisma")).default.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    "Study evaluation failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
