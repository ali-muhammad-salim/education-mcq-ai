import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hsscPhysicsPapers, hsscPhysicsResources } from "@/lib/hsscPhysicsResources";
import { hsscXiAnnualPapers, hsscXiAnnualResources } from "@/lib/hsscXiAnnualPhysics";
import { resolveAcademicMetadata } from "@/services/assessment/catalog";
import { paperAnswer, paperChoices } from "@/lib/paperPresentation";

async function sourceHash(url: string) {
  const pdf = await readFile(path.join(process.cwd(), "public", url.slice(1)));
  return createHash("sha256").update(pdf).digest("hex");
}

async function main() {
  const annualYears = process.argv.slice(2).flatMap(arg => {
    const match = /^--annual-(201[7-9]|202[1-5])$/.exec(arg);
    return match ? [Number(match[1])] : [];
  });
  const annualOnly = annualYears.length > 0;
  for (const grade of annualOnly ? [11] : [11, 12]) {
    const resources = hsscPhysicsResources("akueb", grade, "physics")!;
    const papers = (annualOnly ? hsscXiAnnualPapers.filter(paper => annualYears.includes(paper.examYear)) : hsscPhysicsPapers).filter(paper => paper.academicClass.level === grade);
    const bookResources: { kind: string; title: string; url: string; year?: number }[] = annualOnly ? hsscXiAnnualResources
      .filter(item => annualYears.includes(item.year) && (item.original || item.href.endsWith(".pdf")))
      .map(item => ({ kind: item.original ? "e_marking" : "answer_key", title: `Physics Class XI ${item.year} ${item.label}`, url: item.original ?? item.href, year: item.year })) : [
      { kind: "resource_guide", title: "HSSC Physics teaching and learning resource guide", url: resources.guide },
      { kind: "pacing_guide", title: "HSSC Physics 28-week pacing guide", url: resources.pacing },
      { kind: "practical_paper", title: "HSSC Physics Paper III sample practical", url: resources.practical },
    ];
    const hashes = new Map(await Promise.all([...papers.map(p => p.fileUrl!), ...bookResources.map(b => b.url)].map(async url => [url, await sourceHash(url)] as const)));
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'hssc-physics-resources:' + grade}))`;
      const academic = await resolveAcademicMetadata(tx, "AKU-EB", grade, "Physics");
      const versions = await tx.syllabusVersion.findMany({
        where: { id: { in: annualOnly ? ["akueb-hssc-physics-2025-11", "akueb-hssc-physics-2025-12"] : [`akueb-hssc-physics-2025-${grade}`] }, isLatest: true },
        include: { topics: { include: { subtopics: { include: { slos: true } } } } },
      });
      if (!versions.some(version => version.subjectId === academic.subjectId)) throw new Error(`Missing current Physics syllabus for Class ${grade}`);
      const outcomes = new Map(versions.flatMap(version => version.topics.flatMap(topic => topic.subtopics.flatMap(subtopic => subtopic.slos.map(slo => [
        slo.code, { syllabusVersionId: version.id, sloId: slo.id, subtopicId: subtopic.id, topicId: topic.id },
      ] as const)))));
      for (const paper of papers) {
        const source = {
          ...academic, paperCode: paper.paperCode, title: paper.title,
          examType: paper.examType, examSession: paper.examSession, examYear: paper.examYear,
          fileUrl: paper.fileUrl, sourceFile: paper.fileUrl, sourceHash: hashes.get(paper.fileUrl!),
          pageCount: paper.examYear <= 2018 ? (paper.paperCode.endsWith("-P2") ? 16 : 12) : paper.examYear === 2019 ? 12 : annualOnly && paper.examYear < 2023 ? 20 : annualOnly && paper.paperCode.endsWith("-P2") ? 8 : ["PHY-XII-P1", "PHY-XI-2025-P1"].includes(paper.paperCode) ? 16 : 12,
          verificationStatus: "REVIEWED_WITH_SOURCE_NOTES",
        };
        await tx.pastPaper.upsert({ where: { id: paper.id }, create: { id: paper.id, ...source }, update: source });
        for (const q of paper.questions) {
          const linked = (q.slos ?? []).map(({ slo }) => {
            const match = outcomes.get(slo.code ?? null);
            if (!match) throw new Error(`Missing database SLO ${slo.code} for ${paper.paperCode}`);
            return match;
          });
          const row = {
            pastPaperId: paper.id, questionNumber: q.questionNumber, questionType: q.questionType,
            questionText: q.questionText, normalizedQuestionText: q.questionText.replace(/\s+/g, " ").trim(),
            marks: q.marks, difficulty: q.difficulty, diagramBased: q.diagramBased,
            section: q.sourceRegion.assessmentSection ?? null,
            pageNumber: q.sourceRegion.pageNumber, sourceRegion: JSON.parse(JSON.stringify(q.sourceRegion)) as Prisma.InputJsonValue,
            syllabusVersionId: linked[0]?.syllabusVersionId ?? null,
            sloId: linked[0]?.sloId ?? null, subtopicId: linked[0]?.subtopicId ?? null, topicId: linked[0]?.topicId ?? null,
            verified: q.questionType !== "MULTIPLE_CHOICE" || Boolean(paperAnswer(q.sourceRegion, paperChoices(q.sourceRegion.choices))),
          };
          await tx.pastPaperQuestion.upsert({ where: { id: q.id }, create: { id: q.id, ...row }, update: row });
          await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: q.id, topicId: { notIn: linked.map(o => o.topicId) } } });
          await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: q.id, subtopicId: { notIn: linked.map(o => o.subtopicId) } } });
          await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: q.id, sloId: { notIn: linked.map(o => o.sloId) } } });
          await tx.pastPaperQuestionTopic.createMany({ data: linked.map(o => ({ pastPaperQuestionId: q.id, topicId: o.topicId })), skipDuplicates: true });
          await tx.pastPaperQuestionSubtopic.createMany({ data: linked.map(o => ({ pastPaperQuestionId: q.id, subtopicId: o.subtopicId })), skipDuplicates: true });
          await tx.pastPaperQuestionSLO.createMany({ data: linked.map(o => ({ pastPaperQuestionId: q.id, sloId: o.sloId })), skipDuplicates: true });
        }
      }
      for (const book of bookResources) {
        const id = `akueb-hssc-physics-${grade}-${book.year ? book.year + "-" : ""}${book.kind}`;
        const data = {
          title: book.title + " · Class " + resources.roman, publisher: "AKU-EB", subject: "Physics",
          className: "Class " + resources.roman, boardAssociation: "AKU-EB", language: "English",
          sourceFile: book.url, sourceHash: hashes.get(book.url), metadata: { resourceType: book.kind },
          ...(book.year ? { publicationYear: book.year } : {}),
        };
        await tx.book.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
    }, { timeout: 60000 });
    console.log(`Class ${resources.roman}: ${papers.length} theory papers, ${papers.reduce((n, p) => n + p.questions.length, 0)} questions and ${bookResources.length} supporting resources.`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
