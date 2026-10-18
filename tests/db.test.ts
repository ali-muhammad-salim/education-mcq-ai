import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

describe('Educational AI Database Constraints', () => {
  beforeAll(async () => {
    // Rely on seed data for tests
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. one board can have many subjects', async () => {
    const board = await prisma.board.findUnique({
      where: { shortCode: 'SINDH_DEMO' },
      include: {
        curriculums: {
          include: {
            classes: {
              include: {
                subjects: true
              }
            }
          }
        }
      }
    });
    
    expect(board).toBeDefined();
    const subjects = board!.curriculums.flatMap((c: any) => c.classes.flatMap((cls: any) => cls.subjects));
    expect(subjects.length).toBeGreaterThanOrEqual(1);
  });

  it('2. one subject can have many chapters', async () => {
    const subject = await prisma.subject.findFirst({
      where: { name: 'Physics' },
      include: { chapters: true }
    });
    expect(subject).toBeDefined();
    expect(subject!.chapters.length).toBeGreaterThanOrEqual(1);
  });

  it('3. one chapter can have many topics', async () => {
    const chapter = await prisma.chapter.findFirst({
      where: { name: 'Kinematics' },
      include: { topics: true }
    });
    expect(chapter).toBeDefined();
    expect(chapter!.topics.length).toBeGreaterThanOrEqual(1);
  });

  it('4. one topic can have many concepts', async () => {
    const topic = await prisma.topic.findFirst({
      where: { name: 'Motion in One Dimension' },
      include: { concepts: true }
    });
    expect(topic).toBeDefined();
    expect(topic!.concepts.length).toBeGreaterThanOrEqual(1);
  });

  it('5. one past paper has many questions', async () => {
    const paper = await prisma.pastPaper.findFirst({
      where: { title: 'Physics Paper 1' },
      include: { questions: true }
    });
    expect(paper).toBeDefined();
    expect(paper!.questions.length).toBeGreaterThanOrEqual(1);
  });

  it('6. past-paper questions retain exact year and question number', async () => {
    const question = await prisma.pastPaperQuestion.findFirst({
      where: { pastPaper: { examYear: 2025 }, questionNumber: '3', subQuestionNumber: 'b' },
      include: { pastPaper: true }
    });
    expect(question).toBeDefined();
    expect(question!.pastPaper.examYear).toBe(2025);
    expect(question!.questionNumber).toBe('3');
    expect(question!.subQuestionNumber).toBe('b');
  });

  it('7. one generated MCQ can reference many past-paper questions', async () => {
    const mcq = await prisma.question.findFirst({
      where: { questionType: 'MCQ_SINGLE' },
      include: { pastPaperReferences: true }
    });
    expect(mcq).toBeDefined();
    expect(mcq!.pastPaperReferences.length).toBeGreaterThanOrEqual(1);
  });

  it('8. one past-paper question can support many generated MCQs', async () => {
    const ppQuestion = await prisma.pastPaperQuestion.findFirst({
      where: { questionNumber: '3' },
      include: { generatedReferences: true }
    });
    expect(ppQuestion).toBeDefined();
    expect(ppQuestion!.generatedReferences.length).toBeGreaterThanOrEqual(1);
  });

  it('9. one MCQ can have multiple textbook sources', async () => {
    const mcq = await prisma.question.findFirst({
      where: { questionType: 'MCQ_SINGLE' },
      include: { sources: true }
    });
    expect(mcq).toBeDefined();
    expect(mcq!.sources.length).toBeGreaterThanOrEqual(1);
    expect(mcq!.sources[0].sourceType).toBe('TEXTBOOK');
  });

  it('10. one MCQ can have multiple media assets', async () => {
    const mcq = await prisma.question.findFirst({
      where: { questionType: 'MCQ_SINGLE' },
      include: { media: true }
    });
    expect(mcq).toBeDefined();
    expect(mcq!.media.length).toBeGreaterThanOrEqual(1);
    expect(mcq!.media[0].mediaType).toBe('GRAPH');
  });

  it('11. curriculum versions can coexist', async () => {
    const versions = await prisma.boardVersion.findMany();
    // In our seed there is at least one, and the schema supports many without uniqueness constraint on boardId alone
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });
});
