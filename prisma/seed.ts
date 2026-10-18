import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. BOARD SYSTEM (DEMO Boards)
  const sindhBoard = await prisma.board.upsert({
    where: { shortCode: 'SINDH_DEMO' },
    update: {},
    create: {
      name: 'Sindh Board (DEMO)',
      shortCode: 'SINDH_DEMO',
      country: 'Pakistan',
      description: 'Demo board for testing',
    },
  });

  const cambridgeBoard = await prisma.board.upsert({
    where: { shortCode: 'CAMBRIDGE_DEMO' },
    update: {},
    create: {
      name: 'Cambridge Board (DEMO)',
      shortCode: 'CAMBRIDGE_DEMO',
      country: 'UK',
      description: 'Demo board for testing',
    },
  });

  const boardVersion = await prisma.boardVersion.create({
    data: {
      boardId: sindhBoard.id,
      versionName: '2025 Syllabus',
      validFrom: new Date('2025-01-01'),
    }
  });

  const curriculum = await prisma.boardCurriculum.create({
    data: {
      boardId: sindhBoard.id,
      boardVersionId: boardVersion.id,
      description: 'Main Curriculum Demo',
    }
  });

  // 2. ACADEMIC HIERARCHY
  const class10 = await prisma.class.create({
    data: {
      curriculumId: curriculum.id,
      name: 'Class 10',
      level: 10,
    }
  });

  const physics = await prisma.subject.create({
    data: {
      classId: class10.id,
      name: 'Physics',
      code: 'PHY101',
    }
  });

  const chapter1 = await prisma.chapter.create({
    data: {
      subjectId: physics.id,
      name: 'Kinematics',
      chapterNumber: 1,
    }
  });

  const topic1 = await prisma.topic.create({
    data: {
      chapterId: chapter1.id,
      name: 'Motion in One Dimension',
      topicNumber: '1.1',
    }
  });

  const concept1 = await prisma.concept.create({
    data: {
      topicId: topic1.id,
      name: 'Velocity and Acceleration',
      description: 'Understanding rates of change',
    }
  });

  const learningObj = await prisma.learningObjective.create({
    data: {
      conceptId: concept1.id,
      description: 'Calculate average velocity from distance and time.',
    }
  });

  // 3. PAST PAPER SYSTEM
  const pastPaper = await prisma.pastPaper.create({
    data: {
      boardId: sindhBoard.id,
      classId: class10.id,
      subjectId: physics.id,
      examYear: 2025,
      examSession: 'May/June',
      title: 'Physics Paper 1',
    }
  });

  const ppQuestion = await prisma.pastPaperQuestion.create({
    data: {
      pastPaperId: pastPaper.id,
      questionNumber: '3',
      subQuestionNumber: 'b',
      questionText: 'A car accelerates from rest to 20m/s in 5s. What is the acceleration?',
      normalizedQuestionText: 'car accelerates from rest to 20m/s in 5s what is acceleration',
      questionType: 'NUMERICAL',
      marks: 3,
      chapterId: chapter1.id,
      topicId: topic1.id,
      conceptId: concept1.id,
      learningObjectiveId: learningObj.id,
      concepts: {
        create: [
          { conceptId: concept1.id }
        ]
      }
    }
  });

  // 4. GENERATED QUESTION SYSTEM
  const question = await prisma.question.create({
    data: {
      questionType: 'MCQ_SINGLE',
      stemText: 'What is the acceleration of a body that changes velocity from 0 to 10 m/s in 2 seconds?',
      boardId: sindhBoard.id,
      curriculumRelevance: 0.95,
      boardStyleEvidence: 'Highly relevant based on past paper trends.',
      options: {
        create: [
          { text: '5 m/s^2', isCorrect: true, orderIndex: 1 },
          { text: '10 m/s^2', isCorrect: false, orderIndex: 2 },
          { text: '2 m/s^2', isCorrect: false, orderIndex: 3 },
          { text: '20 m/s^2', isCorrect: false, orderIndex: 4 },
        ]
      },
      pastPaperReferences: {
        create: [
          {
            pastPaperQuestionId: ppQuestion.id,
            relationshipType: 'SAME_NUMERICAL_METHOD',
            similarityScore: 0.88,
            numericalMethodMatch: true,
            rationale: 'Both questions require calculating acceleration using a = (v-u)/t',
          }
        ]
      },
      sources: {
        create: [
          {
            sourceType: 'TEXTBOOK',
            sourceId: 'dummy-book-id-123',
            evidenceText: 'Acceleration is the rate of change of velocity.',
          }
        ]
      },
      media: {
        create: [
          {
            mediaUrl: 'https://example.com/acceleration_graph.png',
            mediaType: 'GRAPH',
            caption: 'Velocity-Time Graph',
          }
        ]
      }
    }
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
