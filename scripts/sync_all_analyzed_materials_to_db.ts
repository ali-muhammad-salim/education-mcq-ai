import { indexSyllabusSLOs, embedKnowledge } from '../services/knowledge/search';
import { PrismaClient } from '@prisma/client';
import { getAllStandardPapers, getFallbackPaper } from '../lib/paperDataService';
import syl9 from '../data/physics/ssc1_exact_syllabus.json';
import syl10 from '../data/physics/ssc2_exact_syllabus.json';

const prisma = new PrismaClient();

async function syncSyllabusForClass(
  boardId: string,
  classId: string,
  level: 9 | 10,
  units: any[],
  fileUrl: string
) {
  let subject = await prisma.subject.findFirst({
    where: { classId, name: { equals: 'Physics', mode: 'insensitive' } },
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        classId,
        name: 'Physics',
        code: level === 9 ? 'PHY-IX' : 'PHY-X',
      },
    });
  }

  let version = await prisma.syllabusVersion.findFirst({
    where: { subjectId: subject.id, versionName: '2025' },
  });
  if (!version) {
    version = await prisma.syllabusVersion.create({
      data: {
        subjectId: subject.id,
        versionName: '2025',
        validFrom: new Date('2025-01-01T00:00:00Z'),
        isLatest: true,
        fileUrl,
      },
    });
  } else {
    version = await prisma.syllabusVersion.update({
      where: { id: version.id },
      data: { isLatest: true, fileUrl },
    });
  }

  const topicByNum = new Map<string, string>();
  const sloByCode = new Map<string, { id: string; subtopicId: string; topicId: string }>();

  for (const unit of units) {
    const tNum = String(unit.unitNumber);
    let topic = await prisma.topic.findFirst({
      where: { syllabusVersionId: version.id, topicNumber: tNum },
    });
    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          syllabusVersionId: version.id,
          name: unit.name,
          topicNumber: tNum,
        },
      });
    } else if (topic.name !== unit.name) {
      topic = await prisma.topic.update({
        where: { id: topic.id },
        data: { name: unit.name },
      });
    }
    topicByNum.set(tNum, topic.id);

    for (const sub of unit.subtopics || []) {
      const sNum = sub.subtopicNum || sub.subNumber || null;
      let subtopic = await prisma.subtopic.findFirst({
        where: { topicId: topic.id, name: sub.name },
      });
      if (!subtopic) {
        subtopic = await prisma.subtopic.create({
          data: {
            topicId: topic.id,
            name: sub.name,
            subtopicNum: sNum,
          },
        });
      } else if (sNum && subtopic.subtopicNum !== sNum) {
        subtopic = await prisma.subtopic.update({
          where: { id: subtopic.id },
          data: { subtopicNum: sNum },
        });
      }

      for (const slo of sub.slos || []) {
        const existingSlo = await prisma.sLO.findFirst({
          where: { subtopicId: subtopic.id, code: slo.code },
        });
        const record = existingSlo
          ? await prisma.sLO.update({
              where: { id: existingSlo.id },
              data: {
                description: slo.description,
                cognitiveLevel: slo.cognitiveLevel,
                isPractical: Boolean(slo.isPractical),
                sourcePage: unit.page || null,
              },
            })
          : await prisma.sLO.create({
              data: {
                subtopicId: subtopic.id,
                code: slo.code,
                description: slo.description,
                cognitiveLevel: slo.cognitiveLevel,
                isPractical: Boolean(slo.isPractical),
                sourcePage: unit.page || null,
              },
            });
        sloByCode.set(slo.code, {
          id: record.id,
          subtopicId: subtopic.id,
          topicId: topic.id,
        });
      }
    }
  }

  return { subject, version, topicByNum, sloByCode };
}

export async function syncAllAnalyzedMaterials() {
  console.log('Synchronizing AKU-EB board, syllabuses, past papers, model papers, and reference books...');

  const board = await prisma.board.upsert({
    where: { shortCode: 'AKU-EB' },
    update: {
      name: 'Aga Khan University Examination Board',
      country: 'Pakistan',
      status: 'ACTIVE',
    },
    create: {
      name: 'Aga Khan University Examination Board',
      shortCode: 'AKU-EB',
      country: 'Pakistan',
      description: 'Autonomous examination board providing SLO-based conceptual assessments and e-marking.',
      status: 'ACTIVE',
    },
  });

  let programme = await prisma.programme.findFirst({
    where: { boardId: board.id, name: 'SSC' },
  });
  if (!programme) {
    programme = await prisma.programme.create({
      data: {
        boardId: board.id,
        name: 'SSC',
        description: 'Secondary School Certificate (Grades IX & X)',
      },
    });
  }

  const classMap = new Map<number, string>();
  for (const [level, name] of [
    [9, 'Class IX'],
    [10, 'Class X'],
    [11, 'Class XI'],
    [12, 'Class XII'],
  ] as const) {
    let cls = await prisma.academicClass.findFirst({
      where: { programmeId: programme.id, level },
    });
    if (!cls) {
      cls = await prisma.academicClass.create({
        data: { programmeId: programme.id, level, name },
      });
    }
    classMap.set(level, cls.id);
  }

  const ixMeta = await syncSyllabusForClass(
    board.id,
    classMap.get(9)!,
    9,
    syl9 as any[],
    '/materials/ssc/physics/ssc-1/physics-ssc-full-syllabus-2025.pdf'
  );
  const xMeta = await syncSyllabusForClass(
    board.id,
    classMap.get(10)!,
    10,
    syl10 as any[],
    '/materials/ssc/physics/ssc-2/physics-ssc-full-syllabus-2025.pdf'
  );

  // Remove legacy 2024 Chapter 1-2 past-paper compilation (PHY-IX-CHAP1-2) if present in DB
  const obsoletePapers = await prisma.pastPaper.findMany({
    where: {
      OR: [
        { paperCode: 'PHY-IX-CHAP1-2' },
        { title: { contains: 'Chapters 1 & 2 Past Papers', mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  for (const obs of obsoletePapers) {
    const qIds = (
      await prisma.pastPaperQuestion.findMany({
        where: { pastPaperId: obs.id },
        select: { id: true },
      })
    ).map((q) => q.id);
    if (qIds.length) {
      await prisma.pastPaperQuestionTopic.deleteMany({ where: { pastPaperQuestionId: { in: qIds } } });
      await prisma.pastPaperQuestionSubtopic.deleteMany({ where: { pastPaperQuestionId: { in: qIds } } });
      await prisma.pastPaperQuestionSLO.deleteMany({ where: { pastPaperQuestionId: { in: qIds } } });
      await prisma.pastPaperQuestion.deleteMany({ where: { id: { in: qIds } } });
    }
    await prisma.pastPaper.delete({ where: { id: obs.id } });
  }

  // Sync all standard Model Papers & Past Papers (including 2024 & 2025 Annual Papers I & II) and their questions
  const papers = getAllStandardPapers();
  for (const summary of papers) {
    const full = getFallbackPaper(summary.paperCode);
    if (!full) continue;
    const level = full.academicClass.level === 10 ? 10 : 9;
    const meta = level === 10 ? xMeta : ixMeta;
    const classId = classMap.get(level)!;

    let paper = await prisma.pastPaper.findFirst({
      where: {
        boardId: board.id,
        classId,
        subjectId: meta.subject.id,
        paperCode: full.paperCode,
      },
    });

    if (!paper) {
      paper = await prisma.pastPaper.create({
        data: {
          boardId: board.id,
          classId,
          subjectId: meta.subject.id,
          examYear: full.examYear,
          examSession: full.examSession || 'Annual Examination',
          examType: full.examType || 'ANNUAL',
          paperCode: full.paperCode,
          fileUrl: full.fileUrl || null,
          title: full.title,
          verificationStatus: 'VERIFIED',
        },
      });
    } else {
      paper = await prisma.pastPaper.update({
        where: { id: paper.id },
        data: {
          examYear: full.examYear,
          examSession: full.examSession || paper.examSession,
          examType: full.examType || paper.examType,
          fileUrl: full.fileUrl || paper.fileUrl,
          title: full.title,
          verificationStatus: 'VERIFIED',
        },
      });
    }

    for (const q of full.questions) {
      const qNum = String(q.questionNumber);
      const sloCode = q.sourceRegion?.current_slo || q.slos?.[0]?.slo?.code || q.sourceRegion?.slo;
      const sloEntry = sloCode ? meta.sloByCode.get(sloCode) : undefined;
      const tNum = q.topics?.[0]?.topic?.topicNumber;
      const topicId = sloEntry?.topicId || (tNum ? meta.topicByNum.get(String(tNum)) : undefined) || null;
      const subtopicId = sloEntry?.subtopicId || null;
      const sloId = sloEntry?.id || null;

      let existingQ = await prisma.pastPaperQuestion.findFirst({
        where: { pastPaperId: paper.id, questionNumber: qNum },
      });

      const qPayload = {
        questionText: q.questionText,
        normalizedQuestionText: q.questionText.toLowerCase().replace(/\s+/g, ' ').trim(),
        questionType: q.questionType,
        marks: q.marks,
        pageNumber: q.sourceRegion?.pageNumber || null,
        sourceRegion: q.sourceRegion as any,
        syllabusVersionId: meta.version.id,
        topicId,
        subtopicId,
        sloId,
        difficulty: q.difficulty || 'U',
        diagramBased: Boolean(q.diagramBased),
        verified: true,
      };

      if (!existingQ) {
        existingQ = await prisma.pastPaperQuestion.create({
          data: {
            pastPaperId: paper.id,
            questionNumber: qNum,
            ...qPayload,
          },
        });
      } else {
        existingQ = await prisma.pastPaperQuestion.update({
          where: { id: existingQ.id },
          data: qPayload,
        });
      }

      if (topicId) {
        await prisma.pastPaperQuestionTopic.upsert({
          where: { pastPaperQuestionId_topicId: { pastPaperQuestionId: existingQ.id, topicId } },
          update: {},
          create: { pastPaperQuestionId: existingQ.id, topicId },
        });
      }
      if (subtopicId) {
        await prisma.pastPaperQuestionSubtopic.upsert({
          where: { pastPaperQuestionId_subtopicId: { pastPaperQuestionId: existingQ.id, subtopicId } },
          update: {},
          create: { pastPaperQuestionId: existingQ.id, subtopicId },
        });
      }
      if (sloId) {
        await prisma.pastPaperQuestionSLO.upsert({
          where: { pastPaperQuestionId_sloId: { pastPaperQuestionId: existingQ.id, sloId } },
          update: {},
          create: { pastPaperQuestionId: existingQ.id, sloId },
        });
      }
    }
  }

  // Sync official Books & Guides catalog records (and BookContent passages for semantic pgvector indexing)
  const books = [
    {
      title: 'Physics SSC-I Syllabus 2025 (Grade IX Dedicated)',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf',
    },
    {
      title: 'Physics SSC-II Syllabus 2025 (Grade X Dedicated)',
      className: 'Class X',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf',
    },
    {
      title: 'Physics Grade IX Pacing Guide for Teachers (2025)',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'AKU-EB Teacher Developer Team',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf',
    },
    {
      title: 'Physics Grade X Pacing Guide for Teachers (2025)',
      className: 'Class X',
      subject: 'Physics',
      publisher: 'AKU-EB Teacher Developer Team',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf',
    },
    {
      title: 'Resource Guide SSC Physics 2025 (Grade IX Dedicated)',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-i-physics-dedicated.pdf',
    },
    {
      title: 'Resource Guide SSC Physics 2025 (Grade X Dedicated)',
      className: 'Class X',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-2/resources-guide-2025-ssc-ii-physics-dedicated.pdf',
    },
    {
      title: 'Notes from E-Marking Centre on SSC-I Physics Annual Examinations 2025',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-1/physics-ix-2025-emarking.pdf',
    },
    {
      title: 'Notes from E-Marking Centre on SSC-I Physics Annual Examinations 2024',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2024,
      sourceFile: '/materials/ssc/physics/ssc-1/physics-ix-2024-emarking.pdf',
    },
    {
      title: 'Physics SSC-I Sample Practical Paper III (Model Examination 2026)',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2026,
      sourceFile: '/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf',
    },
    {
      title: 'Physics SSC-I 2024 Annual Examination Papers I & II and Official Answer Key',
      className: 'Class IX',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2024,
      sourceFile: '/materials/ssc/physics/ssc-1/physics-ix-2024-paper-i.pdf',
    },
    {
      title: 'Notes from E-Marking Centre on SSC-II Physics Annual Examinations 2025',
      className: 'Class X',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-2/physics-x-2025-emarking.pdf',
    },
    {
      title: 'Physics SSC-II 2025 Annual Examination Papers I & II and Official Answer Key',
      className: 'Class X',
      subject: 'Physics',
      publisher: 'Aga Khan University Examination Board',
      publicationYear: 2025,
      sourceFile: '/materials/ssc/physics/ssc-2/physics-x-2025-paper-i.pdf',
    },
  ];

  let book2024Id: string | null = null;
  let bookX2025Id: string | null = null;
  for (const b of books) {
    let existingBook = await prisma.book.findFirst({ where: { title: b.title } });
    if (!existingBook) {
      existingBook = await prisma.book.create({
        data: {
          ...b,
          boardAssociation: 'AKU-EB',
          language: 'English',
        },
      });
    }
    if (b.title.includes('SSC-I 2024 Annual Examination Papers I & II')) {
      book2024Id = existingBook.id;
    }
    if (b.title.includes('SSC-II 2025 Annual Examination Papers I & II')) {
      bookX2025Id = existingBook.id;
    }
  }

  // Sync all 2024 SSC-I & 2025 SSC-II Paper I & Paper II questions into BookContent so they receive 768-dim pgvector embeddings
  for (const pCode of ['PHY-IX-2024-P1', 'PHY-IX-2024-P2', 'PHY-X-2025-P1', 'PHY-X-2025-P2']) {
    const targetBookId = pCode.startsWith('PHY-X') ? bookX2025Id : book2024Id;
    const pData = getFallbackPaper(pCode);
    if (targetBookId && pData) {
      for (const q of pData.questions) {
        const sectionTag = `${pCode}-Q${q.questionNumber}`;
        const choicesStr = Object.entries(q.sourceRegion?.choices || {})
          .map(([k, v]) => `${k}. ${v}`)
          .join(' | ');
        const mappedSlo = q.sourceRegion?.current_slo || q.sourceRegion?.slo || '';
        const contentText = `${pData.title} Q${q.questionNumber} (Original SLO ${q.sourceRegion?.slo || ''}, 2025 SLO ${mappedSlo}): ${q.questionText}\n${choicesStr ? `Options: ${choicesStr}\nAnswer: ${q.sourceRegion?.correct_answer || ''}` : `Model Answer: ${q.sourceRegion?.model_answer || ''}`}\nExplanation: ${q.sourceRegion?.explanation || q.sourceRegion?.better_response || ''}`;
        const existingContent = await prisma.bookContent.findFirst({
          where: { bookId: targetBookId, section: sectionTag },
        });
        if (!existingContent) {
          await prisma.bookContent.create({
            data: {
              bookId: targetBookId,
              section: sectionTag,
              pageNumber: q.sourceRegion?.pageNumber || 1,
              content: contentText,
            },
          });
        }
      }
    }
  }

  if (process.env.GEMINI_EMBEDDING_MODEL) {
    try {
      const embRes = await indexSyllabusSLOs(undefined, 400);
      console.log(`Indexed ${embRes.indexed} SLO embeddings in PostgreSQL (pgvector).`);

      // Also index any un-embedded BookContent rows (including the 49 2024 Paper I & II questions)
      const unembeddedContents = await prisma.$queryRaw<{ id: string; content: string }[]>`
        SELECT id, content FROM "BookContent" WHERE embedding IS NULL LIMIT 250
      `;
      let qEmbCount = 0;
      for (const row of unembeddedContents) {
        const emb = await embedKnowledge(row.content, 'RETRIEVAL_DOCUMENT');
        await prisma.$executeRaw`UPDATE "BookContent" SET embedding = ${JSON.stringify(emb.vector)}::vector WHERE id = ${row.id}`;
        qEmbCount++;
      }
      if (qEmbCount > 0) {
        console.log(`Indexed ${qEmbCount} question/passage embeddings in BookContent (pgvector).`);
      }
    } catch (embErr) {
      console.warn('SLO/Question embedding indexing deferred:', embErr);
    }
  }
  console.log('Successfully synchronized all AKU-EB syllabuses, 337 SLOs, 10 papers (including 2024 SSC-I & 2025 SSC-II Papers I & II), and 12 official resource records to PostgreSQL.');
}

if (require.main === module) {
  syncAllAnalyzedMaterials()
    .catch((err) => {
      console.error('Failed to sync materials to DB:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
