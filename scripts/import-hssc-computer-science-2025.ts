import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { hsscXiAnnualComputerSciencePapers, computerScienceXi2025Resources } from '@/lib/hsscXiAnnualComputerScience';
import type { Prisma } from '@prisma/client';
import { resolveAcademicMetadata } from '@/services/assessment/catalog';

async function main() {
  const grade = 11;
  console.log(`Starting import for Computer Science XI Annual 2025...`);

  await prisma.$transaction(async tx => {
    const academic = await resolveAcademicMetadata(tx, 'AKU-EB', grade, 'Computer Science');
    const version11 = await tx.syllabusVersion.findUnique({ where: { id: `akueb-hssc-computer-science-2025-11` } });
    if (!version11 || version11.subjectId !== academic.subjectId) {
      throw Error('Missing matching syllabus version: akueb-hssc-computer-science-2025-11');
    }

    // Books / materials
    const bookItems = [
      { slug: 'paper-i', label: 'Paper 1', file: 'materials/hssc/computer-science/computer-science-xi-2025-paper-i.pdf', type: 'past_paper', pages: 12, marks: 50, mins: 90, href: '/past-papers/CS-XI-2025-P1' },
      { slug: 'keys', label: 'Paper 1 keys', file: 'materials/hssc/computer-science/computer-science-xi-2025-key.pdf', type: 'answer_key', pages: 2, marks: 50, mins: 90, href: '/materials/hssc/computer-science/computer-science-xi-2025-key.pdf' },
      { slug: 'paper-ii', label: 'Paper 2', file: 'materials/hssc/computer-science/computer-science-xi-2025-paper-ii.pdf', type: 'past_paper', pages: 8, marks: 35, mins: 90, href: '/past-papers/CS-XI-2025-P2' },
    ];

    for (const item of bookItems) {
      const bytes = await readFile(path.join(process.cwd(), 'public', item.file));
      const sourceHash = createHash('sha256').update(bytes).digest('hex');
      const bookId = `akueb-hssc-computer-science-11-2025-${item.slug}`;
      const data = {
        title: `Computer Science Class XI 2025 ${item.label}`,
        publisher: 'AKU-EB',
        subject: 'Computer Science',
        className: 'Class XI',
        boardAssociation: 'AKU-EB',
        language: 'English',
        publicationYear: 2025,
        sourceFile: '/' + item.file,
        sourceHash,
        metadata: {
          resourceType: item.type,
          pageCount: item.pages,
          marks: item.marks,
          durationMinutes: item.mins,
          syllabusVersionId: version11.id,
          websiteUrl: item.href,
          digitizationStatus: 'REVIEWED_WITH_SOURCE_NOTES',
        },
      };
      await tx.book.upsert({
        where: { id: bookId },
        create: { id: bookId, ...data },
        update: data,
      });
      console.log(`Upserted book ${bookId}`);
    }

    // Outcomes across Class XI and Class XII (to accommodate migrated Database topics)
    const topics = await tx.topic.findMany({
      where: {
        syllabusVersionId: { in: ['akueb-hssc-computer-science-2025-11', 'akueb-hssc-computer-science-2025-12'] },
      },
      include: { subtopics: { include: { slos: true } } },
    });
    const outcomes = new Map(
      topics.flatMap(topic =>
        topic.subtopics.flatMap(subtopic =>
          subtopic.slos.map(slo => [
            slo.code,
            { syllabusVersionId: topic.syllabusVersionId, sloId: slo.id, subtopicId: subtopic.id, topicId: topic.id },
          ] as const)
        )
      )
    );

    // Papers & Questions
    for (const digital of hsscXiAnnualComputerSciencePapers) {
      const bytes = await readFile(path.join(process.cwd(), 'public', digital.fileUrl!.replace(/^\//, '')));
      const sourceHash = createHash('sha256').update(bytes).digest('hex');

      const paperData = {
        ...academic,
        paperCode: digital.paperCode,
        title: digital.title,
        examYear: digital.examYear,
        examType: 'ANNUAL' as const,
        examSession: 'Annual Examination',
        fileUrl: digital.fileUrl,
        sourceFile: digital.fileUrl,
        sourceHash,
        pageCount: digital.paperCode.endsWith('-P1') ? 12 : 8,
        verificationStatus: 'REVIEWED_WITH_SOURCE_NOTES',
      };
      await tx.pastPaper.upsert({
        where: { id: digital.id },
        create: { id: digital.id, ...paperData },
        update: paperData,
      });

      for (const question of digital.questions) {
        const linked = (question.slos ?? []).map(({ slo }) => {
          const found = outcomes.get(slo.code!);
          if (!found) throw Error('Missing SLO ' + slo.code);
          return found;
        });

        const row = {
          pastPaperId: digital.id,
          questionNumber: String(question.questionNumber),
          questionType: question.questionType,
          questionText: question.questionText,
          normalizedQuestionText: question.questionText.replace(/\s+/g, ' ').trim(),
          marks: question.marks,
          difficulty: question.difficulty,
          diagramBased: question.diagramBased,
          pageNumber: question.sourceRegion.pageNumber,
          sourceRegion: JSON.parse(JSON.stringify(question.sourceRegion)) as Prisma.InputJsonValue,
          syllabusVersionId: linked[0]?.syllabusVersionId ?? null,
          sloId: linked[0]?.sloId ?? null,
          subtopicId: linked[0]?.subtopicId ?? null,
          topicId: linked[0]?.topicId ?? null,
          verified: question.questionType !== 'MULTIPLE_CHOICE' || Boolean(question.sourceRegion.solved_correct_option),
        };

        await tx.pastPaperQuestion.upsert({
          where: { id: question.id },
          create: { id: question.id, ...row },
          update: row,
        });

        await tx.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: question.id } });
        await tx.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: question.id } });
        await tx.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: question.id } });

        if (linked.length > 0) {
          await tx.pastPaperQuestionTopic.createMany({
            data: linked.map(o => ({ pastPaperQuestionId: question.id, topicId: o.topicId })),
            skipDuplicates: true,
          });
          await tx.pastPaperQuestionSubtopic.createMany({
            data: linked.map(o => ({ pastPaperQuestionId: question.id, subtopicId: o.subtopicId })),
            skipDuplicates: true,
          });
          await tx.pastPaperQuestionSLO.createMany({
            data: linked.map(o => ({ pastPaperQuestionId: question.id, sloId: o.sloId })),
            skipDuplicates: true,
          });
        }
      }
      console.log(`Successfully imported ${digital.id} with ${digital.questions.length} questions`);
    }
  }, { timeout: 60000 });
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
