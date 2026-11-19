import { hsscComputerScience2019Resources, hsscComputerScience2019Papers } from '@/lib/hsscComputerScience2019';
import { hsscComputerScience2021Resources, hsscComputerScience2021Papers } from '@/lib/hsscComputerScience2021';
import { hsscComputerScience2023Resources, hsscComputerScience2023Papers } from '@/lib/hsscComputerScience2023';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { hsscComputerScience2024Resources, hsscComputerScience2024Papers } from '@/lib/hsscComputerScience2024';
import { hsscComputerSciencePapers } from '@/lib/hsscComputerSciencePapers';
import type { Prisma } from '@prisma/client';
import { hsscComputerScienceResources } from '@/lib/hsscComputerScienceResources';
import { resolveAcademicMetadata } from '@/services/assessment/catalog';

async function main() {
  const annual2019 = process.argv.includes("--annual-2019");
  const annual2021 = process.argv.includes("--annual-2021");
  const annual2023 = process.argv.includes("--annual-2023");
  const annual = annual2019 || annual2021 || annual2023 || process.argv.includes("--annual-2024");
  const annualResources = annual2019 ? hsscComputerScience2019Resources : annual2021 ? hsscComputerScience2021Resources : annual2023 ? hsscComputerScience2023Resources : hsscComputerScience2024Resources;
  const annualPapers = annual2019 ? hsscComputerScience2019Papers : annual2021 ? hsscComputerScience2021Papers : annual2023 ? hsscComputerScience2023Papers : hsscComputerScience2024Papers;
  for (const grade of annual ? [11] : [11, 12]) {
    const resources = annual ? annualResources : hsscComputerScienceResources('akueb', grade, 'computer-science')!;
    for (const paper of resources.papers) {
      const bytes = await readFile(path.join(process.cwd(), 'public', paper.file));
      const sourceHash = createHash('sha256').update(bytes).digest('hex');
      await prisma.$transaction(async tx => {
        const academic = await resolveAcademicMetadata(tx, 'AKU-EB', grade, 'Computer Science');
        const version = await tx.syllabusVersion.findUnique({where: {id: `akueb-hssc-computer-science-2025-${grade}`}});
        if (!version || version.subjectId !== academic.subjectId) throw Error('Missing matching syllabus');
        const id = `akueb-hssc-computer-science-${grade}-${annual ? resources.year : "model"}-${paper.slug}`;
        const data = {
          title: `Computer Science Class ${resources.roman} ${annual ? resources.year : "Model"} ${paper.label}`,
          publisher: annual && paper.slug === 'marking' ? 'Project-authored' : 'AKU-EB', subject: 'Computer Science', className: `Class ${resources.roman}`,
          boardAssociation: 'AKU-EB', language: 'English', publicationYear: resources.year,
          sourceFile: paper.file, sourceHash,
          metadata: {resourceType: annual ? paper.slug === 'keys' ? 'answer_key' : paper.slug === 'marking' ? 'marking_guide' : paper.slug === 'emarking' ? 'e_marking' : 'past_paper' : paper.slug === 'practical' ? 'practical_paper' : 'model_paper',
            pageCount: paper.pages, marks: paper.marks, durationMinutes: paper.minutes,
            syllabusVersionId: version.id, websiteUrl: paper.href,
            digitizationStatus: paper.slug === 'practical' ? 'TYPED_WITH_PROJECT_SOLUTION' : 'REVIEWED_WITH_SOURCE_NOTES'},
        };
        await tx.book.upsert({where: {id}, create: {id, ...data}, update: data});
        const digital = (annual ? annualPapers : hsscComputerSciencePapers).find(item => item.academicClass.level === grade && item.fileUrl === paper.file);
        if (digital) {
          const paperData = {
            ...academic, paperCode: digital.paperCode, title: digital.title,
            examYear: resources.year, examType: annual ? 'ANNUAL' : 'MODEL_EXAM', examSession: annual ? 'Annual Examination' : 'Model Examination',
            fileUrl: paper.file, sourceFile: paper.file, sourceHash, pageCount: paper.pages,
            verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES',
          };
          await tx.pastPaper.upsert({where: {id: digital.id}, create: {id: digital.id, ...paperData}, update: paperData});
          const topics = await tx.topic.findMany({where: {syllabusVersionId: {in: annual ? ["akueb-hssc-computer-science-2025-11", "akueb-hssc-computer-science-2025-12"] : [version.id]}}, include: {subtopics: {include: {slos: true}}}});
          const outcomes = new Map(topics.flatMap(topic => topic.subtopics.flatMap(subtopic => subtopic.slos.map(slo => [slo.code, {syllabusVersionId: topic.syllabusVersionId, sloId: slo.id, subtopicId: subtopic.id, topicId: topic.id}] as const))));
          for (const question of digital.questions) {
            const linked = (question.slos ?? []).map(({slo}) => {
              const found = outcomes.get(slo.code!);
              if (!found) throw Error('Missing SLO '+slo.code);
              return found;
            });
            const row = {
              pastPaperId: digital.id, questionNumber: question.questionNumber, questionType: question.questionType,
              questionText: question.questionText, normalizedQuestionText: question.questionText.replace(/\s+/g, ' ').trim(),
              marks: question.marks, difficulty: question.difficulty, diagramBased: question.diagramBased,
              pageNumber: question.sourceRegion.pageNumber, sourceRegion: JSON.parse(JSON.stringify(question.sourceRegion)) as Prisma.InputJsonValue,
              syllabusVersionId: linked[0]?.syllabusVersionId ?? null, sloId: linked[0]?.sloId ?? null, subtopicId: linked[0]?.subtopicId ?? null, topicId: linked[0]?.topicId ?? null,
              verified: question.questionType !== 'MULTIPLE_CHOICE' || Boolean(question.sourceRegion.solved_correct_option),
            };
            await tx.pastPaperQuestion.upsert({where: {id: question.id}, create: {id: question.id, ...row}, update: row});
            await tx.pastPaperQuestionTopic.deleteMany({where: {pastPaperQuestionId: question.id}});
            await tx.pastPaperQuestionSubtopic.deleteMany({where: {pastPaperQuestionId: question.id}});
            await tx.pastPaperQuestionSLO.deleteMany({where: {pastPaperQuestionId: question.id}});
            await tx.pastPaperQuestionTopic.createMany({data: linked.map(o => ({pastPaperQuestionId: question.id, topicId: o.topicId})), skipDuplicates: true});
            await tx.pastPaperQuestionSubtopic.createMany({data: linked.map(o => ({pastPaperQuestionId: question.id, subtopicId: o.subtopicId})), skipDuplicates: true});
            await tx.pastPaperQuestionSLO.createMany({data: linked.map(o => ({pastPaperQuestionId: question.id, sloId: o.sloId})), skipDuplicates: true});
          }
        }

      }, {timeout: 60000});
      console.log(`Imported ${resources.roman} ${paper.label}`);
    }
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => prisma.$disconnect());
