import prisma from "@/lib/prisma";
import { sscBiologySyllabus } from "@/lib/sscBiologySyllabus";
import { resolveAcademicMetadata } from "@/services/assessment/catalog";

async function main() {
  const summaries = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curriculum-publication:AKU-EB:Biology'))`;
    const summaries = [];
    for (const grade of [9, 10]) {
      const syllabus = sscBiologySyllabus("AKU-EB", grade, "Biology")!;
      const { subjectId } = await resolveAcademicMetadata(tx, "AKU-EB", grade, "Biology");
      const id = `akueb-ssc-biology-2025-${grade}`;
      const validFrom = new Date("2025-01-01T00:00:00Z");
      const preferred = await tx.syllabusVersion.findFirst({
        where: { subjectId, id: { not: id }, isLatest: true, OR: [
          { validFrom: { gt: validFrom } },
          { validFrom, sourceDocumentId: { not: null } },
        ] },
        select: { id: true },
      });
      if (!preferred) {
        await tx.syllabusVersion.updateMany({
          where: { subjectId, id: { not: id }, isLatest: true },
          data: { isLatest: false },
        });
      }
      await tx.syllabusVersion.upsert({
        where: { id },
        update: { isLatest: !preferred },
        create: {
          id, subjectId, versionName: "2025 Biology SSC", validFrom, isLatest: !preferred,
          fileUrl: syllabus.original,
          topics: { create: syllabus.units.map(unit => ({
            topicNumber: String(unit.unitNumber),
            name: unit.name,
            subtopics: { create: unit.subtopics.map(topic => ({
              subtopicNum: topic.subtopicNumber,
              name: topic.name,
              slos: { create: topic.slos.map((outcome, index) => ({
                ...outcome, sourceOrdinal: index + 1, isFormative: outcome.cognitiveLevel === "FA",
              })) },
            })) },
          })) },
        },
      });
      const count = await tx.sLO.count({ where: { subtopic: { topic: { syllabusVersionId: id } } } });
      const expected = syllabus.units.flatMap(unit => unit.subtopics.flatMap(topic => topic.slos)).length;
      if (count !== expected) throw new Error(`Class ${grade}: expected ${expected} Biology SLOs, found ${count}`);
      summaries.push(`Class ${grade}: ${count} Biology SLOs stored${preferred ? " (existing latest edition retained)" : ""}.`);
    }
    return summaries;
  }, { timeout: 30000 });
  for (const entry of summaries) console.log(entry);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
