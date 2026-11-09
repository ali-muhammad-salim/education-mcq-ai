import prisma from "@/lib/prisma";
import { hsscPhysicsSyllabus } from "@/lib/hsscPhysicsSyllabus";
import { resolveAcademicMetadata } from "@/services/assessment/catalog";

async function main() {
  for (const grade of [11, 12]) {
    const syllabus = hsscPhysicsSyllabus("AKU-EB", grade, "Physics")!;
    const count = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curriculum-publication:AKU-EB:Physics'))`;
      const { subjectId } = await resolveAcademicMetadata(tx, "AKU-EB", grade, "Physics");
      const id = `akueb-hssc-physics-2025-${grade}`;
      const validFrom = new Date("2025-01-01T00:00:00Z");
      const newer = await tx.syllabusVersion.findFirst({
        where: { subjectId, isLatest: true, validFrom: { gt: validFrom } },
        select: { id: true },
      });
      if (!newer) {
        await tx.syllabusVersion.updateMany({
          where: { subjectId, id: { not: id }, isLatest: true },
          data: { isLatest: false },
        });
      }
      await tx.syllabusVersion.upsert({
        where: { id },
        update: { isLatest: !newer },
        create: {
          id, subjectId, versionName: "2025 Physics HSSC", validFrom, isLatest: !newer,
          fileUrl: syllabus.original,
          topics: { create: syllabus.units.map(unit => ({
            topicNumber: String(unit.unitNumber),
            name: unit.name,
            subtopics: { create: unit.subtopics.map(topic => ({
              subtopicNum: topic.subtopicNumber,
              name: topic.name,
              slos: { create: topic.slos.map((outcome, i) => ({
                ...outcome, sourceOrdinal: i + 1, isFormative: outcome.cognitiveLevel === "FA",
              })) },
            })) },
          })) },
        },
      });
      const stored = await tx.topic.findMany({
        where: { syllabusVersionId: id },
        include: { subtopics: { include: { slos: true } } },
      });
      for (const unit of syllabus.units) {
        const chapter = stored.find(topic => topic.topicNumber === String(unit.unitNumber));
        if (!chapter) throw new Error(`Missing chapter ${unit.unitNumber} in ${id}`);
        for (const source of unit.subtopics) {
          const subtopic = chapter.subtopics.find(topic => topic.subtopicNum === source.subtopicNumber);
          if (!subtopic) throw new Error(`Missing subtopic ${source.subtopicNumber} in ${id}`);
          if (subtopic.name !== source.name) {
            await tx.subtopic.update({ where: { id: subtopic.id }, data: { name: source.name } });
          }
          for (const outcome of source.slos) {
            const row = subtopic.slos.find(slo => slo.code === outcome.code);
            if (!row) throw new Error(`Missing SLO ${outcome.code} in ${id}`);
            if (row.description !== outcome.description || row.cognitiveLevel !== outcome.cognitiveLevel || row.sourcePage !== outcome.sourcePage) {
              await tx.sLO.update({ where: { id: row.id }, data: { ...outcome, isFormative: outcome.cognitiveLevel === "FA" } });
            }
          }
        }
      }
      return tx.sLO.count({ where: { subtopic: { topic: { syllabusVersionId: id } } } });
    }, { timeout: 30000 });
    console.log(`Class ${grade}: ${count} Physics outcomes in the database.`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
