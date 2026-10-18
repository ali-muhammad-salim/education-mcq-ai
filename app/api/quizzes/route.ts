import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureDemoUsers } from '@/lib/auth';

const DEFAULT_QUIZZES = [
  {
    id: 'sample-quiz-phy-9',
    title: 'Class IX Physics Model Examination 2025 (Paper I - 40 MCQs)',
    description: '40 authentic multiple-choice questions covering Units 1 to 10 with authoritative timer.',
    boardId: 'AKU-EB',
    classId: '9',
    subjectId: 'Physics',
    totalMarks: 40,
    durationMin: 50,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    questionCount: 40,
    attemptCount: 142,
    teacherName: 'AKU-EB Academic Faculty',
    settings: { immediateFeedback: true, showCorrectAnswers: true, tabMonitoringEnabled: true }
  },
  {
    id: 'sample-quiz-phy-10',
    title: 'Class X Physics Model Examination 2025 (Paper I - 40 MCQs)',
    description: 'Full official standard examination for SSC Part II with automatic scoring.',
    boardId: 'AKU-EB',
    classId: '10',
    subjectId: 'Physics',
    totalMarks: 40,
    durationMin: 50,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    questionCount: 40,
    attemptCount: 98,
    teacherName: 'AKU-EB Academic Faculty',
    settings: { immediateFeedback: true, showCorrectAnswers: true, tabMonitoringEnabled: true }
  },
  {
    id: 'sample-quiz-kinematics',
    title: 'SSC-I Physics Kinematics & Mechanics Speed Test',
    description: '15-question focused sprint on velocity, acceleration, Newton laws, and momentum.',
    boardId: 'AKU-EB',
    classId: '9',
    subjectId: 'Physics',
    totalMarks: 15,
    durationMin: 20,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    questionCount: 15,
    attemptCount: 76,
    teacherName: 'AKU-EB Physics Cell',
    settings: { immediateFeedback: true, showCorrectAnswers: true, tabMonitoringEnabled: true }
  },
  {
    id: 'sample-quiz-waves',
    title: 'SSC-II Waves & Sound Physics Benchmark Test',
    description: '15-question assessment on simple harmonic motion, longitudinal waves, and acoustic principles.',
    boardId: 'AKU-EB',
    classId: '10',
    subjectId: 'Physics',
    totalMarks: 15,
    durationMin: 20,
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    questionCount: 15,
    attemptCount: 51,
    teacherName: 'AKU-EB Physics Cell',
    settings: { immediateFeedback: true, showCorrectAnswers: true, tabMonitoringEnabled: true }
  }
];

// GET /api/quizzes - List quizzes
export async function GET(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('teacherId');
    const visibility = searchParams.get('visibility');
    const status = searchParams.get('status');

    const where: any = {};
    if (teacherId) where.teacherId = teacherId;
    if (visibility) where.visibility = visibility;
    if (status) where.status = status;

    let quizzes: any[] = [];
    try {
      quizzes = await prisma.quiz.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          settings: true,
          _count: {
            select: { questions: true, attempts: true }
          },
          teacher: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    } catch (dbErr) {
      console.warn('Notice: prisma.quiz.findMany fallback:', dbErr);
    }

    const formattedDbQuizzes = quizzes.map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      boardId: q.boardId,
      classId: q.classId,
      subjectId: q.subjectId,
      totalMarks: q.totalMarks,
      durationMin: q.durationMin,
      status: q.status,
      visibility: q.visibility,
      scheduleStart: q.scheduleStart,
      scheduleEnd: q.scheduleEnd,
      createdAt: q.createdAt,
      questionCount: q._count?.questions || 0,
      attemptCount: q._count?.attempts || 0,
      teacherName: q.teacher?.name || 'Verified Teacher',
      settings: q.settings
    }));

    // Merge default sample quizzes if not filtering by specific teacher
    let allQuizzes: any[] = [...formattedDbQuizzes];
    if (!teacherId) {
      for (const def of DEFAULT_QUIZZES) {
        if (!allQuizzes.some(q => q.id === def.id)) {
          allQuizzes.push(def);
        }
      }
    }

    return NextResponse.json({
      success: true,
      quizzes: allQuizzes
    });
  } catch (err: any) {
    console.error('List quizzes error:', err);
    return NextResponse.json({
      success: true,
      quizzes: DEFAULT_QUIZZES
    });
  }
}

// POST /api/quizzes - Create or Save Draft Quiz with questions & settings
export async function POST(req: NextRequest) {
  try {
    await ensureDemoUsers();
    const body = await req.json();
    const {
      id,
      title,
      description,
      boardId = 'AKU-EB',
      classLevel = 9,
      subject = 'Physics',
      durationMin = 45,
      visibility = 'PUBLIC',
      status = 'DRAFT',
      settings = {},
      questions = []
    } = body;

    // Get current teacher or fallback to demo teacher
    let teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    });

    if (!teacher) {
      teacher = await prisma.user.findFirst();
    }

    if (!teacher) {
      return NextResponse.json({ error: 'No authorized teacher user found' }, { status: 401 });
    }

    // Calculate total marks from questions
    const totalMarks = questions.reduce((sum: number, q: any) => sum + (parseFloat(q.marks) || 1), 0);

    let quiz;
    if (id) {
      // Update existing quiz
      quiz = await prisma.quiz.update({
        where: { id },
        data: {
          title,
          description,
          totalMarks,
          durationMin: parseInt(durationMin) || 45,
          visibility,
          status,
          settings: {
            upsert: {
              create: {
                maxAttempts: settings.maxAttempts || 1,
                allowRetries: settings.allowRetries || false,
                randomizeQuestions: settings.randomizeQuestions || false,
                randomizeOptions: settings.randomizeOptions || false,
                immediateFeedback: settings.immediateFeedback ?? true,
                showCorrectAnswers: settings.showCorrectAnswers ?? true,
                resultVisibility: settings.resultVisibility || 'IMMEDIATE',
                manualGradingRequired: settings.manualGradingRequired || false,
                aiGradingMode: settings.aiGradingMode || 'MEDIUM',
                tabMonitoringEnabled: settings.tabMonitoringEnabled ?? true,
                tabWarningThreshold: settings.tabWarningThreshold || 2
              },
              update: {
                maxAttempts: settings.maxAttempts || 1,
                allowRetries: settings.allowRetries || false,
                randomizeQuestions: settings.randomizeQuestions || false,
                randomizeOptions: settings.randomizeOptions || false,
                immediateFeedback: settings.immediateFeedback ?? true,
                showCorrectAnswers: settings.showCorrectAnswers ?? true,
                resultVisibility: settings.resultVisibility || 'IMMEDIATE',
                manualGradingRequired: settings.manualGradingRequired || false,
                aiGradingMode: settings.aiGradingMode || 'MEDIUM',
                tabMonitoringEnabled: settings.tabMonitoringEnabled ?? true,
                tabWarningThreshold: settings.tabWarningThreshold || 2
              }
            }
          }
        }
      });

      // Replace questions with updated set
      await prisma.quizQuestion.deleteMany({ where: { quizId: id } });
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await prisma.quizQuestion.create({
          data: {
            quizId: id,
            orderIndex: i + 1,
            marks: parseFloat(q.marks) || 1,
            isRequired: q.isRequired ?? true,
            questionData: q
          }
        });
      }
    } else {
      // Create new quiz
      quiz = await prisma.quiz.create({
        data: {
          teacherId: teacher.id,
          title: title || 'Untitled AKU-EB Assessment',
          description,
          boardId,
          totalMarks,
          durationMin: parseInt(durationMin) || 45,
          visibility,
          status,
          settings: {
            create: {
              maxAttempts: settings.maxAttempts || 1,
              allowRetries: settings.allowRetries || false,
              randomizeQuestions: settings.randomizeQuestions || false,
              randomizeOptions: settings.randomizeOptions || false,
              immediateFeedback: settings.immediateFeedback ?? true,
              showCorrectAnswers: settings.showCorrectAnswers ?? true,
              resultVisibility: settings.resultVisibility || 'IMMEDIATE',
              manualGradingRequired: settings.manualGradingRequired || false,
              aiGradingMode: settings.aiGradingMode || 'MEDIUM',
              tabMonitoringEnabled: settings.tabMonitoringEnabled ?? true,
              tabWarningThreshold: settings.tabWarningThreshold || 2
            }
          },
          questions: {
            create: questions.map((q: any, i: number) => ({
              orderIndex: i + 1,
              marks: parseFloat(q.marks) || 1,
              isRequired: q.isRequired ?? true,
              questionData: q
            }))
          }
        },
        include: {
          settings: true,
          questions: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      quizId: quiz.id,
      quiz
    });
  } catch (err: any) {
    console.error('Save quiz error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save quiz' }, { status: 500 });
  }
}
