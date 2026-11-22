import prisma from '@/lib/prisma';
import { hsscBiologySyllabus } from '@/lib/hsscBiologySyllabus';
import { resolveAcademicMetadata } from '@/services/assessment/catalog';

async function main() {
  const summaries = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curriculum-publication:AKU-EB:Biology'))`;
    const summaries = [];
    for (const grade of [11, 12]) {
      const { id, units, original, ...details } = hsscBiologySyllabus('AKU-EB', grade, 'Biology')!;
      const { subjectId } = await resolveAcademicMetadata(tx, 'AKU-EB', grade, 'Biology');
      const validFrom = new Date('2025-01-01T00:00:00Z');
      const preferred = await tx.syllabusVersion.findFirst({ where: {
        subjectId, id: { not: id }, isLatest: true,
        OR: [{ validFrom: { gt: validFrom } }, { validFrom, sourceDocumentId: { not: null } }],
      }, select: { id: true } });
      if (!preferred) {
        await tx.syllabusVersion.updateMany({ where: { subjectId, id: { not: id }, isLatest: true }, data: { isLatest: false } });
      }
      await tx.syllabusVersion.upsert({
        where: { id },
        update: { isLatest: !preferred, fileUrl: original },
        create: {
          id, subjectId, versionName: '2025 Biology HSSC', validFrom, isLatest: !preferred, fileUrl: original,
          topics: { create: units.map(unit => ({
            topicNumber: String(unit.unitNumber), name: unit.name,
            subtopics: { create: unit.subtopics.map(topic => ({
              subtopicNum: topic.subtopicNumber, name: topic.name,
              slos: { create: topic.slos.map((outcome, index) => ({
                ...outcome, sourceOrdinal: index + 1, isFormative: outcome.cognitiveLevel === 'FA',
              })) },
            })) },
          })) },
        },
      });
      await tx.examinationSpecification.upsert({
        where: { id },
        update: { details },
        create: { id, syllabusVersionId: id, details },
      });
      const stored = await tx.sLO.findMany({
        where: { subtopic: { topic: { syllabusVersionId: id } } },
        select: { code: true, description: true, sourcePage: true, cognitiveLevel: true, subtopic: { select: { subtopicNum: true } } },
      });
      const byCode = new Map(stored.map(row => [row.code, row]));
      let expected = 0;
      for (const unit of units) for (const topic of unit.subtopics) for (const outcome of topic.slos) {
        expected++;
        const row = byCode.get(outcome.code);
        if (row?.description !== outcome.description || row.sourcePage !== outcome.sourcePage ||
            row.cognitiveLevel !== outcome.cognitiveLevel || row.subtopic.subtopicNum !== topic.subtopicNumber) {
          throw new Error(`Class ${grade}: stored SLO ${outcome.code} differs from the reviewed source.`);
        }
      }
      if (stored.length !== expected) throw new Error(`Class ${grade}: expected ${expected} SLOs, found ${stored.length}.`);
      summaries.push(`Class ${grade}: ${units.length} chapters, ${expected} SLOs, and ${details.practicals.length} practical activities stored${preferred ? ' (existing latest edition retained)' : ''}.`);
    }
    return summaries;
  }, { timeout: 30000 });
  summaries.forEach(summary => console.log(summary));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
